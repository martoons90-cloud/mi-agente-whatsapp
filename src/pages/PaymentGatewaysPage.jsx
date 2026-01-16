// src/pages/PaymentGatewaysPage.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import {
  Typography, Box, Paper, TextField, Button, CircularProgress, Alert, Stack, Snackbar,
} from '@mui/material';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import SaveIcon from '@mui/icons-material/Save';

function PaymentGatewaysPage() {
  const [config, setConfig] = useState({ mercadopago_access_token: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    const fetchGatewayConfig = async () => {
      setLoading(true);
      setError('');
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) throw new Error("No hay una sesión activa.");

        const { data, error: dbError } = await supabase
          .from('clients')
          .select('mercadopago_access_token')
          .eq('id', session.user.id)
          .single();

        if (dbError && dbError.code !== 'PGRST116') throw dbError;

        if (data) {
          setConfig({ mercadopago_access_token: data.mercadopago_access_token || '' });
        }
      } catch (err) {
        setError(`Error al cargar la configuración: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };
    fetchGatewayConfig();
  }, []);

  const handleConfigChange = (e) => {
    const { name, value } = e.target;
    setConfig(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveChanges = async () => {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error("No hay una sesión activa.");

      const { error: updateError } = await supabase
        .from('clients')
        .update({ mercadopago_access_token: config.mercadopago_access_token })
        .eq('id', session.user.id);

      if (updateError) throw updateError;

      setSnackbar({ open: true, message: '¡Configuración de Mercado Pago guardada!', severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: `Error al guardar: ${err.message}`, severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Paper sx={{ p: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Configuración de Pasarelas de Pago
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Gestiona las credenciales para conectar tu cuenta con servicios de pago externos como Mercado Pago.
      </Typography>

      {loading ? <CircularProgress /> : error ? <Alert severity="error">{error}</Alert> : (
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Stack spacing={3}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <AccountBalanceIcon color="primary" />
              <Typography variant="h6">Mercado Pago</Typography>
            </Box>
            <TextField
              label="Access Token"
              name="mercadopago_access_token"
              value={config.mercadopago_access_token}
              onChange={handleConfigChange}
              type="password"
              fullWidth
              helperText="Tu token de acceso de producción. Lo encuentras en tus credenciales de desarrollador de Mercado Pago."
            />
            <Box sx={{ textAlign: 'right' }}>
              <Button
                variant="contained"
                onClick={handleSaveChanges}
                disabled={saving}
                startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
              >
                Guardar Credenciales
              </Button>
            </Box>
          </Stack>
        </Paper>
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

export default PaymentGatewaysPage;