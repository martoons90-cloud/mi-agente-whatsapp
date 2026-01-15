import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai'

// Helper para enviar respuestas JSON estandarizadas
// ¡CAMBIO! Añadimos las cabeceras CORS a todas las respuestas.
const sendJSON = (data: object, status = 200) => {
  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    },
    status,
  })
}

serve(async (req) => {
  // ¡NUEVO! Manejar las peticiones "preflight" de CORS.
  // El navegador envía una petición OPTIONS antes de la petición POST.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    }})
  }

  if (req.method !== 'POST') {
    return sendJSON({ error: 'Method Not Allowed' }, 405)
  }

  try {
    const { userRequest, clientId } = await req.json()

    // 2. Validar que los datos necesarios estén presentes
    if (!userRequest || !clientId) {
      return sendJSON({ error: 'Faltan los parámetros "userRequest" o "clientId".' }, 400)
    }

    // 3. Crear el cliente de Supabase para acceder a la base de datos
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 4. Obtener la API Key de Gemini del cliente
    const { data: clientData, error: clientError } = await supabaseAdmin
      .from('clients')
      .select('gemini_api_key')
      .eq('id', clientId)
      .single()

    if (clientError || !clientData?.gemini_api_key) {
      console.error('Error fetching client API key:', clientError)
      return sendJSON({ error: 'No se pudo encontrar la API Key para este cliente.' }, 500)
    }

    // 5. Configurar y llamar a la IA de Gemini
    const genAI = new GoogleGenerativeAI(clientData.gemini_api_key)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' }) // Modelo recomendado

    // Este es el "meta-prompt": le decimos a la IA cómo debe comportarse
    const metaPrompt = `
      Eres un experto en ingeniería de prompts. Un usuario ha escrito una petición para añadir una nueva regla de comportamiento a un agente de ventas de IA.
      Tu tarea es tomar la petición del usuario y convertirla en una regla clara, concisa y efectiva.
      La regla DEBE empezar con un guion ("-").
      Corrige cualquier error de ortografía o gramática.
      Mantén un tono profesional.

      Petición del usuario: "${userRequest}"

      Regla generada:
    `

    const result = await model.generateContent(metaPrompt)
    const response = await result.response
    const generatedRule = response.text()

    // 6. Devolver la regla generada por la IA
    return sendJSON({ rule: generatedRule })
  } catch (error) {
    console.error('Error en la función generate-prompt-rule:', error)
    return sendJSON({ error: error.message }, 500)
  }
})