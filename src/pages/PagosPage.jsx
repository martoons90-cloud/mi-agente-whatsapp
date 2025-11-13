// src/pages/PagosPage.jsx
import { useState } from 'react';
import { Typography, Box, Button, Stack, Snackbar, Alert } from '@mui/material';
import PaymentMethodsTable from '../components/PaymentMethodsTable.jsx';
import PaymentMethodForm from '../components/PaymentMethodForm.jsx';
import { supabase } from '../supabaseClient.js';

function PagosPage() {
  const [tableKey, setTableKey] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [methodToEdit, setMethodToEdit] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const handleOpenForm = (method = null) => {
    setMethodToEdit(method);
    setFormOpen(true);
  };

  const handleSaveMethod = async (methodData) => {
    try {
      const clientId = localStorage.getItem('clientId');
      if (!clientId) {
        throw new Error("No se ha configurado una cuenta de cliente. Ve a 'Cuenta del Agente'.");
      }

      let error;
      if (methodData.id) {
        // Editar método existente
        // Separamos el 'id' del resto de los datos para no intentar actualizarlo.
        const { id, ...updateData } = methodData;
        ({ error } = await supabase.from('payment_methods').update({ ...updateData, client_id: clientId }).eq('id', id));
      } else {
        // Crear nuevo método
        const { id, ...insertData } = methodData; // Quitar el id si viene nulo
        ({ error } = await supabase.from('payment_methods').insert([{ ...insertData, client_id: clientId }]));
      }

      if (error) throw error;

      setSnackbar({ open: true, message: '¡Método de pago guardado con éxito!', severity: 'success' });
      setTableKey(prevKey => prevKey + 1); // Forzar recarga de la tabla
    } catch (error) {
      setSnackbar({ open: true, message: `Error al guardar: ${error.message}`, severity: 'error' });
    }
  };

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" component="h1">
          Métodos de Pago
        </Typography>
        <Button variant="contained" color="secondary" onClick={() => handleOpenForm()}>
          Agregar Método de Pago
        </Button>
      </Box>
      <PaymentMethodsTable keyProp={tableKey} onEdit={handleOpenForm} />
      <PaymentMethodForm open={formOpen} onClose={() => setFormOpen(false)} onSave={handleSaveMethod} methodToEdit={methodToEdit} />
      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>{snackbar.message}</Alert>
      </Snackbar>
    </>
  );
}
export default PagosPage;