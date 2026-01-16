// src/components/AppointmentDetailsPanel.jsx
import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Box, Typography, Paper, Divider, CircularProgress, Alert, Button, Stack, useTheme, IconButton } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonIcon from '@mui/icons-material/Person';
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer'; // Icono genérico para servicio
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';

function AppointmentDetailsPanel({ appointmentId, onEdit, onDelete }) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { timeFormat } = useOutletContext();
  const theme = useTheme(); // Hook para acceder al tema de MUI

  const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: timeFormat === '12h' };

  useEffect(() => {
    async function fetchAppointmentDetails() {
      if (!appointmentId) {
        setDetails(null);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from('appointments')
          .select('*, service:products(name, duration_minutes)') // <-- ¡NUEVO! Traemos también la duración
          .eq('id', appointmentId)
          .single();

        if (error) throw error;
        setDetails(data);
      } catch (err) {
        setError(`Error al cargar los detalles: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }
    fetchAppointmentDetails();
  }, [appointmentId]);

  const handleDeleteClick = () => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este turno? Esta acción no se puede deshacer.')) {
      onDelete(details.id);
    }
  };

  if (!appointmentId) {
    return (
      <Paper sx={{ p: 2, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'grey.100', borderRadius: 4 }}>
        <Typography color="text.secondary">Selecciona un turno para ver los detalles</Typography>
      </Paper>
    );
  }

  return (
    // --- ¡NUEVO DISEÑO INSPIRADO EN LA IA! ---
    <Paper sx={{ 
      p: 3, 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column', 
      backgroundColor: theme.palette.primary.main,
      color: 'white',
      borderRadius: '25px', // Bordes fuertemente redondeados
      boxShadow: theme.shadows[6],
    }}>
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>Detalles del Turno</Typography>
      <Divider sx={{ mb: 3, bgcolor: 'rgba(255, 255, 255, 0.2)' }} />
      {loading && <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}><CircularProgress /></Box>}
      {error && <Alert severity="error">{error}</Alert>}
      {details && (
        <>
          <Stack spacing={2.5} sx={{ flexGrow: 1, overflowY: 'auto' }}>
            {/* --- ¡NUEVA TARJETA DE CLIENTE! --- */}
            <Paper sx={{ p: 1.5, borderRadius: 4, bgcolor: 'white', color: 'primary.dark', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <PersonIcon sx={{ mx: 1, color: 'primary.main' }} />
                <Box>
                  <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{details.customer_name}</Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>{details.customer_contact || 'Sin contacto'}</Typography>
                </Box>
              </Box>
              {details.customer_contact && (
                <IconButton 
                  sx={{ color: 'green' }} 
                  component="a" 
                  href={`https://wa.me/${details.customer_contact.replace(/\D/g, '')}`} // Limpia el número para la URL
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <WhatsAppIcon />
                </IconButton>
              )}
            </Paper>

            <Divider sx={{ my: 1, bgcolor: 'rgba(255, 255, 255, 0.2)' }} />

            {/* Detalles del Servicio y Horario */}
            <Stack direction="row" spacing={1.5} alignItems="center">
              <SportsSoccerIcon sx={{ color: 'rgba(255, 255, 255, 0.8)' }} />
              <Typography variant="body1">{details.service?.name || 'Servicio no especificado'}</Typography>
            </Stack>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <CalendarTodayIcon sx={{ color: 'rgba(255, 255, 255, 0.8)' }} />
              <Typography variant="body1">{new Date(details.start_time).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}</Typography>
            </Stack>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <AccessTimeIcon sx={{ color: 'rgba(255, 255, 255, 0.8)' }} />
              <Typography variant="body1">{`${new Date(details.start_time).toLocaleTimeString('es-AR', timeOptions)} - ${new Date(details.end_time).toLocaleTimeString('es-AR', timeOptions)}`}</Typography>
            </Stack>
          </Stack>

          {/* Botones de Acción */}
          <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
            <Button 
              variant="contained" 
              startIcon={<EditIcon />} 
              onClick={() => alert('Función de editar no implementada aún.')} 
              fullWidth 
              sx={{ 
                bgcolor: 'white', // <-- ¡CAMBIO! Fondo blanco
                color: 'primary.dark', 
                borderRadius: '50px',
                py: 1.5,
                fontWeight: 'bold',
                '&:hover': { bgcolor: 'grey.200' } // Hover gris claro
              }}
            >
              Editar
            </Button>
            <Button variant="text" onClick={handleDeleteClick} fullWidth sx={{ color: 'rgba(255, 255, 255, 0.7)', '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.1)' } }}>
              Eliminar
            </Button>
          </Stack>
        </>
      )}
    </Paper>
  );
}

export default AppointmentDetailsPanel;
