import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from 'https://esm.sh/@google/generative-ai'

// Función para ejecutar la lógica de la IA
async function runAI(apiKey, query, history, supabaseAdmin, clientId) {
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' })
  const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' })

  const chatHistory = history.map((msg) => ({
    role: msg.role,
    parts: [{ text: msg.text }],
  }))

  // --- ¡CAMBIO CLAVE! OBTENER ROL Y PROMPT PERSONALIZADO ---
  const { data: clientData, error: clientError } = await supabaseAdmin
    .from('clients')
    .select('role, agent_config(prompt)')
    .eq('id', clientId)
    .single()

  if (clientError) throw clientError;

  // --- LÓGICA DE VENDEDOR DE AUTOS (Hardcoded para evitar problemas de DB) ---
  // Si el cliente no tiene config específica, usamos este prompt maestro.
  let userPrompt = clientData.agent_config[0]?.prompt;

  if (!userPrompt) {
    userPrompt = `
ERES UN VENDEDOR EXPERTO DE AGENCIA DE AUTOS.
TU NOMBRE ES "AUTO-BOT".
TU OBJETIVO: Vender autos y conseguir que el cliente venga a la agencia.

TUS REGLAS DE ORO:
1.  **ACTITUD:** Profesional, entusiasta y servicial.
2.  **VENTA:** Si preguntan por un auto, SIEMPRE ofrece "Financiación en Cuotas Fijas" y "Toma de Usados".
3.  **CIERRE:** Nunca termines una respuesta con un punto final. TERMINA CON UNA PREGUNTA para mantener la charla. Ej: "¿Te gustaría coordinar una visita?"
4.  **DATOS:** Solo ofrece los autos que encuentres con la herramienta 'vehicle_search'.
5.  **UBICACIÓN:** Estamos en Av. Libertador 1234, Buenos Aires.

SI NO ENCUENTRAS EL AUTO EXACTO:
Ofrece algo similar o pregunta si quiere ver el catálogo completo.
`;
  }

  // Ignoramos la tabla 'role_prompts' por ahora para simplificar
  const finalPrompt = userPrompt;

  const tools = [
    {
      functionDeclarations: [
        {
          name: 'vehicle_search',
          description: 'Busca vehículos en el concesionario por marca, modelo, año o características.',
          parameters: {
            type: 'OBJECT',
            properties: {
              query: {
                type: 'STRING',
                description: 'El término de búsqueda. Ej: "Toyota Corolla", "Camioneta 4x4", "Auto barato".',
              },
            },
            required: ['query'],
          },
        },
      ],
    },
  ]

  const systemInstruction = {
    role: 'system',
    parts: [{ text: finalPrompt }],
  }

  const chat = model.startChat({
    history: [systemInstruction, ...chatHistory],
    tools: tools,
    safetySettings: [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    ],
  })

  const result = await chat.sendMessage(query)
  const call = result.response.functionCalls()?.[0]

  if (call) {
    const { name, args } = call
    if (name === 'vehicle_search') {
      console.log('Ejecutando búsqueda de vehículos...')
      // Assuming embedding has same dimension; if not, need to check model config. 
      // text-embedding-004 output dimension can be 768 or similar.
      const result = await embeddingModel.embedContent(args.query)
      const embedding = result.embedding.values

      const { data: vehicles, error: searchError } = await supabaseAdmin.rpc('match_vehicles', {
        query_embedding: embedding,
        match_threshold: 0.6, // Slightly lower threshold for broader matches
        match_count: 5,
        p_client_id: clientId // Ensure we only search THIS client's vehicles
      })

      if (searchError) {
        console.error('Error en la búsqueda de vehículos:', searchError)
        return 'Hubo un error al buscar en el inventario.'
      } else if (vehicles && vehicles.length > 0) {
        const searchResults = 'Vehículos encontrados:\n' +
          vehicles.map((v) => `- ${v.make} ${v.model} (${v.year}): $${v.price} ${v.currency} - ${v.description} - Estado: ${v.status}`).join('\n') +
          '\nBasándote en estos resultados, responde al cliente ofreciento detalles y financiación si aplica.'
        return searchResults
      } else {
        return 'No se encontraron vehículos que coincidan con la búsqueda.'
      }
    }
  }

  return result.response.text()
}

// El resto del código para servir la función (manejo de CORS, etc.) se omite
// ya que el foco está en la lógica de `runAI`. En un archivo real,
// deberías tener el `serve` y el manejo de la petición como en las otras funciones.