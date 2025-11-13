// src/pages/SettingsPage.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient'; // <-- ¡CORRECCIÓN IMPORTANTE!
import { Typography, Box, Paper, TextField, Button, CircularProgress, Alert, Stack } from '@mui/material';

function SettingsPage() {
  const [info, setInfo] = useState({ name: '', address: '', hours: '', phone: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isNewInfo, setIsNewInfo] = useState(false);

  useEffect(() => {
    async function fetchInfo() {
      setLoading(true);
      try {
        const clientId = localStorage.getItem('clientId');
        if (!clientId) {
          setError("No se ha configurado una cuenta de cliente. Ve a 'Cuenta del Agente' primero.");
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('business_info')
          .select('*')
          .eq('client_id', clientId)
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

  const handleSaveInfo = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const clientId = localStorage.getItem('clientId');
      if (!clientId) throw new Error("No se encontró el ID del cliente.");

      const infoData = {
        client_id: clientId,
        name: info.name,
        address: info.address,
        hours: info.hours,
        phone: info.phone,
      };

      if (isNewInfo) {
        // Crear nueva información
        const { error } = await supabase.from('business_info').insert([infoData]);
        if (error) throw error;
        setIsNewInfo(false); // Ya no es nueva
      } else {
        // Actualizar información existente
        const { client_id, ...updateData } = infoData; // No se puede actualizar la columna client_id
        const { error } = await supabase.from('business_info').update(updateData).eq('client_id', clientId);
        if (error) throw error;
      }
      setSuccess('¡Información del comercio guardada con éxito!');
    } catch (err) {
      setError(`Error al guardar: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !info.name) {
    return <CircularProgress />;
  }

  return (
    <>
      <Typography variant="h4" component="h1" gutterBottom>
        Configuración del Negocio
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>Información del Comercio</Typography>
        <Stack spacing={2}>
          <TextField label="Nombre del Comercio" name="name" value={info.name} onChange={handleInfoChange} fullWidth />
          <TextField label="Dirección" name="address" value={info.address} onChange={handleInfoChange} fullWidth />
          <TextField label="Horarios de Atención" name="hours" value={info.hours} onChange={handleInfoChange} fullWidth />
          <TextField label="Teléfono de Contacto" name="phone" value={info.phone} onChange={handleInfoChange} fullWidth />
          <Box sx={{ textAlign: 'right' }}>
            <Button variant="contained" color="secondary" onClick={handleSaveInfo} disabled={loading}>
              {loading ? <CircularProgress size={24} /> : 'Guardar Información'}
            </Button>
          </Box>
        </Stack>
      </Paper>

      {/* La gestión de ofertas y pagos se moverá a sus propias secciones */}
    </>
  );
}

export default SettingsPage;
