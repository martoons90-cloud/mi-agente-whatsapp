import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai'

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
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }})
  }

  try {
    // 1. Recibimos el texto a convertir en embedding
    const { text } = await req.json()
    if (!text) {
      return sendJSON({ error: 'Falta el parámetro "text".' }, 400)
    }

    // 2. Obtenemos la API Key global desde los secrets de Supabase
    // (Esto es más seguro y eficiente que buscarla por cliente cada vez)
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('La variable de entorno GEMINI_API_KEY no está configurada en Supabase.');
    }

    // 3. Inicializamos el modelo de embeddings
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'text-embedding-004' }) // Modelo específico para embeddings

    // 4. Generamos el embedding
    const result = await model.embedContent(text)
    const embedding = result.embedding.values

    // 5. Devolvemos el embedding al frontend
    return sendJSON({ embedding })

  } catch (error) {
    console.error('Error en la función generate-embeddings:', error)
    return sendJSON({ error: error.message }, 500)
  }
})