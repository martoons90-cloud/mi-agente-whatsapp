// src/pages/ProductsPage.jsx
import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import * as XLSX from 'xlsx'; // <-- ¡NUEVO! Importamos la librería para Excel
import { Typography, Box, Button, Stack, Snackbar, Alert } from '@mui/material';
import ProductTable from '../components/ProductTable.jsx';
import ProductForm from '../components/ProductForm.jsx';
import ProductImportDialog from '../components/ProductImportDialog.jsx'; // <-- ¡NUEVO!
import DownloadIcon from '@mui/icons-material/Download'; // <-- ¡NUEVO!
import { supabase } from '../supabaseClient.js';

function ProductsPage() {
  // Creamos una clave que cambiará para forzar la recarga de la tabla
  const [tableKey, setTableKey] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false); // <-- ¡NUEVO!
  const [productToEdit, setProductToEdit] = useState(null); // <-- ¡NUEVO! Para la edición
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const { selectedClientId } = useOutletContext();

  const handleSaveProduct = async (productData) => {
    try {
      if (!selectedClientId) throw new Error("No hay un cliente seleccionado.");

      // 1. Generar el embedding del producto
      const textToEmbed = `Nombre del producto: ${productData.name}. Categoría: ${productData.category_name || 'Sin categoría'}. Descripción: ${productData.description || 'Sin descripción'}. Se vende por: ${productData.unit}.`.trim();

      const { data: embeddingData, error: embeddingError } = await supabase.functions.invoke('generate-embedding', {
        body: { text: textToEmbed },
      });

      if (embeddingError) {
        const errorDetails = embeddingError.context?.error?.message || embeddingError.message;
        throw new Error(`Error al generar el embedding: ${errorDetails}`);
      }

      // ¡CORRECCIÓN CLAVE! Quitamos la propiedad temporal 'category_name' antes de guardar.
      const { category_name, ...dataToSave } = productData;

      const finalProductData = {
        ...dataToSave,
        client_id: selectedClientId,
        embedding: embeddingData.embedding, // <-- Añadimos el embedding
      };

      let error;
      let successMessage;

      if (finalProductData.id) {
        // --- LÓGICA DE EDICIÓN ---
        const { id, category, ...updateData } = finalProductData; // Excluimos 'category' que es un objeto relacional
        ({ error } = await supabase.from('products').update(updateData).eq('id', id));
        successMessage = '¡Producto actualizado con éxito!';
      } else {
        // --- LÓGICA DE CREACIÓN ---
        const { id, ...insertData } = finalProductData;
        ({ error } = await supabase.from('products').insert([insertData]));
        successMessage = '¡Producto agregado con éxito!';
      }

      if (error) {
        if (error.code === '23505') {
          throw new Error(`El producto "${productData.name}" ya existe. No se puede agregar de nuevo.`);
        }
        throw error;
      }

      setSnackbar({ open: true, message: successMessage, severity: 'success' });
      setTableKey(prevKey => prevKey + 1); // Forzar recarga de la tabla
    } catch (error) {
      setSnackbar({ open: true, message: `Error al guardar el producto: ${error.message}`, severity: 'error' });
    }
  };

  const handleImport = async (productsToImport) => {
    try {
      if (!selectedClientId) throw new Error("No hay un cliente seleccionado.");

      // ¡CAMBIO CLAVE! Pasamos el client_id a la función para que sepa a quién pertenecen los productos.
      const { data, error } = await supabase.functions.invoke('import-products', {
        body: { 
          products: productsToImport,
          clientId: selectedClientId 
        },
      });

      if (error) throw error;

      setSnackbar({ open: true, message: data.message || '¡Productos importados con éxito!', severity: 'success' });
      setTableKey(prevKey => prevKey + 1); // Forzar recarga de la tabla
    } catch (error) {
      setSnackbar({ open: true, message: `Error al importar productos: ${error.message}`, severity: 'error' });
    }
  };

  const handleExport = async () => {
    try {
      if (!selectedClientId) throw new Error("No hay un cliente seleccionado.");

      const { data: products, error } = await supabase
        .from('products')
        .select('id,name,category,description,price,stock,unit') // <-- ¡CAMBIO CLAVE! Incluimos la categoría.
        .eq('client_id', selectedClientId);

      if (error) throw error;

      // ¡CAMBIO CLAVE! Generamos un archivo Excel en lugar de CSV
      const worksheet = XLSX.utils.json_to_sheet(products);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Productos");

      // Disparamos la descarga del archivo .xlsx
      XLSX.writeFile(workbook, "catalogo_productos.xlsx");

    } catch (error) {
      setSnackbar({ open: true, message: `Error al exportar: ${error.message}`, severity: 'error' });
    }
  };

  const handleOpenForm = (product = null) => {
    setProductToEdit(product);
    setFormOpen(true);
  };

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" component="h1">
          Gestión de Productos
        </Typography>
        <Stack direction="row" spacing={2}>
          <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleExport}>Exportar a Excel</Button>
          <Button variant="outlined" onClick={() => setImportDialogOpen(true)}>Importar</Button>
          <Button variant="contained" color="secondary" onClick={() => handleOpenForm()}>
            Agregar Producto
          </Button>
        </Stack>
      </Box>
      <ProductTable tableKey={tableKey} onEdit={handleOpenForm} /> {/* Pasamos la key y la función de editar */}

      <ProductForm open={formOpen} onClose={() => setFormOpen(false)} onSave={handleSaveProduct} productToEdit={productToEdit} />

      <ProductImportDialog open={importDialogOpen} onClose={() => setImportDialogOpen(false)} onImport={handleImport} />

      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}
export default ProductsPage;
