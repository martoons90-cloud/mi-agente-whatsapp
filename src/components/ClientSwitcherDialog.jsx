// src/components/ClientSwitcherDialog.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import Select from 'react-select';
import {
  Button, Dialog, DialogActions, DialogContent, DialogTitle, Box,
  Typography, CircularProgress, Paper, Alert, Divider
} from '@mui/material';
import PersonSearchIcon from '@mui/icons-material/PersonSearch';

function ClientSwitcherDialog({ open, onClose, allClients, onConfirm }) {
  const [tempSelectedClient, setTempSelectedClient] = useState(null);
  const [clientInfo, setClientInfo] = useState(null);
  const [loadingInfo, setLoadingInfo] = useState(false);

  // Resetear el estado cuando el diálogo se cierra
  useEffect(() => {
    if (!open) {
      setTempSelectedClient(null);
      setClientInfo(null);
    }
  }, [open]);

  // Cargar la información del cliente cuando se selecciona uno en el desplegable
  useEffect(() => {
    async function fetchClientInfo() {
      if (!tempSelectedClient) {
        setClientInfo(null);
        return;
      }
      setLoadingInfo(true);
      setClientInfo(null);
      try {
        const { data, error } = await supabase
          .from('business_info')
          .select('name, address, phone')
          .eq('client_id', tempSelectedClient.value)
          .single();
        
        if (error && error.code !== 'PGRST116') throw error;
        
        setClientInfo(data);
      } catch (err) {
        console.error("Error al obtener la info del cliente:", err);
      } finally {
        setLoadingInfo(false);
      }
    }
    fetchClientInfo();
  }, [tempSelectedClient]);

  const handleConfirm = () => {
    if (tempSelectedClient) {
      onConfirm(tempSelectedClient.value);
    }
    onClose();
  };

  const clientOptions = allClients.map(client => ({ value: client.id, label: client.email }));

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <PersonSearchIcon />
        Cambiar de Cliente
      </DialogTitle>
      <DialogContent sx={{ minHeight: '300px' }}> {/* <-- ¡CAMBIO CLAVE! Hacemos el contenido más alto */}
        <Typography sx={{ mb: 2 }}>
          Selecciona un cliente para ver su configuración y operar como si fueras él.
        </Typography>
        <Select
          options={clientOptions}
          value={tempSelectedClient}
          onChange={setTempSelectedClient}
          placeholder="Buscar cliente por email..."
          isSearchable
          styles={{ menu: base => ({ ...base, zIndex: 9999 }) }}
        />
        {loadingInfo && <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}><CircularProgress /></Box>}
        
        {tempSelectedClient && !loadingInfo && (
          <Paper variant="outlined" sx={{ mt: 2, p: 2 }}>
            <Typography variant="h6" gutterBottom>Datos del Negocio</Typography>
            {clientInfo ? (
              <>
                <Typography variant="body1"><strong>Nombre:</strong> {clientInfo.name || 'No definido'}</Typography>
                <Typography variant="body1"><strong>Dirección:</strong> {clientInfo.address || 'No definida'}</Typography>
                <Typography variant="body1"><strong>Teléfono:</strong> {clientInfo.phone || 'No definido'}</Typography>
              </>
            ) : (
              <Alert severity="info">Este cliente aún no ha configurado la información de su negocio.</Alert>
            )}
          </Paper>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button 
          onClick={handleConfirm} 
          variant="contained" 
          disabled={!tempSelectedClient}
        >
          Confirmar y Cambiar
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ClientSwitcherDialog;