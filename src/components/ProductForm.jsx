// c:\Users\Martin\Proyecto_bot\mi-agente-whatsapp\src\components\ProductForm.jsx
import { useState, useEffect } from 'react';
import {
  Button, Dialog, DialogActions, DialogContent, DialogTitle, Box,
  TextField, Stack, Typography, InputAdornment, Select, MenuItem, FormControl, InputLabel,
  IconButton, Snackbar, Alert
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import AddIcon from '@mui/icons-material/Add';
import { supabase } from '../supabaseClient';
import { useOutletContext } from 'react-router-dom';
import CategoryForm from './CategoryForm.jsx';

const initialState = {
  name: '',
  description: '',
  price: '',
  stock: '',
  category_id: '', // Usamos el ID de la categoría
  is_active: true,
  duration_minutes: '', // <-- ¡NUEVO!
  unit: 'unidad',
};

function ProductForm({ open, onClose, onSave, productToEdit }) {
  const [product, setProduct] = useState(initialState);
  const [categories, setCategories] = useState([]);
  const [categoryFormOpen, setCategoryFormOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const { selectedClientId } = useOutletContext();

  const fetchCategories = async () => {
    if (!selectedClientId) return;
    const { data } = await supabase
      .from('categories')
      .select('id, name')
      .eq('client_id', selectedClientId)
      .order('name', { ascending: true });
    setCategories(data || []);
  };

  useEffect(() => {
    if (open) { // Solo ejecutar cuando el diálogo se abre
      fetchCategories();
      // --- ¡CORRECCIÓN CLAVE! ---
      // Si hay un producto para editar, lo cargamos en el estado del formulario.
      // Si no, reseteamos el formulario a su estado inicial.
      if (productToEdit) {
        setProduct(productToEdit);
      } else {
        setProduct(initialState);
      }
    }
  }, [productToEdit, open]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProduct(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!product.name || !product.price || !product.unit) {
      alert('El nombre, el precio y la unidad de medida son obligatorios.');
      return;
    }
    const selectedCategory = categories.find(c => c.id === product.category_id);

    const productData = {
      ...product,
      category_name: selectedCategory?.name || '', // Pasamos el nombre para el embedding
      price: parseFloat(product.price) || 0,
      stock: parseInt(product.stock, 10) || 0,
      duration_minutes: parseInt(product.duration_minutes, 10) || null, // <-- ¡NUEVO!
    };

    onSave(productData);
    onClose();
  };

  const handleSaveCategory = async (categoryData) => {
    try {
      if (!selectedClientId) throw new Error("No hay un cliente seleccionado.");

      const { data, error } = await supabase.from('categories').insert({
        ...categoryData,
        client_id: selectedClientId,
      }).select().single();

      if (error) {
        if (error.code === '23505') throw new Error(`La categoría "${categoryData.name}" ya existe.`);
        throw error;
      }

      setSnackbar({ open: true, message: '¡Categoría creada!', severity: 'success' });
      await fetchCategories();
      setProduct(prev => ({ ...prev, category_id: data.id }));
    } catch (error) {
      setSnackbar({ open: true, message: `Error: ${error.message}`, severity: 'error' });
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AddCircleOutlineIcon color="primary" />
            <Typography variant="h6" component="div">
              {productToEdit ? 'Editar Producto' : 'Agregar Nuevo Producto'}
            </Typography>
          </Box>
        </DialogTitle>
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
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <FormControl fullWidth>
                  <InputLabel id="category-select-label">Categoría</InputLabel>
                  <Select
                    labelId="category-select-label"
                    name="category_id"
                    value={product.category_id || ''}
                    label="Categoría"
                    onChange={handleChange}
                  >
                    <MenuItem value=""><em>Sin categoría</em></MenuItem>
                    {categories.map((cat) => (
                      <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <IconButton onClick={() => setCategoryFormOpen(true)} color="secondary" title="Crear nueva categoría">
                  <AddIcon />
                </IconButton>
              </Box>
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
              <TextField
                label="Duración del Servicio (minutos)"
                name="duration_minutes"
                type="number"
                fullWidth
                variant="outlined"
                value={product.duration_minutes || ''}
                onChange={handleChange}
                helperText="Opcional. Rellena solo si es un servicio agendable. Ej: 60"
                InputProps={{
                  endAdornment: <InputAdornment position="end">min</InputAdornment>,
                }}
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

      <CategoryForm
        open={categoryFormOpen}
        onClose={() => setCategoryFormOpen(false)}
        onSave={handleSaveCategory}
      />
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>{snackbar.message}</Alert>
      </Snackbar>
    </>
  );
}

export default ProductForm;
