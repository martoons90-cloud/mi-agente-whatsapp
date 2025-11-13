// src/components/ProductForm.jsx
import { useState } from 'react';
import {
  Button, Dialog, DialogActions, DialogContent, DialogTitle, Box,
  TextField, Stack, Typography
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';

function ProductForm({ open, onClose, onSave }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');

  const handleSave = () => {
    // Validación simple
    if (!name || !price) {
      alert('El nombre y el precio son obligatorios.');
      return;
    }

    const newProduct = {
      name,
      description,
      price: parseFloat(price) || 0,
      stock: parseInt(stock, 10) || 0,
    };

    onSave(newProduct);
    handleClose();
  };

  const handleClose = () => {
    // Limpiar el formulario al cerrar
    setName('');
    setDescription('');
    setPrice('');
    setStock('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AddCircleOutlineIcon color="primary" />
          <Typography variant="h6" component="div">Agregar Nuevo Producto</Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            autoFocus
            label="Nombre del Producto"
            type="text"
            fullWidth
            variant="outlined"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <TextField
            label="Descripción"
            type="text"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <TextField
            label="Precio"
            type="number"
            fullWidth
            variant="outlined"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
          />
          <TextField
            label="Stock"
            type="number"
            fullWidth
            variant="outlined"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} color="inherit">Cancelar</Button>
        <Button onClick={handleSave} variant="contained" color="secondary">Guardar</Button>
      </DialogActions>
    </Dialog>
  );
}

export default ProductForm;
