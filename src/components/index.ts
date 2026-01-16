// supabase/functions/import-products/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4/dist/module/index.js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { products, clientId } = await req.json(); // <-- ¡CAMBIO CLAVE! Recibimos el clientId
    if (!products || !Array.isArray(products)) {
      throw new Error('Se requiere un array de "products".');
    }
    if (!clientId) {
      throw new Error('Se requiere el "clientId".');
    }

    // 1. Crear cliente de Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 3. Preparar los nuevos productos con sus embeddings
    const productsToInsert = await Promise.all(products.map(async (product) => {
      const textToEmbed = `Nombre del producto: ${product.name}. Descripción: ${product.description || 'Sin descripción'}. Se vende por: ${product.unit || 'unidad'}.`.trim();
      
      // Llamamos a la función que genera el embedding
      const { data: embeddingData, error: embeddingError } = await supabase.functions.invoke('generate-embedding', {
        body: { text: textToEmbed },
      });
      if (embeddingError) throw new Error(`Error al generar embedding para "${product.name}": ${embeddingError.message}`);

      return {
        id: product.id || undefined, // Usamos el ID si existe, si no, la BD lo genera.
        client_id: clientId,
        name: product.name,
        description: product.description || null,
        price: parseFloat(product.price) || 0,
        stock: parseInt(product.stock, 10) || 0,
        unit: product.unit || 'unidad',
        is_active: true,
        embedding: embeddingData.embedding,
      };
    }));

    // 4. ¡CAMBIO CLAVE! Usamos 'upsert' para actualizar existentes o insertar nuevos.
    const { error: insertError } = await supabase
      .from('products')
      // Le decimos a Supabase que el conflicto ocurre en la combinación de 'id' y 'client_id'.
      .upsert(productsToInsert, { onConflict: 'id,client_id' });

    if (insertError) throw insertError;

    return new Response(JSON.stringify({ message: `${productsToInsert.length} productos importados con éxito.` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})