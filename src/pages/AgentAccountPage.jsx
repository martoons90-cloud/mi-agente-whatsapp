// c:\Users\Martin\mi-agente-whatsapp\src\pages\AgentAccountPage.jsx
import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Snackbar,
  Stack
} from '@mui/material';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import { supabase } from '../supabaseClient'; // Importamos la instancia centralizada de supabase

function AgentAccountPage() {
  const [account, setAccount] = useState({ name: '', gemini_api_key: '' });
  const [isNewClient, setIsNewClient] = useState(false); // <-- Nuevo estado para saber si es un cliente nuevo
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    const fetchAccountData = async () => {
      // Leemos el ID del cliente desde el almacenamiento local del navegador
      const clientId = localStorage.getItem('clientId');

      if (!clientId) {
        // Si no hay ID, es un cliente nuevo.
        setIsNewClient(true);
        setLoading(false); // <-- ¡Añadimos esta línea aquí!
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from('clients')
          .select('name, gemini_api_key')
              .eq('id', clientId)
          .single();

        // Si hay un error y no es porque no encontró la fila, lo lanzamos
        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        if (data) {
          setAccount(data);
          setIsNewClient(false);
        } else {
          // El ID existe en localStorage pero no en la BD (caso raro). Tratémoslo como nuevo.
          localStorage.removeItem('clientId');
          setIsNewClient(true);
        }
      } catch (err) {
        console.error('Error fetching account data:', err.message);
        setError('Error al cargar los datos de la cuenta: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAccountData();
  }, []);

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setAccount(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveChanges = async (e) => {
    e.preventDefault();
    if (!account.name.trim() || !account.gemini_api_key.trim()) {
      showSnackbar('El nombre del negocio y la API Key de Gemini son obligatorios.', 'warning');
      return;
    }
    setLoading(true);
    try {
      if (isNewClient) {
        // Lógica para CREAR un nuevo cliente. La BD genera el ID automáticamente.
        const { data, error } = await supabase
          .from('clients')
          .insert({ 
            name: account.name, 
            gemini_api_key: account.gemini_api_key 
          })
          .select('id') // Pedimos que nos devuelva el ID del nuevo registro
          .single();

        if (error) throw error;

        // ¡Guardamos el nuevo ID en el almacenamiento local!
        localStorage.setItem('clientId', data.id);
        setIsNewClient(false); // Ya no es un cliente nuevo
        showSnackbar('¡Cuenta creada y guardada con éxito!', 'success');
      } else {
        // Lógica para ACTUALIZAR un cliente existente
        const clientId = localStorage.getItem('clientId');
        const { error } = await supabase
          .from('clients')
          .update({ name: account.name, gemini_api_key: account.gemini_api_key })
          .eq('id', clientId);
        if (error) throw error;
        showSnackbar('¡Datos de la cuenta guardados con éxito!', 'success');
      }
    } catch (err) {
      console.error('Error updating account:', err.message);
      showSnackbar('Error al guardar los datos: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper sx={{ p: 4, maxWidth: 800, margin: 'auto' }}>
      <Typography variant="h4" component="h1" gutterBottom>
        {isNewClient ? 'Crear Cuenta de Agente' : 'Configuración de la Cuenta del Agente'}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {isNewClient 
          ? 'Bienvenido. Por favor, completa los datos de tu negocio para activar el asistente de IA.'
          : 'Aquí puedes configurar el nombre de tu negocio y la clave API de Gemini necesaria para que el asistente de IA funcione.'
        }
      </Typography>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : (
        <Box component="form" onSubmit={handleSaveChanges}>
          <Stack spacing={3}>
            <TextField
              label="Nombre del Negocio"
              name="name"
              value={account.name}
              onChange={handleInputChange}
              fullWidth
              required
            />
            <TextField
              label="API Key de Gemini"
              name="gemini_api_key"
              value={account.gemini_api_key}
              onChange={handleInputChange}
              fullWidth
              required
              type="password" // Para ocultar la clave
              helperText="Obtén tu clave gratuita desde Google AI Studio."
            />
            <Button
              type="submit"
              variant="contained"
              color="primary"
              startIcon={<VpnKeyIcon />}
              disabled={loading}
              sx={{ alignSelf: 'flex-start' }}
            >
                  {loading ? <CircularProgress size={24} /> : (isNewClient ? 'Crear y Guardar Cuenta' : 'Guardar Cambios')}
            </Button>
          </Stack>
        </Box>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Paper>
  );
}

export default AgentAccountPage;
