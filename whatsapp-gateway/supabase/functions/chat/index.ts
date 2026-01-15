import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from 'https://esm.sh/@google/generative-ai'
import { parseDate } from 'https://esm.sh/chrono-node@2.7.6'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const sendJSON = (data: object, status = 200) => {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  })
}

// Esta es la nueva función que contiene la lógica de la IA
async function runAI(apiKey: string, systemInstruction: string, query: string, history: any[], supabaseAdmin: any, userSessionId: string, botConfigId: string) {
  // 1. Traducir y limpiar el historial para asegurar que sea válido.
  let chatHistory = history
    .map((msg) => ({
      role: msg.from === 'bot' ? 'model' : 'user',
      parts: [{ text: msg.text }],
    }))
    .filter(msg => msg.parts[0]?.text?.trim() !== '');

  // 2. Asegurarse de que el historial SIEMPRE empiece con un 'user'.
  if (chatHistory.length > 0 && chatHistory[0].role === 'model') {
    chatHistory.shift(); // Elimina el primer elemento si es del bot
  }

  const tools = [
    {
      functionDeclarations: [
        {
          name: 'product_search',
          description: 'Busca productos en el catálogo de la tienda por nombre o descripción.',
          parameters: {
            type: 'OBJECT',
            properties: {
              query: {
                type: 'STRING',
                description: 'El término de búsqueda para el producto. Por ejemplo: "taladro", "herramienta para cortar madera".',
              },
            },
            required: ['query'],
          },
        },
        {
          name: 'check_availability',
          description: 'Verifica si un servicio (como una cancha de fútbol) está disponible en una fecha y hora específicas. Devuelve los horarios disponibles si los hay.',
          parameters: {
            type: 'OBJECT',
            properties: {
              service_name: {
                type: 'STRING',
                description: 'El nombre del servicio a verificar. Por ejemplo: "cancha de fútbol 5", "cancha de pádel".',
              },
              date_time: {
                type: 'STRING',
                description: 'La fecha y hora solicitada por el usuario en formato ISO 8601 (YYYY-MM-DDTHH:mm:ss).',
              },
            },
            required: ['service_name', 'date_time'],
          },
        },
        // Aquí podrías agregar una herramienta 'create_appointment' en el futuro
      ],
    },
  ]

  // 3. Iniciar el modelo de IA con la instrucción de sistema.
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite', systemInstruction });

  // 4. Iniciar el chat
  const chat = model.startChat({
    history: chatHistory,
    tools: tools,
    safetySettings: [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    ],
  });

  // 5. Enviar el mensaje del usuario a la IA.
  const result = await chat.sendMessage(query);
  const call = result.response.functionCalls()?.[0];

  // 6. Manejar la llamada a una herramienta (Function Calling)
  if (call) {
    const { name, args } = call;
    let toolResponse;

    // ¡NUEVO! Interceptamos la llamada para parsear la fecha antes de ejecutar la herramienta.
    if (name === 'check_availability' && args.date_time) {
        // Usamos chrono-node para entender "mañana a las 5pm", "el próximo martes", etc.
        const parsedDate = parseDate(args.date_time, new Date(), { forwardDate: true });
        if (parsedDate) {
            console.log(`DEBUG: Fecha interpretada por chrono-node: "${args.date_time}" -> ${parsedDate.toISOString()}`);
            // Reemplazamos el texto original con la fecha ISO 8601 real.
            args.date_time = parsedDate.toISOString();
        } else {
            // Si chrono-node no puede entender la fecha, la IA tendrá que volver a preguntar.
            console.warn(`DEBUG: chrono-node no pudo interpretar la fecha: "${args.date_time}"`);
            args.date_time = null; // Forzamos un error para que la IA pida la fecha de nuevo.
        }
    }

    if (name === 'product_search') {
      console.log('Ejecutando búsqueda de productos para:', args.query);
      const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });
      const embeddingResult = await embeddingModel.embedContent(args.query);
      const embedding = embeddingResult.embedding.values;

      // ¡LOG DE DEPURACIÓN CLAVE!
      // Esto nos mostrará en los logs de la Edge Function para qué client_id se está buscando.
      console.log(`DEBUG: Buscando productos con client_id_filter: "${botConfigId}"`);
      const { data: products, error: searchError } = await supabaseAdmin.rpc('match_products', {
        query_embedding: embedding,
        client_id_filter: botConfigId, // <-- CORRECCIÓN: Usamos el ID del negocio para buscar sus productos
        match_threshold: 0.5, // <-- CORRECCIÓN: Umbral más flexible
        match_count: 5,
      });

      if (searchError) {
        console.error('DEBUG: Error en la llamada RPC a match_products:', searchError);
        toolResponse = { name, content: { error: 'Hubo un error al buscar en el catálogo.' } };
      } else {
        console.log('DEBUG: Productos encontrados por la RPC:', JSON.stringify(products, null, 2));
        if (!products || products.length === 0) {
          console.log('DEBUG: La búsqueda no devolvió productos. La IA informará que no hay stock.');
        }
        toolResponse = { name, content: { products: products } };
      }
    } else if (name === 'check_availability') {
        console.log('Ejecutando verificación de disponibilidad para:', args);
        if (!args.service_name || !args.date_time) {
            // Esto sucede si la IA no tiene todos los datos o si chrono-node falló.
            toolResponse = { name, content: { error: 'Falta el nombre del servicio o la fecha y hora para verificar.' } };
        } else {
            // --- LÓGICA DE VERIFICACIÓN (EJEMPLO) ---
            // Aquí es donde te conectarías a tu sistema de reservas real.
            // Por ahora, simularemos que siempre hay disponibilidad.
            const availableSlots = ['18:00', '19:00', '20:00'];
            toolResponse = { name, content: {
                message: `Para el servicio "${args.service_name}" cerca de la hora solicitada, encontré estos horarios disponibles.`,
                available_slots: availableSlots
            }};
        }
    } else {
      // Si la IA llama a una herramienta que no existe
      console.warn(`DEBUG: La IA intentó llamar a una herramienta desconocida: "${name}"`);
      toolResponse = { name, content: { error: `La herramienta ${name} no existe.` } };
    }

    console.log('DEBUG: Respuesta de la herramienta (toolResponse) que se envía a la IA:', JSON.stringify(toolResponse, null, 2));
    // 7. Enviar el resultado de la herramienta de vuelta a la IA para que genere la respuesta final.
    const finalResult = await chat.sendMessage(JSON.stringify(toolResponse));
    const finalResponseText = finalResult.response.text();
    return finalResponseText.trim() !== '' ? finalResponseText : 'He encontrado algunos productos, pero no sé cómo describirlos. ¿Puedes ser más específico?';

  }

  // 8. Si no se usó ninguna herramienta, devolver la respuesta de texto directa.
  const responseText = result.response.text();

  return responseText.trim() !== '' ? responseText : 'No sé qué decir a eso. ¿Puedes preguntarme otra cosa?';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Extraer datos de la solicitud
    const { message: query, sessionId: userSessionId, history = [], clientId: botConfigId } = await req.json(); // Renombramos clientId a botConfigId para claridad

    if (!query || !userSessionId || !botConfigId) {
      return sendJSON({ error: 'Faltan los parámetros "message", "sessionId" o "clientId" en la petición.' }, 400);
    }

    // 2. Crear el cliente de Supabase para uso interno en la función
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 3. Leer la configuración del bot (personalidad, rol, API key) desde la tabla 'clients'.
    const { data: botConfig, error: configError } = await supabaseAdmin
      .from('clients')
      .select('role, agent_config, gemini_api_key')
      .eq('id', botConfigId)
      .single();

    if (configError) {
      throw new Error(`No se encontró la configuración para el bot con ID "${botConfigId}". Error: ${configError.message}`);
    }

    // 4. Obtener el prompt base del rol desde la tabla 'role_prompts'
    const { data: rolePromptData, error: rolePromptError } = await supabaseAdmin
      .from('role_prompts')
      .select('base_prompt')
      .eq('role_name', botConfig.role)
      .single();

    // Si hay un error (ej. el rol no existe), usamos un prompt por defecto seguro.
    const basePrompt = rolePromptError || !rolePromptData
      ? 'Tu tarea principal es ser un asistente útil. Responde de manera clara y concisa.'
      : rolePromptData.base_prompt;

    // NUEVO: Obtener la información del negocio para personalizar las respuestas
    const { data: businessInfo, error: businessInfoError } = await supabaseAdmin
      .from('business_info')
      .select('name, address, hours, phone')
      .eq('client_id', botConfigId)
      .single();

    if (businessInfoError && businessInfoError.code !== 'PGRST116') {
      console.warn(`Advertencia: No se pudo cargar la información del negocio para el cliente ${botConfigId}: ${businessInfoError.message}`);
    }

    // 5. Construir la instrucción final para el sistema de IA
    let systemInstruction = `${botConfig.agent_config?.prompt || 'Eres un asistente.'}\n\n${basePrompt}`;

    // NUEVO: Reemplazar marcadores de posición con la información real del negocio
    if (businessInfo) {
      systemInstruction = systemInstruction.replace(/\[Nombre de la Tienda\]/g, businessInfo.name || 'la tienda');
      // Aquí podrías añadir más reemplazos, como [Dirección], [Horarios], etc.
    }
    
    // ¡CORRECCIÓN CLAVE! Añadimos reglas estrictas para evitar que la IA invente información.
    // Estas reglas fuerzan a la IA a usar siempre el catálogo y a no alucinar.
    systemInstruction += `\n
      REGLAS DE ORO (INQUEBRANTABLES):
      1.  **Uso Obligatorio de Herramientas:**
          - Para buscar productos: Usa SIEMPRE 'product_search'.
          - Para agendar o ver horarios: Usa SIEMPRE 'check_availability'. Es tu única fuente de verdad sobre la disponibilidad.
      2.  **Recopilación de Datos para Citas:** Antes de llamar a 'check_availability', DEBES tener dos datos del usuario: el servicio exacto (ej: "cancha de fútbol 5") y una fecha/hora (ej: "mañana a las 5 de la tarde"). Si falta alguno, pídelo amablemente.
      3.  **Manejo de Errores de Herramientas:** Si una herramienta te devuelve un error (por ejemplo, 'Falta el nombre del servicio o la fecha'), significa que no tenías la información completa. Pide al usuario los datos que faltan de forma clara. Ejemplo: "Para poder ayudarte, ¿me recuerdas qué tipo de cancha y para qué día y hora la necesitas?".
      4.  **Prohibido Inventar:** NUNCA inventes productos, precios, stock u horarios. Basa tu respuesta 100% en los datos que te devuelven las herramientas. Si una herramienta no devuelve resultados, eso significa que no hay stock o no hay disponibilidad.
      5.  **Presentación de Horarios:** Cuando 'check_availability' te devuelva horarios disponibles, preséntalos al usuario de forma clara y pregúntale cuál prefiere. Ejemplo: "¡Claro! Para mañana tengo disponibilidad a las 18:00, 19:00 y 20:00. ¿Cuál de esos horarios te reservo?".`;

    // 6. Ejecutar la lógica de la IA con toda la configuración
    const reply = await runAI(botConfig.gemini_api_key, systemInstruction, query, history, supabaseAdmin, userSessionId, botConfigId);

    // 7. Devolver la respuesta
    return sendJSON({ reply });

  } catch (error) {
    console.error('Error en la función chat:', error);
    return sendJSON({ error: error.message }, 500);
  }
})