// src/components/OfferForm.jsx
import { useState, useEffect } from 'react';
import {
  Button, Dialog, DialogActions, DialogContent, DialogTitle, Box,
  TextField, Stack, Typography
} from '@mui/material';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';

const initialState = {
  title: '',
  description: '',
  related_keywords: '',
  valid_until: '', // <-- NUEVO
};

function OfferForm({ open, onClose, onSave, offerToEdit }) {
  const [offer, setOffer] = useState(initialState);

  useEffect(() => {
    if (offerToEdit) {
      setOffer({
        id: offerToEdit.id,
        title: offerToEdit.title || '',
        description: offerToEdit.description || '',
        related_keywords: offerToEdit.related_keywords || '',
        valid_until: offerToEdit.valid_until || '', // <-- NUEVO
      });
    } else {
      setOffer(initialState);
    }
  }, [offerToEdit, open]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setOffer(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    if (!offer.title || !offer.description) {
      alert('El título y la descripción son obligatorios.');
      return;
    }
    // Si la fecha está vacía, la enviamos como null a la base de datos
    const offerToSave = { ...offer, valid_until: offer.valid_until || null };

    onSave(offerToSave);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LocalOfferIcon color="primary" />
          <Typography variant="h6" component="div">
            {offerToEdit ? 'Editar' : 'Crear'} Oferta
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField autoFocus label="Título de la Oferta" name="title" type="text" fullWidth variant="outlined" value={offer.title} onChange={handleChange} required />
          <TextField label="Descripción Detallada" name="description" type="text" fullWidth multiline rows={4} variant="outlined" value={offer.description} onChange={handleChange} required />
          <TextField label="Palabras Clave (separadas por comas)" name="related_keywords" type="text" fullWidth variant="outlined" value={offer.related_keywords} onChange={handleChange} helperText="Ej: descuento, 2x1, envío gratis, liquidación" />
          <TextField
            label="Válido Hasta (Opcional)"
            name="valid_until"
            type="date"
            fullWidth
            variant="outlined"
            value={offer.valid_until}
            onChange={handleChange}
            InputLabelProps={{ shrink: true }}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">Cancelar</Button>
        <Button onClick={handleSave} variant="contained" color="secondary">
          {offerToEdit ? 'Guardar Cambios' : 'Guardar Oferta'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default OfferForm;