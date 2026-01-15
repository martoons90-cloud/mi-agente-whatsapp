import { useState, useEffect, useCallback, useRef } from 'react';
import { Typography, Box, Paper, CircularProgress, Alert, Snackbar, Grid, Button, GlobalStyles } from '@mui/material';
import { useOutletContext } from 'react-router-dom';
import useWebSocket from 'react-use-websocket';
import AppointmentDetailsDialog from './AppointmentDetailsDialog';
import AppointmentForm from './AppointmentForm';
import DayAgenda from './DayAgenda';
import AppointmentDetailsPanel from './AppointmentDetailsPanel';
import { supabase } from '../supabaseClient';

import AddIcon from '@mui/icons-material/Add';
// --- ¡NUEVAS IMPORTACIONES PARA FULLCALENDAR! ---
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';

function CalendarPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [businessHours, setBusinessHours] = useState({ minTime: '00:00:00', maxTime: '24:00:00' });
  const calendarRef = useRef(null);
  const { selectedClientId, websocketUrl } = useOutletContext();
  const { lastMessage } = useWebSocket(websocketUrl, {
    share: true,
    shouldReconnect: () => true,
  });

  // Efecto para cargar los horarios del negocio
  useEffect(() => {
    async function fetchBusinessInfo() {
      if (!selectedClientId) return;

      try {
        const { data, error } = await supabase
          .from('business_info')
          .select('work_hours')
          .eq('client_id', selectedClientId)
          .single();

        if (error && error.code !== 'PGRST116') throw error;

        if (data && data.work_hours) {
          const workHours = data.work_hours;
          let min = '24:00';
          let max = '00:00';

          Object.values(workHours).forEach(day => {
            if (day.enabled) {
              if (day.start < min) min = day.start;
              if (day.end > max) max = day.end;
            }
          });
          
          if (min !== '24:00' && max !== '00:00') {
            setBusinessHours({ minTime: `${min}:00`, maxTime: `${max}:00` });
          }
        }
      } catch (err) { console.error("Error al cargar los horarios del negocio:", err.message); }
    }
    fetchBusinessInfo();
  }, [selectedClientId]);

  // --- ¡NUEVO! Solución para forzar el resize de FullCalendar ---
  // A veces, FullCalendar no se recalcula bien si su contenedor cambia de tamaño.
  useEffect(() => {
    setTimeout(() => {
      calendarRef.current?.getApi().updateSize();
    }, 100); // Un pequeño delay para asegurar que el DOM está listo.
  }, []);

  // Abre el formulario para un nuevo turno
  const handleOpenNewAppointmentForm = () => {
    const fakeSlotInfo = {
      start: selectedDate,
      end: selectedDate,
    };
    setSelectedSlot(fakeSlotInfo);
    setFormOpen(true);
  };

  // Actualiza la fecha seleccionada cuando se hace clic en un día del calendario
  const handleDateClick = (clickInfo) => {
    setSelectedDate(clickInfo.date);
    setSelectedEventId(null); // Limpiamos el panel de detalles al cambiar de día
  };

  // Añade la clase CSS al día seleccionado para resaltarlo
  const handleDayCellDidMount = (arg) => {
    const argDateStr = arg.date.toISOString().split('T')[0];
    const selectedDateStr = selectedDate.toISOString().split('T')[0];

    arg.el.classList.remove('selected-day');

    if (argDateStr === selectedDateStr) {
      arg.el.classList.add('selected-day');
    }
  };

  // Guarda un nuevo turno en la base de datos
  const handleSaveAppointment = async (appointmentData) => {
    try {
      const { service_id, customer_name, customer_contact, start_time, end_time } = appointmentData;
      const { error } = await supabase
        .from('appointments')
        .insert({
          client_id: selectedClientId,
          service_id,
          customer_name,
          customer_contact,
          start_time: start_time,
          end_time: end_time,
          status: 'confirmed',
        });
      if (error) throw error;

      calendarRef.current.getApi().refetchEvents();
      setSnackbar({ open: true, message: '¡Turno agendado con éxito!', severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: `Error al guardar el turno: ${err.message}`, severity: 'error' });
    }
  };

  // Guarda el ID del evento clickeado para mostrar sus detalles en el panel
  const handleEventClick = (clickInfo) => {
    const eventId = clickInfo.id || clickInfo.event?.id;
    if (eventId) {
      setSelectedEventId(eventId);
    }
  };

  // Elimina un turno de la base de datos
  const handleDeleteAppointment = async (appointmentId) => {
    try {
      const { error } = await supabase.from('appointments').delete().eq('id', appointmentId);
      if (error) throw error;

      calendarRef.current.getApi().refetchEvents();
      setSnackbar({ open: true, message: 'Turno eliminado correctamente.', severity: 'success' });
      setSelectedEventId(null); // Limpiamos el panel de detalles
    } catch (err) {
      setSnackbar({ open: true, message: `Error al eliminar el turno: ${err.message}`, severity: 'error' });
    }
  };

  // Refresca el calendario si llega una nueva cita por WebSocket
  useEffect(() => {
    if (lastMessage !== null) {
      const message = JSON.parse(lastMessage.data);
      if (message.type === 'new_appointment' && message.data.client_id === selectedClientId) {
        calendarRef.current.getApi().refetchEvents();
      }
    }
  }, [lastMessage, selectedClientId]);

  // Carga los eventos para el rango de fechas visible en el calendario
  const handleFetchEvents = useCallback((fetchInfo, successCallback, failureCallback) => {
    if (!selectedClientId) {
      setLoading(false);
      successCallback([]);
      return;
    }

    setLoading(true);
    supabase.rpc('get_appointments_for_range', {
      p_client_id: selectedClientId,
      start_date: fetchInfo.start.toISOString(),
      end_date: fetchInfo.end.toISOString(),
    }).then(({ data, error }) => {
      setLoading(false);
      if (error) {
        setError(`Error cargando los turnos: ${error.message}`);
        failureCallback(error);
      } else {
        const events = data.map(app => ({ id: app.id.toString(), title: app.title, start: app.start_time, end: app.end_time }));
        successCallback(events);
      }
    });
  }, [selectedClientId, supabase]);

  return (
    // --- ¡TU SOLUCIÓN APLICADA! --- Contenedor principal limpio
    <Box sx={{
      height: 'calc(100vh - 64px)',
      display: 'flex',
      flexDirection: 'column',
      p: 0,
      m: 0,
      overflow: 'hidden'
    }}>
      <GlobalStyles styles={(theme) => ({
        '.fc-theme-standard td, .fc-theme-standard th': { borderColor: 'transparent !important' },
        '.fc-scrollgrid': { borderColor: 'transparent !important' },
        '.fc-col-header-cell': { backgroundColor: 'transparent !important' },
        '.fc-daygrid-day-top': {
          height: '100%',
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        },
        '.fc-daygrid-day-number': {
          width: '30px',
          height: '30px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: `${theme.palette.text.secondary} !important`, // Color de número gris oscuro
        },
        '.selected-day .fc-daygrid-day-number': {
          backgroundColor: theme.palette.secondary.main,
          color: `${theme.palette.secondary.contrastText} !important`,
        },
        // --- ¡NUEVO! Círculo relleno para el día de hoy ---
        '.fc-day-today:not(.selected-day) .fc-daygrid-day-number': {
          backgroundColor: theme.palette.grey[200], // Un gris claro para el fondo
          color: `${theme.palette.text.primary} !important`, // Texto oscuro para contraste
        },
        '.fc-daygrid-day-events, .fc-daygrid-day-bottom': {
          display: 'none !important',
        },
        // --- ¡NUEVO! Estilos para una cabecera minimalista ---
        '.fc .fc-toolbar.fc-header-toolbar': {
          marginBottom: '0.5em !important',
        },
        '.fc-toolbar-title': {
          fontSize: '1.25rem !important', // Título más pequeño
          fontWeight: '500',
        },
        '.fc-prev-button, .fc-next-button': {
          background: 'none !important',
          border: 'none !important',
          padding: '0 !important',
          color: `${theme.palette.text.secondary} !important`,
          '&:hover': {
            color: `${theme.palette.text.primary} !important`,
          },
          '& .fc-icon': {
            fontSize: '1.6rem', // Icono de flecha más grande y visible
          }
        },
      })} />
      {/* Cabecera con padding */}
      <Box sx={{ flexShrink: 0, px: 2, pt: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h4" component="h1">
            Agenda de Turnos
          </Typography>
          <Button variant="contained" color="secondary" startIcon={<AddIcon />} onClick={handleOpenNewAppointmentForm}>
            Nuevo Turno
          </Button>
        </Box>
        <Alert severity="info" sx={{ mb: 2 }}>
          Haz clic en un día para ver su agenda en el panel de la derecha.
        </Alert>
      </Box>
      {/* --- ¡SOLUCIÓN DEFINITIVA CON FLEXBOX! --- */}
      <Box sx={{ flexGrow: 1, display: 'flex', gap: 2, overflow: 'hidden', px: 2, pb: 2 }}>
        {/* COLUMNA 1 — CALENDARIO */}
        <Box sx={{ flex: 1, minWidth: 350, height: '100%' }}>
          <Paper sx={{ 
            height: "100%", 
            display: "flex", 
            flexDirection: 'column', 
            overflow: 'hidden',
            borderRadius: '25px', // <-- ¡NUEVO! Mismo radio que la columna azul
          }}>
            {error ? (
              <Alert severity="error">{error}</Alert>
            ) : (
              <Box sx={{ flexGrow: 1, p: 1 }}> {/* Padding mínimo para que no se pegue al borde */}
                <FullCalendar
                  ref={calendarRef}
                  plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                  initialView="dayGridMonth"
                  locale={esLocale}
                  height="100%"
                  expandRows={true}
                  events={handleFetchEvents}
                  dateClick={handleDateClick}
                  eventClick={handleEventClick}
                  dayCellDidMount={handleDayCellDidMount}
                  slotMinTime={businessHours.minTime}
                  slotMaxTime={businessHours.maxTime}
                  headerToolbar={{
                    left: 'prev',      // <-- ¡CORRECCIÓN! Flecha izquierda a la izquierda
                    center: 'title',     // Título en el centro
                    right: 'next'      // Flecha derecha a la derecha
                  }}
                  loading={setLoading}
                />
              </Box>
            )}
            {loading && <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}><CircularProgress /></Box>}
          </Paper>
        </Box>
        {/* COLUMNA 2 — AGENDA DEL DÍA */}
        <Box sx={{ flex: 1, minWidth: 300, height: '100%' }}>
          <DayAgenda selectedDate={selectedDate} onEventClick={handleEventClick} selectedEventId={selectedEventId} />
        </Box>
        {/* COLUMNA 3 — PANEL DE DETALLES */}
        <Box sx={{ flex: 1, minWidth: 300, height: '100%' }}>
          <AppointmentDetailsPanel appointmentId={selectedEventId} onEdit={() => {}} onDelete={handleDeleteAppointment} />
        </Box>
      </Box>

      <AppointmentForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={handleSaveAppointment}
        slotInfo={selectedSlot}
      />

      {/* El diálogo de detalles ya no es necesario, pero lo dejamos por si se quiere reutilizar */}
      <AppointmentDetailsDialog
        open={false} // Deshabilitado
        onClose={() => {}}
        event={null}
        onDelete={handleDeleteAppointment}
      />

      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}

export default CalendarPage;
