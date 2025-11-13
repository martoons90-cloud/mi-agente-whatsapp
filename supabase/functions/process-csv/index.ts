// supabase/functions/process-csv/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Papa from 'https://esm.sh/papaparse';

// Inicializa el cliente de la IA de Google.
// ¡Asegúrate de tener tu GOOGLE_API_KEY en las variables de entorno de Supabase!
const genAI = new GoogleGenerativeAI(Deno.env.get('GOOGLE_API_KEY')!);
const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });

serve(async (req) => {
  try {
    // Crea el cliente de Supabase para interactuar con la DB y Storage
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, // Usamos la service_role key para tener permisos de escritura
    );

    // Extrae la información del archivo subido del cuerpo de la petición
    const { record } = await req.json();
    const filePath = record.path_tokens.join('/');

    console.log(`Procesando archivo: ${filePath}`);

    // 1. Descargar el archivo CSV desde Supabase Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('catalogs')
      .download(filePath);

    if (downloadError) throw downloadError;

    const csvText = await fileData.text();

    // 2. Parsear el CSV para convertirlo en objetos
    const { data: products } = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
    });

    console.log(`Encontrados ${products.length} productos en el CSV.`);

    // 3. Generar los embeddings para cada producto
    for (const product of products) {
      // Combinamos los campos relevantes en un solo texto para generar el embedding
      const content = `Producto: ${product.name}, Descripción: ${product.description}, Precio: ${product.price}`;

      console.log(`Generando embedding para: ${product.name}`);
      const result = await model.embedContent(content);
      const embedding = result.embedding.values;

      // 4. Insertar el producto y su embedding en la base de datos
      const { error: insertError } = await supabase
        .from('products')
        .insert({
          name: product.name,
          description: product.description,
          price: parseFloat(product.price),
          embedding: embedding,
        });

      if (insertError) {
        console.error(`Error insertando ${product.name}:`, insertError.message);
      } else {
        console.log(`Producto "${product.name}" insertado correctamente.`);
      }
    }

    return new Response(JSON.stringify({ message: 'Procesamiento completado' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error en la función:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
