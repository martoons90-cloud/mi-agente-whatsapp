// src/components/DayAgenda.jsx
import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Box, Typography, List, ListItem, ListItemText, CircularProgress, Alert, Paper, Divider, ListItemButton, FormControl, InputLabel, Select, MenuItem } from '@mui/material';

function DayAgenda({ selectedDate, onEventClick, selectedEventId }) {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // --- ¡NUEVO! Estados para el filtro ---
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState('all'); // 'all' para mostrar todos
  const { selectedClientId, timeFormat } = useOutletContext();

  const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: timeFormat === '12h' };

  useEffect(() => {
    async function fetchDayAppointments() {
      if (!selectedDate || !selectedClientId) {
        setAppointments([]);
        return;
      }

      setLoading(true);
      setError(null);

      // --- ¡CORRECCIÓN! Definimos las fechas ANTES de usarlas ---
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      // Creamos un query builder para poder añadir filtros dinámicamente
      let query = supabase.rpc('get_appointments_for_range', {
        p_client_id: selectedClientId,
        start_date: startOfDay.toISOString(),
        end_date: endOfDay.toISOString(),
      });
      try {
        // Reutilizamos la función RPC que ya teníamos
        const { data, error } = await query;

        if (error) throw error;

        // Ordenamos los turnos por hora de inicio
        const sortedAppointments = data.sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
        setAppointments(sortedAppointments);

      } catch (err) {
        setError(`Error al cargar los turnos del día: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }

    fetchDayAppointments();
  }, [selectedDate, selectedClientId, selectedService]); // <-- ¡NUEVO! Se re-ejecuta también cuando cambia el filtro

  // --- ¡NUEVO! Efecto para cargar la lista de servicios agendables ---
  useEffect(() => {
    async function fetchServices() {
      if (!selectedClientId) return;
      try {
        const { data, error } = await supabase
          .from('products')
          .select('id, name')
          .eq('client_id', selectedClientId)
          .gt('duration_minutes', 0) // Solo servicios que se pueden agendar
          .order('name', { ascending: true });

        if (error) throw error;
        setServices(data);
      } catch (err) {
        console.error("Error al cargar servicios para el filtro:", err.message);
      }
    }
    fetchServices();
  }, [selectedClientId]);

  return (
    <Paper sx={{ 
      p: 2, 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      borderRadius: '25px', // <-- ¡NUEVO! Mismo radio que la columna azul
    }}>
      <Typography variant="h6" gutterBottom>
        Agenda para: {selectedDate.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
      </Typography>
      <Divider sx={{ mb: 1 }} />

      {/* --- ¡NUEVO! Menú desplegable para filtrar --- */}
      <FormControl fullWidth size="small" sx={{ my: 1 }}>
        <InputLabel id="service-filter-label">Filtrar por Servicio</InputLabel>
        <Select
          labelId="service-filter-label"
          value={selectedService}
          label="Filtrar por Servicio"
          onChange={(e) => setSelectedService(e.target.value)}
        >
          <MenuItem value="all"><em>Todos los Servicios</em></MenuItem>
          {services.map(service => (
            <MenuItem key={service.id} value={service.id}>{service.name}</MenuItem>
          ))}
        </Select>
      </FormControl>
      {/* ----------------------------------------- */}

      <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
        {loading && <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>}
        {error && <Alert severity="error">{error}</Alert>}
        {!loading && !error && appointments.length === 0 && (
          <Typography color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
            No hay turnos para este día.
          </Typography>
        )}
        {!loading && !error && appointments.length > 0 && (
          <List dense>
            {appointments.map(app => (
              <ListItemButton 
                key={app.id} 
                selected={selectedEventId === app.id.toString()} // <-- ¡NUEVO! Resalta el turno seleccionado
                onClick={() => onEventClick({
                  id: app.id.toString(),
                  title: app.title,
                  start: new Date(app.start_time),
                  end: new Date(app.end_time),
                })}
                sx={{ borderRadius: 2 }} // Bordes redondeados para cada item
              >
                <ListItemText
                  primary={app.title}
                  secondary={`${new Date(app.start_time).toLocaleTimeString('es-AR', timeOptions)} - ${new Date(app.end_time).toLocaleTimeString('es-AR', timeOptions)}`}
                />
              </ListItemButton>
            ))}
          </List>
        )}
      </Box>
    </Paper>
  );
}

export default DayAgenda;