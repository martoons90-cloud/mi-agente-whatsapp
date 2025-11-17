// src/components/ProductTable.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Switch,
  Paper, IconButton, CircularProgress, Box, Typography, Alert,
  Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Button
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

function ProductTable() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);

  async function fetchProducts() {
    try {
      setLoading(true);
      setError(null);
      // ¡CORRECCIÓN! Obtenemos el ID del usuario logueado, es más seguro.
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setError("No hay una sesión activa. Por favor, inicia sesión.");
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('client_id', session.user.id) // <-- Usamos el ID de la sesión
        .order('id', { ascending: true });

      if (error) throw error;
      setProducts(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProducts();
  }, []);

  const openDeleteDialog = (product) => {
    setProductToDelete(product);
    setDeleteDialogOpen(true);
  };

  const closeDeleteDialog = () => {
    setProductToDelete(null);
    setDeleteDialogOpen(false);
  };

  const handleDelete = async () => {
    if (!productToDelete) return;
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productToDelete.id);

      if (error) throw error;
      
      // Refresca la lista de productos
      fetchProducts();
    } catch (err) {
      setError(err.message);
    } finally {
      closeDeleteDialog();
    }
  };

  const handleToggleActive = async (product) => {
    try {
      const newStatus = !product.is_active;
      const { error } = await supabase
        .from('products')
        .update({ is_active: newStatus })
        .eq('id', product.id);

      if (error) throw error;

      // Actualiza el estado local para un feedback visual inmediato
      setProducts(products.map(p => 
        p.id === product.id ? { ...p, is_active: newStatus } : p
      ));
    } catch (err) {
      setError(`Error al cambiar el estado: ${err.message}`);
    }
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}><CircularProgress /></Box>;
  }

  if (error) {
    return <Alert severity="error" sx={{ mt: 2 }}>Error: {error}</Alert>;
  }

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h6" component="h3" gutterBottom>
        Inventario Actual
      </Typography>
      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }} aria-label="simple table">
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Nombre</TableCell>
              <TableCell>Descripción</TableCell>
              <TableCell align="right">Precio</TableCell>
              <TableCell>Unidad</TableCell>
              <TableCell align="right">Stock</TableCell>
              <TableCell align="center">Activo</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                <TableCell component="th" scope="row">{product.id}</TableCell>
                <TableCell>{product.name}</TableCell>
                <TableCell>{product.description}</TableCell>
                <TableCell align="right">${product.price?.toFixed(2)}</TableCell>
                <TableCell>{product.unit}</TableCell>
                <TableCell align="right">{product.stock}</TableCell>
                <TableCell align="center">
                  <Switch
                    checked={product.is_active}
                    onChange={() => handleToggleActive(product)}
                    color="secondary"
                  />
                </TableCell>
                <TableCell align="center">
                  <IconButton size="small" onClick={() => alert('Función de editar no implementada aún.')}>
                    <EditIcon />
                  </IconButton>
                  <IconButton size="small" onClick={() => openDeleteDialog(product)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Diálogo de Confirmación para Eliminar */}
      <Dialog
        open={deleteDialogOpen}
        onClose={closeDeleteDialog}
      >
        <DialogTitle>Confirmar Eliminación</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Estás seguro de que quieres eliminar el producto "{productToDelete?.name}"? Esta acción no se puede deshacer.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDeleteDialog}>Cancelar</Button>
          <Button onClick={handleDelete} color="error" autoFocus>
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default ProductTable;
