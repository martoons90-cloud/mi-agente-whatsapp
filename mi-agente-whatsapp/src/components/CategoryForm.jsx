// src/components/CategoryForm.jsx
import { useState } from 'react';
import {
  Button, Dialog, DialogActions, DialogContent, DialogTitle,
  TextField, Stack, Box
} from '@mui/material';

const initialState = { name: '', color: '#808080' };

function CategoryForm({ open, onClose, onSave }) {
  const [category, setCategory] = useState(initialState);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCategory(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!category.name) {
      alert('El nombre es obligatorio.');
      return;
    }
    onSave(category);
    onClose();
    setCategory(initialState); // Reset form
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Nueva Categoría</DialogTitle>
      <Box component="form" onSubmit={handleSubmit}>
        <DialogContent>
          <Stack spacing={3} sx={{ pt: 1 }}>
            <TextField
              autoFocus
              label="Nombre de la Categoría"
              name="name"
              type="text"
              fullWidth
              value={category.name}
              onChange={handleChange}
              required
            />
            <TextField
              label="Color"
              name="color"
              type="color" // ¡Esto crea un selector de color nativo!
              fullWidth
              value={category.color}
              onChange={handleChange}
              helperText="Elige un color para la etiqueta"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="contained">Guardar</Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

export default CategoryForm;