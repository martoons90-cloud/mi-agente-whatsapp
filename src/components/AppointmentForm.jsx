// src/components/AppointmentForm.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useOutletContext } from 'react-router-dom';
import {
  Button, Dialog, DialogActions, DialogContent, DialogTitle, Box,
  TextField, Stack, FormControl, InputLabel, Select, MenuItem, CircularProgress, Typography, Grid
} from '@mui/material';

const initialState = {
  service_id: '',
  customer_name: '',
  customer_contact: '',
  start_time: null,
  end_time: null,
};

function AppointmentForm({ open, onClose, onSave, slotInfo }) {
  const [appointment, setAppointment] = useState(initialState);
  const [services, setServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const { selectedClientId, timeFormat } = useOutletContext(); // <-- ¡NUEVO!

  // Opciones de formato de hora
  const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: timeFormat === '12h' };

  // Cargar los servicios que tienen duración (son agendables)
  useEffect(() => {
    const fetchServices = async () => {
      if (!selectedClientId) return;
      setLoadingServices(true);
      const { data, error } = await supabase
        .from('products')
        .select('id, name, duration_minutes')
        .eq('client_id', selectedClientId)
        .gt('duration_minutes', 0); // Solo traer servicios con duración

      if (error) {
        console.error("Error al cargar servicios:", error);
      } else {
        setServices(data);
      }
      setLoadingServices(false);
    };

    if (open) {
      fetchServices();
    }
  }, [open, selectedClientId]);

  // Pre-rellenar el formulario cuando se abre
  useEffect(() => {
    if (slotInfo) {
      // El slotInfo de la vista mensual nos da el día, pero la hora es 00:00.
      // La dejaremos así para que el usuario la elija.
      setAppointment({
        ...initialState,
        start_time: slotInfo.start,
      });
    }
  }, [slotInfo]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    let newAppointment = { ...appointment, [name]: value };

    // --- ¡LÓGICA NUEVA! ---
    // Si se cambia la hora de inicio, actualizamos la fecha completa.
    if (name === 'start_time_input' && appointment.start_time) {
      const [hours, minutes] = value.split(':');
      const newDate = new Date(appointment.start_time);
      newDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
      newAppointment = { ...newAppointment, start_time: newDate };
    }

    // Si se cambia el servicio, recalcular la hora de fin
    if (name === 'service_id') {
      const selectedService = services.find(s => s.id === value);
      if (selectedService && newAppointment.start_time) {
        const startTime = new Date(newAppointment.start_time);
        const endTime = new Date(startTime.getTime() + selectedService.duration_minutes * 60000);
        newAppointment.end_time = endTime;
      }
    }

    // Si se cambia la hora, y ya hay un servicio, recalcular la hora de fin
    if (name === 'start_time_input' && newAppointment.service_id) {
        const selectedService = services.find(s => s.id === newAppointment.service_id);
        if (selectedService) {
            const startTime = new Date(newAppointment.start_time);
            const endTime = new Date(startTime.getTime() + selectedService.duration_minutes * 60000);
            newAppointment.end_time = endTime;
        }
    }


    setAppointment(newAppointment);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!appointment.service_id || !appointment.customer_name) {
      alert('El servicio y el nombre del cliente son obligatorios.');
      return;
    }
    onSave(appointment);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Agendar Nuevo Turno</DialogTitle>
      <Box component="form" onSubmit={handleSubmit}>
        <DialogContent>
          <Stack spacing={3} sx={{ pt: 1 }}>
            <FormControl fullWidth required>
              <InputLabel id="service-select-label">Servicio</InputLabel>
              {loadingServices ? <CircularProgress /> : (
                <Select
                  labelId="service-select-label"
                  name="service_id"
                  value={appointment.service_id}
                  label="Servicio"
                  onChange={handleChange}
                >
                  {services.map((service) => (
                    <MenuItem key={service.id} value={service.id}>{service.name} ({service.duration_minutes} min)</MenuItem>
                  ))}
                </Select>
              )}
            </FormControl>
            <TextField
              label="Nombre del Cliente"
              name="customer_name"
              value={appointment.customer_name}
              onChange={handleChange}
              fullWidth
              required
            />
            <TextField
              label="Contacto del Cliente (Opcional)"
              name="customer_contact"
              value={appointment.customer_contact}
              onChange={handleChange}
              fullWidth
            />
            <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={6}>
                    {/* --- ¡NUEVO CAMPO DE HORA! --- */}
                    <TextField
                        label="Hora de Inicio"
                        name="start_time_input"
                        type="time"
                        fullWidth
                        required
                        value={appointment.start_time ? `${String(appointment.start_time.getHours()).padStart(2, '0')}:${String(appointment.start_time.getMinutes()).padStart(2, '0')}` : ''}
                        onChange={handleChange}
                        InputLabelProps={{ shrink: true }}
                    />
                </Grid>
                <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                        Día: {appointment.start_time?.toLocaleDateString('es-AR')}
                        <br />
                        {appointment.end_time && `Finaliza aprox: ${appointment.end_time.toLocaleTimeString('es-AR', timeOptions)}`}
                    </Typography>
                </Grid>
            </Grid>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="contained">Guardar Turno</Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

export default AppointmentForm;