// src/pages/SettingsPage.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient'; // <-- ¡CORRECCIÓN IMPORTANTE!
import {
  Typography, Box, Paper, TextField, Button, CircularProgress, Alert, Stack, Snackbar, 
  FormControlLabel, Switch, Avatar
} from '@mui/material';

function SettingsPage() {
  const [info, setInfo] = useState({ name: '', address: '', hours: '', phone: '', location_url: '', directions: '', logo_url: '', quote_includes_vat: true });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isNewInfo, setIsNewInfo] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    async function fetchInfo() {
      setLoading(true);
      setError('');
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          setError("No hay una sesión activa. Por favor, inicia sesión.");
          setLoading(false);
          return;
        }
        const currentUserId = session.user.id;
 
        const { data, error } = await supabase
          .from('business_info')
          .select('*')
          .eq('client_id', currentUserId)
          .limit(1)
          .single();
 
        if (error && error.code !== 'PGRST116') throw error; // Ignorar error si no encuentra la fila
 
        if (data) setInfo(data);
        else setIsNewInfo(true); // Si no hay datos, es para crear
 
      } catch (err) {
        setError(`Error al cargar la información: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }
    fetchInfo();
  }, []);
 
  const handleInfoChange = (e) => {
    const { name, value } = e.target;
    setInfo(prev => ({ ...prev, [name]: value }));
  };
 
  const handleVatChange = (e) => {
    setInfo(prev => ({ ...prev, quote_includes_vat: e.target.checked }));
  };

  const handleLogoUpload = async (event) => {
    try {
      setLoading(true);
      const file = event.target.files[0];
      if (!file) return;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error("No hay una sesión activa.");
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${session.user.id}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage.from('logos').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(filePath);
      setInfo(prev => ({ ...prev, logo_url: publicUrl }));

    } catch (err) {
      setSnackbar({ open: true, message: `Error al subir el logo: ${err.message}`, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveInfo = async () => {
    setLoading(true);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error("No hay una sesión activa.");
      const currentUserId = session.user.id;
 
      const infoData = {
        client_id: currentUserId,
        name: info.name,
        address: info.address,
        hours: info.hours,
        phone: info.phone,
        location_url: info.location_url,
        directions: info.directions,
        logo_url: info.logo_url,
        quote_includes_vat: info.quote_includes_vat,
      };
 
      if (isNewInfo) {
        // Crear nueva información
        const { error } = await supabase.from('business_info').insert([infoData]);
        if (error) throw error;
        setIsNewInfo(false); // Ya no es nueva
      } else {
        // Actualizar información existente
        const { client_id, ...updateData } = infoData; // No se puede actualizar la columna client_id
        const { error } = await supabase.from('business_info').update(updateData).eq('client_id', currentUserId);
        if (error) throw error;
      }
      setSnackbar({ open: true, message: '¡Información del comercio guardada con éxito!', severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: `Error al guardar: ${err.message}`, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };
 
  return (
    <>
      <Typography variant="h4" component="h1" gutterBottom>
        Configuración del Negocio
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {!loading && (
        <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>Información del Comercio</Typography>
        <Stack spacing={3}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar src={info.logo_url} sx={{ width: 80, height: 80 }} variant="rounded">
              {!info.logo_url && 'Logo'}
            </Avatar>
            <Button variant="outlined" component="label" color="secondary" disabled={loading}>
              Subir Logo
              <input type="file" hidden onChange={handleLogoUpload} accept="image/png, image/jpeg" />
            </Button>
          </Box>
          <TextField label="Nombre del Comercio" name="name" value={info.name} onChange={handleInfoChange} fullWidth />
          <TextField label="Dirección" name="address" value={info.address} onChange={handleInfoChange} fullWidth />
          <TextField label="Horarios de Atención" name="hours" value={info.hours} onChange={handleInfoChange} fullWidth />
          <TextField label="Teléfono de Contacto" name="phone" value={info.phone} onChange={handleInfoChange} fullWidth />
          <TextField label="Link de Google Maps" name="location_url" value={info.location_url || ''} onChange={handleInfoChange} fullWidth placeholder="https://maps.app.goo.gl/..." />
          <TextField label="Indicaciones Adicionales (Opcional)" name="directions" value={info.directions || ''} onChange={handleInfoChange} fullWidth multiline rows={3} placeholder="Ej: Toca el timbre rojo, local con puerta de vidrio." />
          <FormControlLabel
            control={<Switch checked={info.quote_includes_vat} onChange={handleVatChange} color="secondary" />}
            label="Incluir desglose de IVA (21%) en las cotizaciones"
          />
          <Box sx={{ textAlign: 'right' }}>
            <Button variant="contained" color="secondary" onClick={handleSaveInfo} disabled={loading}>
              {loading ? <CircularProgress size={24} /> : 'Guardar Información'}
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
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}

export default SettingsPage;
