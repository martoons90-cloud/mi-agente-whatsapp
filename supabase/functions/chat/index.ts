// supabase/functions/chat/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// --- ¡NUEVO! Helper para reintentos con backoff exponencial ---
async function fetchWithRetry(url, options, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);

      // Si el código de estado ya es 503, lanzamos el error para reintentar.
      if (response.status === 503) {
        throw new Error('Service Unavailable');
      }

      // Si la respuesta es OK (200), la clonamos para poder leerla dos veces (una aquí y otra fuera)
      if (response.ok) {
        const responseClone = response.clone();
        const data = await responseClone.json();
        // ¡CAMBIO CLAVE! Verificamos si el *contenido* de la respuesta es un error de sobrecarga.
        if (data.error && data.error.status === 'UNAVAILABLE') {
          throw new Error('Service Unavailable');
        }
        return response; // Si no hay error en el contenido, devolvemos la respuesta original.
      }
      throw new Error(`API Error: ${response.status} ${await response.text()}`);
    } catch (error) {
      if (error.message === 'Service Unavailable' && i < retries - 1) {
        console.log(`Intento ${i + 1} falló (503). Reintentando en ${delay / 1000}s...`);
        await new Promise(res => setTimeout(res, delay));
        delay *= 2; // Duplicamos el retraso para el siguiente intento
      } else {
        throw error; // Lanzamos el error final si se acaban los reintentos o es otro tipo de error
      }
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Ahora recibimos el client_id junto con la pregunta
    const { query, history = [], clientId } = await req.json();

    if (!query) {
      throw new Error('Falta la pregunta (query) en la petición.')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // --- NUEVO: Obtener la API Key de Gemini específica para este cliente ---
    if (!clientId) {
      throw new Error('Falta el ID del cliente (clientId) en la petición.');
    }
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select('gemini_api_key')
      .eq('id', clientId)
      .single();
    if (clientError || !clientData) throw new Error(`Cliente no encontrado o error: ${clientError?.message}`);
    const googleApiKey = clientData.gemini_api_key;

    // --- NUEVO PASO: Clasificar la intención del usuario ---
    const historyForIntent = history.map(msg => `${msg.from === 'bot' ? 'Ferre' : 'Cliente'}: ${msg.text}`).slice(-4).join('\n');
    const intentPrompt = `
      Clasifica la "Última pregunta" del cliente en una de estas tres categorías: "PRODUCT_QUERY" (si pregunta por herramientas, tareas, o productos), "BUSINESS_QUERY" (si pregunta por dirección, horarios, pagos, ofertas, o sobre el negocio en general), o "GREETING" (si es solo un saludo o una conversación casual).

      Historial:
      ${historyForIntent}

      Última pregunta: "${query}"

      Categoría:
    `;
    const intentResponse = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${googleApiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: intentPrompt }] }] }) });
    const intentData = await intentResponse.json();
    // --- NUEVO: Manejo de errores para la respuesta de la intención ---
    if (!intentData.candidates || intentData.candidates.length === 0 || !intentData.candidates[0].content || !intentData.candidates[0].content.parts || intentData.candidates[0].content.parts.length === 0) {
      console.error('Error: Respuesta inesperada de la API de Gemini para la intención:', JSON.stringify(intentData, null, 2));
      throw new Error('Respuesta inesperada de la API de Gemini al clasificar la intención.');
    }
    const intent = intentData.candidates[0].content.parts[0].text.trim(); // Esta línea ahora es segura
    console.log(`Intención detectada: "${intent}"`);

    let products = []; // Inicializamos la lista de productos

    // --- Solo buscamos productos si la intención es sobre productos ---
    if (intent.includes('PRODUCT_QUERY')) {
      console.log("Ejecutando búsqueda de productos...");

    // --- PASO 1: Generar una consulta de búsqueda optimizada ---
    // Le pedimos a la IA que resuma la intención del usuario en una frase corta para buscar en la base de datos.
    const historyForSearch = history.map(msg => `${msg.from === 'bot' ? 'Ferre' : 'Cliente'}: ${msg.text}`).slice(-4).join('\n');
    const searchPrompt = `
      Basado en el siguiente historial de conversación y la última pregunta del cliente, genera una frase corta y concisa (3 a 5 palabras) que resuma el producto o la tarea principal que el cliente necesita. Esta frase se usará para buscar en una base de datos de productos.
      Ejemplos:
      - Cliente: "necesito romper una pared" -> "herramienta para demolición pesada"
      - Cliente: "y un martillo?" -> "martillo para romper"
      - Cliente: "tienes para clavar?" -> "herramienta para clavar clavos"

      Historial:
      ${historyForSearch}

      Última pregunta: "${query}"

      Frase de búsqueda optimizada:
    `;
    const optimizedQueryResponse = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${googleApiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: searchPrompt }] }] }) });
    const optimizedQueryData = await optimizedQueryResponse.json();
    // --- NUEVO: Manejo de errores para la respuesta de la consulta optimizada ---
    if (!optimizedQueryData.candidates || optimizedQueryData.candidates.length === 0 || !optimizedQueryData.candidates[0].content || !optimizedQueryData.candidates[0].content.parts || optimizedQueryData.candidates[0].content.parts.length === 0) {
      console.error('Error: Respuesta inesperada de la API de Gemini para la consulta optimizada:', JSON.stringify(optimizedQueryData, null, 2));
      throw new Error('Respuesta inesperada de la API de Gemini al optimizar la consulta.');
    }
    const optimizedQuery = optimizedQueryData.candidates[0].content.parts[0].text.trim(); // Esta línea ahora es segura
    console.log(`Consulta de búsqueda optimizada: "${optimizedQuery}"`);

    // --- PASO 2: Generar embedding para la consulta optimizada (usando fetch) ---
    const embeddingResponse = await fetchWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${googleApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'models/text-embedding-004',
          content: { parts: [{ text: optimizedQuery }] }, // Usamos la consulta optimizada
        }),
      }
    )
    if (!embeddingResponse.ok) {
      throw new Error(`Error de Google Embedding API: ${await embeddingResponse.text()}`)
    }
    const embeddingData = await embeddingResponse.json()
    const queryEmbedding = embeddingData.embedding.values

    // --- PASO 3: Buscar productos similares en la base de datos ---
    const { data: matchedProducts, error: matchError } = await supabase.rpc('match_products', {
      query_embedding: queryEmbedding,
      client_id_filter: clientId, // <-- NUEVO: Pasamos el client_id al filtro
      match_threshold: 0.5, // <-- BAJAMOS EL UMBRAL PARA SER MÁS FLEXIBLES
      match_count: 5,
    })
    if (matchError) throw matchError
    products = matchedProducts; // Asignamos los productos encontrados

    // Añadimos un log para depurar y ver cuántos productos se encontraron
    console.log(`Búsqueda de similitud encontró ${products?.length || 0} productos.`);
    }

    // Formateamos el historial para la IA, tomando solo los últimos 6 mensajes para mantener el contexto relevante
    const historyText = history.map(msg => 
      `${msg.from === 'bot' ? 'Ferre' : 'Cliente'}: ${msg.text}`
    ).slice(-6).join('\n');

    // --- PASO 4: Obtener TODA la configuración del negocio desde la base de datos ---
    const [
      { data: configData, error: configError },
      { data: infoData, error: infoError },
      { data: offersData, error: offersError },
      { data: paymentsData, error: paymentsError }
    ] = await Promise.all([
      supabase.from('agent_config').select('prompt').eq('client_id', clientId).limit(1).single(),
      supabase.from('business_info').select('*').eq('client_id', clientId).limit(1).single(),
      supabase.from('offers').select('*').eq('is_active', true).eq('client_id', clientId),
      supabase.from('payment_methods').select('*').eq('is_active', true).eq('client_id', clientId)
    ]);

    if (configError) throw new Error(`Error al obtener la configuración del agente: ${configError.message}`);
    if (!configData) throw new Error('No se encontró configuración para el agente.');
    if (infoError) console.error("Error al obtener info del negocio:", infoError.message);
    if (offersError) console.error("Error al obtener ofertas:", offersError.message);
    if (paymentsError) console.error("Error al obtener métodos de pago:", paymentsError.message);

    const agentBasePrompt = configData.prompt;
    const businessInfoText = infoData ? `Nombre: ${infoData.name}, Dirección: ${infoData.address}, Horarios: ${infoData.hours}, Teléfono: ${infoData.phone}` : "No disponible.";
    const offersText = offersData?.map(o => `- ${o.title}: ${o.description} (Palabras clave: ${o.related_keywords})`).join('\n') || "No hay ofertas activas.";
    const paymentsText = paymentsData?.map(p => `- ${p.name}: ${p.surcharge_percentage > 0 ? `con un ${p.surcharge_percentage}% de recargo` : 'sin recargo'}`).join('\n') || "No disponibles.";

    // --- PASO 5: Construir el prompt final para la IA ---
    const contextText = products.map(p => `- ${p.name}: ${p.description}, Precio: $${p.price}`).join('\n')
    const prompt = `${agentBasePrompt}
      Productos disponibles:
      ${contextText || 'No se encontraron productos relevantes.'}

      Historial de la Conversación:
      ${historyText}

      ---
      INFORMACIÓN ADICIONAL DEL NEGOCIO (Úsala si el cliente pregunta por ella):
      
      Información General:
      ${businessInfoText}

      Ofertas Activas (Ofrécelas si el cliente compra un producto relacionado con las palabras clave):
      ${offersText}

      Métodos de Pago Aceptados:
      ${paymentsText}

      Pregunta del usuario: "${query}"

      Tu respuesta:
    `

    // --- PASO 6: Generar la respuesta final (usando fetch) ---
    const generativeResponse = await fetchWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${googleApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
          },
        }),
      }
    )
    if (!generativeResponse.ok) {
      throw new Error(`Error de Google Generative API: ${await generativeResponse.text()}`)
    }
    const generativeData = await generativeResponse.json();

    // --- Manejo de respuesta JSON ---
    if (!generativeData.candidates || !generativeData.candidates[0]?.content?.parts[0]?.text) {
      console.error('Error: Respuesta JSON inesperada de Gemini:', JSON.stringify(generativeData, null, 2));
      throw new Error('Respuesta inesperada de la API de Gemini.');
    }

    // La respuesta de Gemini es un string JSON, lo parseamos.
    const jsonResponse = JSON.parse(generativeData.candidates[0].content.parts[0].text);

    // --- PASO 7: Devolver la respuesta ---
    // Devolvemos el objeto JSON directamente. El whatsapp-gateway lo recibirá tal cual.
    return new Response(JSON.stringify(jsonResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error en la función chat:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
