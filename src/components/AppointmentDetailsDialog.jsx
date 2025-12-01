// src/components/AppointmentDetailsDialog.jsx
import { useOutletContext } from 'react-router-dom';
import {
  Button, Dialog, DialogActions, DialogContent, DialogTitle, Box,
  Typography, Divider
} from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import DeleteIcon from '@mui/icons-material/Delete';

const timeOptions12h = { hour: 'numeric', minute: '2-digit', hour12: true };
const timeOptions24h = { hour: 'numeric', minute: '2-digit', hour12: false };

function AppointmentDetailsDialog({ open, onClose, event, onDelete }) {
  const { timeFormat } = useOutletContext(); // <-- ¡NUEVO!
  const timeOptions = timeFormat === '12h' ? timeOptions12h : timeOptions24h;

  if (!event) return null;

  const handleDelete = () => {
    // Pedimos una confirmación antes de borrar
    if (window.confirm('¿Estás seguro de que quieres eliminar este turno? Esta acción no se puede deshacer.')) {
      onDelete(event.id);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <EventIcon />
        Detalles del Turno
      </DialogTitle>
      <DialogContent>
        <Typography variant="h6" gutterBottom>{event.title}</Typography>
        <Divider sx={{ my: 2 }} />
        <Typography variant="body1">
          <strong>Desde:</strong> {event.start.toLocaleString('es-AR', { ...timeOptions, day: '2-digit', month: '2-digit', year: 'numeric' })}
        </Typography>
        <Typography variant="body1">
          <strong>Hasta:</strong> {event.end.toLocaleString('es-AR', { ...timeOptions, day: '2-digit', month: '2-digit', year: 'numeric' })}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'space-between', p: '0 24px 20px' }}>
        <Button 
          onClick={handleDelete} 
          color="error" 
          variant="outlined"
          startIcon={<DeleteIcon />}
        >
          Eliminar
        </Button>
        <Button onClick={onClose} variant="contained">Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
}

export default AppointmentDetailsDialog;