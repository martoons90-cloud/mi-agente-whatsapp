// src/pages/ProductsPage.jsx
import { useState } from 'react';
import UploadCSV from '../components/UploadCSV.jsx';
import { Typography, Box, Button, Stack, Snackbar, Alert } from '@mui/material';
import ProductTable from '../components/ProductTable.jsx';
import ProductForm from '../components/ProductForm.jsx';
import { supabase } from '../supabaseClient.js';

function ProductsPage() {
  // Creamos una clave que cambiará para forzar la recarga de la tabla
  const [tableKey, setTableKey] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const handleSaveProduct = async (productData) => {
    try {
      // ¡CORRECCIÓN! Obtenemos el ID del usuario logueado, es más seguro.
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error("No hay una sesión activa. Por favor, inicia sesión.");
      const clientId = session.user.id;

      // 1. Generar el embedding del producto
      // ¡MEJORA! Añadimos etiquetas para darle más contexto al modelo de embeddings.
      // Esto ayuda a la IA a diferenciar entre el nombre y la descripción, mejorando la precisión de la búsqueda.
      const textToEmbed = `Nombre del producto: ${productData.name}. Descripción: ${productData.description || 'Sin descripción'}. Se vende por: ${productData.unit}.`.trim();
      console.log("Paso 1: Intentando invocar la función 'generate-embedding' con el texto:", textToEmbed);

      const { data: embeddingData, error: embeddingError } = await supabase.functions.invoke('generate-embedding', {
        body: { text: textToEmbed },
      });

      console.log("Paso 2: Respuesta recibida de la función.", { embeddingData, embeddingError });
      if (embeddingError) {
        // Intenta obtener un mensaje de error más detallado del cuerpo de la respuesta
        const errorDetails = embeddingError.context?.error?.message || embeddingError.message;
        console.error("Error detallado de la función 'generate-embedding':", embeddingError);
        throw new Error(`Error al generar el embedding: ${errorDetails}`);
      }

      console.log("Paso 3: Embedding generado correctamente. Preparando para insertar en la base de datos.");
      const productToInsert = {
        ...productData,
        client_id: clientId,
        embedding: embeddingData.embedding, // <-- Añadimos el embedding
      };

      // ¡LOG DE DEPURACIÓN CRÍTICO!
      // Esto nos mostrará en la consola del navegador el objeto exacto que se va a guardar.
      // Revisa si la propiedad "embedding" tiene un array de números o si es null.
      console.log("Paso 4: Insertando el siguiente producto:", productToInsert);
      // 2. Insertar el producto con su embedding
      const { error } = await supabase
        .from('products')
        .insert([productToInsert]);

      if (error) {
        throw new Error(`Error de Supabase: ${error.message}`);
      }

      setSnackbar({ open: true, message: '¡Producto agregado con éxito!', severity: 'success' });
      console.log("Paso 5: Producto guardado con éxito.");
      setTableKey(prevKey => prevKey + 1); // Forzar recarga de la tabla
    } catch (error) {
      console.error("FLUJO INTERRUMPIDO: Ocurrió un error en handleSaveProduct:", error);
      setSnackbar({ open: true, message: `Error al agregar el producto: ${error.message}`, severity: 'error' });
    }
  };

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" component="h1">
          Gestión de Productos
        </Typography>
        <Stack direction="row" spacing={2}>
          {/* <UploadCSV onUploadComplete={() => setTableKey(prevKey => prevKey + 1)} /> */}
          <Button variant="contained" color="secondary" onClick={() => setFormOpen(true)}>
            Agregar Producto
          </Button>
        </Stack>
      </Box>
      <ProductTable key={tableKey} /> {/* Usamos la clave para forzar la recarga */}

      <ProductForm open={formOpen} onClose={() => setFormOpen(false)} onSave={handleSaveProduct} />

      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}
export default ProductsPage;
