// src/pages/ConnectionsPage.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient'; // Importamos supabase para la consulta
import useWebSocket, { ReadyState } from 'react-use-websocket';
import {
  Typography, Box, Paper, TextField, Button, CircularProgress, Alert, Stack, Chip, Snackbar,
} from '@mui/material';
import SettingsEthernetIcon from '@mui/icons-material/SettingsEthernet';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import SaveIcon from '@mui/icons-material/Save';
import CodeIcon from '@mui/icons-material/Code';

function ConnectionsPage() {
  const [connections, setConnections] = useState({
    websocket_url: '',
  });
  const [testResults, setTestResults] = useState({
    websocket: { status: 'idle', message: '' }
  });
  const [loading, setLoading] = useState(true); // Estado para la carga inicial
  const [isTestSuccessful, setIsTestSuccessful] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [runWsTest, setRunWsTest] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Hook para el WebSocket, pero no lo compartimos para poder controlar la conexión aquí
  const { readyState } = useWebSocket(connections.websocket_url, {
    shouldReconnect: () => false, // No reconectar automáticamente para el test
  }, runWsTest); // <-- CAMBIO: Solo se conecta cuando se lo indicamos

  useEffect(() => {
    // Cargar la configuración del WebSocket desde la base de datos
    const fetchWebsocketUrl = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('app_config')
          .select('value')
          .eq('key', 'WEBSOCKET_URL')
          .single();

        // Ignorar el error si la fila no existe, usaremos un valor por defecto.
        if (error && error.code !== 'PGRST116') throw error;

        setConnections({ websocket_url: data?.value || 'ws://localhost:8080' });
      } catch (err) {
        console.error("Error al cargar la URL del WebSocket:", err);
        setConnections({ websocket_url: 'ws://localhost:8080' }); // Fallback en caso de error
      } finally {
        setLoading(false);
      }
    };
    fetchWebsocketUrl();
  }, []);

  const handleUrlChange = (e) => {
    setConnections({ websocket_url: e.target.value });
    setIsTestSuccessful(false); // Resetea el estado de éxito si la URL cambia
    setTestResults({ websocket: { status: 'idle', message: '' } });
  };

  useEffect(() => {
    // Solo reaccionar a los cambios de estado si el test fue iniciado
    if (!runWsTest) return;
    // Actualizar el estado del test de WebSocket basado en el hook
    const wsStatusMap = {
      [ReadyState.CONNECTING]: { status: 'testing', message: 'Conectando...' },
      [ReadyState.OPEN]: { status: 'success', message: 'Conexión exitosa.' },
      [ReadyState.CLOSING]: { status: 'testing', message: 'Cerrando...' },
      [ReadyState.CLOSED]: { status: 'error', message: 'No se pudo conectar. Verifica que el gateway esté corriendo.' },
      [ReadyState.UNINSTANTIATED]: { status: 'idle', message: '' },
    };
    setTestResults(prev => ({ ...prev, websocket: wsStatusMap[readyState] }));

    // Si la conexión se cierra (éxito o error), detenemos el test
    if (readyState === ReadyState.OPEN || readyState === ReadyState.CLOSED) {
      if (readyState === ReadyState.OPEN) {
        setIsTestSuccessful(true); // Habilita el botón de guardar
      }
      setRunWsTest(false);
    }
  }, [readyState, runWsTest]);


  const handleTestConnection = () => {
    setIsTestSuccessful(false);
    setTestResults({
      websocket: { status: 'testing', message: 'Iniciando...' },
    });
    setRunWsTest(true);
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('app_config')
        .upsert({ key: 'WEBSOCKET_URL', value: connections.websocket_url }, { onConflict: 'key' });

      if (error) throw error;

      setSnackbar({ open: true, message: '¡Configuración guardada con éxito!', severity: 'success' });
      // Opcional: deshabilitar el botón de guardar de nuevo hasta el próximo test exitoso
      // setIsTestSuccessful(false); 
    } catch (err) {
      setSnackbar({ open: true, message: `Error al guardar: ${err.message}`, severity: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const renderStatusChip = (result) => {
    const { status, message } = result;
    const statusMap = {
      idle: { label: 'Sin probar', color: 'default', icon: <SettingsEthernetIcon /> },
      testing: { label: 'Probando...', color: 'info', icon: <CircularProgress size={16} color="inherit" /> },
      success: { label: 'Conectado', color: 'success', icon: <CheckCircleIcon /> },
      error: { label: 'Error', color: 'error', icon: <ErrorIcon /> },
    };
    const current = statusMap[status];
    return (
      <Stack direction="row" alignItems="center" spacing={1}>
        <Chip label={current.label} color={current.color} icon={current.icon} />
        {message && <Typography variant="caption" color={status === 'error' ? 'error.main' : 'text.secondary'}>{message}</Typography>}
      </Stack>
    );
  };

  return (
    <Paper sx={{ p: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Configuración de Conexión al Gateway
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Define y prueba la URL para conectar con el servicio de WhatsApp (Gateway). La conexión debe ser exitosa para poder guardar el cambio.
      </Typography>

      {loading ? <CircularProgress /> : (
        <Stack spacing={3} sx={{ mb: 4 }}>
          <Box>
            <Typography variant="h6" gutterBottom>Conexión al Gateway de WhatsApp</Typography>
            <TextField
              label="WebSocket URL"
              value={connections.websocket_url}
              onChange={handleUrlChange}
              fullWidth
              variant="outlined"
              helperText="Ej: ws://localhost:8080 o wss://tu-dominio.com"
            />
            <Box sx={{ mt: 1 }}>{renderStatusChip(testResults.websocket)}</Box>
          </Box>

          <Stack direction="row" spacing={2}>
            <Button onClick={handleTestConnection} variant="outlined" startIcon={<SettingsEthernetIcon />} disabled={runWsTest || isSaving}>
              {runWsTest ? <CircularProgress size={24} /> : 'Probar Conexión'}
            </Button>
            <Button
              onClick={handleSaveChanges}
              variant="contained"
              startIcon={<SaveIcon />}
              // Se elimina la condición !isTestSuccessful para permitir guardar sin una prueba exitosa.
              disabled={isSaving || runWsTest}
              color="primary"
            >
              {isSaving ? <CircularProgress size={24} /> : 'Guardar'}
            </Button>
          </Stack>
        </Stack>
      )}

      {testResults.websocket.status === 'error' && (
        <Alert severity="warning" icon={<CodeIcon />}>
          <Typography variant="h6" component="div">Pasos para solucionar problemas</Typography>
          <Typography variant="body2" component="div" sx={{ mt: 1 }}>
            <p>Parece que la conexión con el Gateway está fallando. Revisa lo siguiente:</p>
            <ul>
              <li>Verifica que el servidor <code>whatsapp-gateway</code> esté corriendo en tu terminal.</li>
              <li>Si lo está, revisa su archivo <code>.env</code> para la configuración de <code>WEBSOCKET_PORT</code>. La URL que se está probando es <strong>{connections.websocket_url}</strong>.</li>
            </ul>
            <p>Después de modificar el archivo <code>.env</code> del gateway, <strong>debes reiniciarlo</strong>.</p>
          </Typography>
        </Alert>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>{snackbar.message}</Alert>
      </Snackbar>
    </Paper>
  );
}

export default ConnectionsPage;