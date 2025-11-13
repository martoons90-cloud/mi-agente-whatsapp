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
      const clientId = localStorage.getItem('clientId');
      if (!clientId) {
        throw new Error("No se ha configurado una cuenta de cliente. Ve a 'Cuenta del Agente'.");
      }

      const { error } = await supabase
        .from('products')
        .insert([{ ...productData, client_id: clientId }]); // <-- AÑADIMOS EL client_id

      if (error) {
        throw new Error(`Error de Supabase: ${error.message}`);
      }

      setSnackbar({ open: true, message: '¡Producto agregado con éxito!', severity: 'success' });
      setTableKey(prevKey => prevKey + 1); // Forzar recarga de la tabla
    } catch (error) {
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
