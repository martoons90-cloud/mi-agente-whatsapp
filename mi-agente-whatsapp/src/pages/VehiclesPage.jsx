// src/pages/VehiclesPage.jsx
import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { Typography, Box, Button, Stack, Snackbar, Alert } from '@mui/material';
import VehicleTable from '../components/VehicleTable.jsx';
import VehicleForm from '../components/VehicleForm.jsx';

import DownloadIcon from '@mui/icons-material/Download';
import { supabase } from '../supabaseClient.js';

function VehiclesPage() {
  const [tableKey, setTableKey] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [vehicleToEdit, setVehicleToEdit] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const { selectedClientId } = useOutletContext();

  const handleSaveVehicle = async (vehicleData) => {
    try {
      if (!selectedClientId) throw new Error("No hay un cliente seleccionado.");

      // Embedding generator updated for Vehicles
      const textToEmbed = `Vehículo: ${vehicleData.make} ${vehicleData.model} ${vehicleData.year}. Precio: ${vehicleData.price}. Descripción: ${vehicleData.description || ''}.`.trim();

      const { data: embeddingData, error: embeddingError } = await supabase.functions.invoke('generate-embedding', {
        body: { text: textToEmbed },
      });

      if (embeddingError) {
        console.warn("Error generando embedding, guardando sin él:", embeddingError.message);
        // We allow saving even if embedding fails for now
      }

      const finalData = {
        ...vehicleData,
        client_id: selectedClientId,
        embedding: embeddingData?.embedding || null,
      };

      let error;
      let successMessage;

      if (finalData.id) {
        const { id, ...updateData } = finalData;
        ({ error } = await supabase.from('vehicles').update(updateData).eq('id', id));
        successMessage = '¡Vehículo actualizado con éxito!';
      } else {
        const { id, ...insertData } = finalData;
        ({ error } = await supabase.from('vehicles').insert([insertData]));
        successMessage = '¡Vehículo agregado con éxito!';
      }

      if (error) throw error;

      setSnackbar({ open: true, message: successMessage, severity: 'success' });
      setTableKey(prevKey => prevKey + 1);
    } catch (error) {
      setSnackbar({ open: true, message: `Error al guardar: ${error.message}`, severity: 'error' });
    }
  };

  const handleOpenForm = (vehicle = null) => {
    setVehicleToEdit(vehicle);
    setFormOpen(true);
  };

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" component="h1">
          Gestión de Vehículos
        </Typography>
        <Stack direction="row" spacing={2}>
          {/* Export/Import disabled temporarily or need specific update */}
          <Button variant="contained" color="secondary" onClick={() => handleOpenForm()}>
            Agregar Vehículo
          </Button>
        </Stack>
      </Box>
      <VehicleTable tableKey={tableKey} onEdit={handleOpenForm} />

      <VehicleForm open={formOpen} onClose={() => setFormOpen(false)} onSave={handleSaveVehicle} vehicleToEdit={vehicleToEdit} />

      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}
export default VehiclesPage;
