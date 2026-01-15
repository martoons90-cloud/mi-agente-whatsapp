// c:\Users\Martin\mi-agente-whatsapp\src\pages\AgentAccountPage.jsx
import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Box, Typography, Paper, TextField, Button,
  CircularProgress, Alert, Snackbar, Stack, IconButton, InputAdornment
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import { supabase } from '../supabaseClient'; // Importamos la instancia centralizada de supabase

function AgentAccountPage() {
  const [account, setAccount] = useState({ name: '', gemini_api_key: '', role: 'product_seller', bot_phone_number: '' });
  const [isNewClient, setIsNewClient] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const { selectedClientId } = useOutletContext(); // <-- ¡CAMBIO CLAVE!

  useEffect(() => {
    const fetchAccountData = async () => {
      if (!selectedClientId) return;
      setLoading(true);
      setError(null);
      setAccount({ name: '', gemini_api_key: '', role: 'product_seller', bot_phone_number: '' }); // Reset

      try {
        const { data, error } = await supabase
          .from('clients')
          .select('name, gemini_api_key, bot_phone_number, agent_role')
          .eq('id', selectedClientId) // <-- ¡CAMBIO CLAVE!
          .single();

        // Si hay un error y no es porque no encontró la fila, lo lanzamos
        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        if (data) {
          setAccount({ 
            name: data.name, 
            gemini_api_key: data.gemini_api_key, 
            bot_phone_number: data.bot_phone_number || '',
            role: data.agent_role || 'product_seller'
          });
          setIsNewClient(false);
        } else {
          // No se encontró un cliente con este ID de usuario, es un cliente nuevo.
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
  }, [selectedClientId]); // <-- ¡CAMBIO CLAVE!

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setAccount(prev => ({ ...prev, [name]: value }));
  };

  const handlePhoneNumberChange = (e) => {
    // Permite solo números y el signo '+' al principio
    const sanitizedValue = e.target.value.replace(/[^0-9+]/g, '');
    setAccount(prev => ({ ...prev, bot_phone_number: sanitizedValue }));
  };

  const handleSaveChanges = async (e) => {
    e.preventDefault();
    if (!account.name.trim() || !account.gemini_api_key.trim() || !account.bot_phone_number.trim()) {
      showSnackbar('El nombre del negocio y la API Key de Gemini son obligatorios.', 'warning');
      return;
    }
    setLoading(true);
    try {
      if (isNewClient) {
        // Lógica para CREAR un nuevo cliente. La BD genera el ID automáticamente.
        const { error } = await supabase
          .from('clients')
          .insert({ 
            id: selectedClientId, // <-- ¡CAMBIO CLAVE!
            name: account.name, 
            gemini_api_key: account.gemini_api_key,
            agent_role: account.role, // <-- ¡AÑADIDO! Asignamos el rol del agente.
            bot_phone_number: account.bot_phone_number.replace(/\D/g, '') // Guardamos solo los números
          })

        if (error) throw error;

        setIsNewClient(false); // Ya no es un cliente nuevo
        showSnackbar('¡Cuenta creada y guardada con éxito!', 'success');
      } else {
        // Lógica para ACTUALIZAR un cliente existente
        const { error } = await supabase
          .from('clients')
          .update({ 
            name: account.name, 
            gemini_api_key: account.gemini_api_key, 
            bot_phone_number: account.bot_phone_number.replace(/\D/g, ''),
            // El rol del agente se cambia en la página de "Prompt"
          })
          .eq('id', selectedClientId); // <-- ¡CAMBIO CLAVE!
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

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(selectedClientId);
    showSnackbar('ID de Negocio copiado al portapapeles.', 'info');
  };

  return (
    <Paper sx={{ p: 4 }}>
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
            {selectedClientId && !isNewClient && (
                <TextField
                    label="ID de Negocio"
                    value={selectedClientId}
                    fullWidth
                    InputProps={{ readOnly: true }}
                    helperText="Este es el identificador único de tu negocio en el sistema."
                    variant="filled"
                />
            )}

            <TextField
              label="Nombre del Negocio"
              name="name"
              value={account.name}
              onChange={handleInputChange}
              fullWidth
              required
            />
            <TextField
              label="Número de Teléfono del Bot (con código de país)"
              name="bot_phone_number"
              value={account.bot_phone_number}
              onChange={handlePhoneNumberChange}
              fullWidth
              required
              placeholder="Ej: 5491122334455"
              helperText="El número de la línea de WhatsApp que usará el bot."
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
