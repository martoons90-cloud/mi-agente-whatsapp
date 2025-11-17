// c:\Users\Martin\Proyecto_bot\mi-agente-whatsapp\src\components\ProductForm.jsx
import { useState, useEffect } from 'react';
import {
  Button, Dialog, DialogActions, DialogContent, DialogTitle, Box,
  TextField, Stack, Typography, InputAdornment
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';

const initialState = {
  name: '',
  description: '',
  price: '',
  stock: '',
  is_active: true, // <-- Añadimos is_active al estado inicial
  unit: 'unidad', // Añadimos un valor por defecto
};

function ProductForm({ open, onClose, onSave, productToEdit }) {
  const [product, setProduct] = useState(initialState);

  useEffect(() => {
    if (productToEdit) {
      setProduct(productToEdit);
    } else {
      setProduct(initialState);
    }
  }, [productToEdit, open]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProduct(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Validación simple antes de guardar
    if (!product.name || !product.price || !product.unit) {
      alert('El nombre, el precio y la unidad de medida son obligatorios.'); // Puedes reemplazar esto con un Snackbar si prefieres
      return;
    }

    // ¡CORRECCIÓN CLAVE! Construimos el objeto de datos explícitamente
    // para asegurar que todos los campos, incluido is_active, se manejen correctamente.
    const productData = {
      name: product.name,
      description: product.description,
      price: parseFloat(product.price) || 0,
      stock: parseInt(product.stock, 10) || 0,
      unit: product.unit,
      is_active: productToEdit ? product.is_active : true, // Si es nuevo, siempre es true. Si se edita, respeta su valor.
    };

    // ¡Llamada a la función del componente padre!
    onSave(productData);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AddCircleOutlineIcon color="primary" />
          <Typography variant="h6" component="div">
            {productToEdit ? 'Editar Producto' : 'Agregar Nuevo Producto'}
          </Typography>
        </Box>
      </DialogTitle>
      {/* Usamos un componente <form> para un manejo semántico y accesible */}
      <Box component="form" onSubmit={handleSubmit}>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            autoFocus
            label="Nombre del Producto"
            name="name"
            type="text"
            fullWidth
            variant="outlined"
            value={product.name}
            onChange={handleChange}
            required
          />
          <TextField
            label="Descripción"
            name="description"
            type="text"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={product.description}
            onChange={handleChange}
          />
          <TextField
            label="Unidad de Medida"
            name="unit"
            type="text"
            fullWidth
            variant="outlined"
            value={product.unit}
            onChange={handleChange}
            required
            helperText="Ej: unidad, metro, kg, rollo, caja"
          />
          <TextField
            label="Precio"
            name="price"
            type="number"
            fullWidth
            variant="outlined"
            value={product.price}
            onChange={handleChange}
            required
            InputProps={{
              startAdornment: <InputAdornment position="start">$</InputAdornment>,
            }}
          />
          <TextField
            label="Stock"
            name="stock"
            type="number"
            fullWidth
            variant="outlined"
            value={product.stock}
            onChange={handleChange}
            required
          />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: '0 24px 20px' }}>
          <Button onClick={onClose} color="inherit">Cancelar</Button>
          <Button type="submit" variant="contained" color="secondary">
            {productToEdit ? 'Guardar Cambios' : 'Guardar Producto'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

export default ProductForm;
