// src/pages/OfertasPage.jsx
import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Typography, Box, Button, Snackbar, Alert } from '@mui/material';
import OffersTable from '../components/OffersTable.jsx';
import OfferForm from '../components/OfferForm.jsx';
import { supabase } from '../supabaseClient.js';

function OfertasPage() {
  const [tableKey, setTableKey] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [offerToEdit, setOfferToEdit] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const { selectedClientId } = useOutletContext();

  const handleOpenForm = (offer = null) => {
    setOfferToEdit(offer);
    setFormOpen(true);
  };

  const handleSaveOffer = async (offerData) => {
    try {
      if (!selectedClientId) throw new Error("No hay un cliente seleccionado.");

      let error;
      if (offerData.id) {
        const { id, ...updateData } = offerData;
        ({ error } = await supabase.from('offers').update({ ...updateData, client_id: selectedClientId }).eq('id', id));
      } else {
        const { id, ...insertData } = offerData;
        ({ error } = await supabase.from('offers').insert([{ ...insertData, client_id: selectedClientId, is_active: true }]));
      }

      if (error) throw error;

      setSnackbar({ open: true, message: '¡Oferta guardada con éxito!', severity: 'success' });
      setTableKey(prevKey => prevKey + 1); // Forzar recarga de la tabla
    } catch (error) {
      setSnackbar({ open: true, message: `Error al guardar: ${error.message}`, severity: 'error' });
    }
  };

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" component="h1">
          Gestión de Ofertas
        </Typography>
        <Button variant="contained" color="secondary" onClick={() => handleOpenForm()}>
          Crear Oferta
        </Button>
      </Box>
      <OffersTable tableKey={tableKey} onEdit={handleOpenForm} />
      <OfferForm open={formOpen} onClose={() => setFormOpen(false)} onSave={handleSaveOffer} offerToEdit={offerToEdit} />
      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>{snackbar.message}</Alert>
      </Snackbar>
    </>
  );
}
export default OfertasPage;