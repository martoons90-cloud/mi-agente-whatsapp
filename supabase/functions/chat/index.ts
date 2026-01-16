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

  const userPrompt = clientData.agent_config[0]?.prompt || 'Eres un asistente conversacional.';
  const role = clientData.role || 'product_seller';

  // ¡NUEVO! Leer el prompt base desde la base de datos
  const { data: rolePromptData, error: rolePromptError } = await supabaseAdmin
    .from('role_prompts')
    .select('base_prompt')
    .eq('role_name', role)
    .single();
  
  if (rolePromptError) throw new Error(`No se pudo cargar el prompt para el rol "${role}": ${rolePromptError.message}`);

  const basePrompt = rolePromptData.base_prompt;

  // Combinamos el prompt del usuario con el prompt base del rol
  const finalPrompt = `${userPrompt}\n\n${basePrompt}`;

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
      ],
    },
  ]

  const systemInstruction = {
    role: 'system', // Usamos el nuevo prompt combinado
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
    if (name === 'product_search') {
      console.log('Ejecutando búsqueda de productos...')
      const result = await embeddingModel.embedContent(args.query)
      const embedding = result.embedding.values

      const { data: products, error: searchError } = await supabaseAdmin.rpc('match_products', {
        query_embedding: embedding,
        match_threshold: 0.7,
        match_count: 5,
      })

      if (searchError) {
        console.error('Error en la búsqueda de productos:', searchError)
        return 'Hubo un error al buscar en el catálogo.'
      } else if (products && products.length > 0) {
        const searchResults = 'Productos encontrados en el catálogo:\n' +
          products.map((p) => `- ${p.name}: ${p.description} - Precio: $${p.price}`).join('\n') +
          '\nBasándote en estos resultados, responde a la pregunta del usuario.'
        return searchResults
      } else {
        return 'No se encontraron productos que coincidan con la búsqueda.'
      }
    }
  }

  return result.response.text()
}

// El resto del código para servir la función (manejo de CORS, etc.) se omite
// ya que el foco está en la lógica de `runAI`. En un archivo real,
// deberías tener el `serve` y el manejo de la petición como en las otras funciones.