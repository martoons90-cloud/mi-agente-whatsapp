// src/components/OffersTable.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Switch,
  Paper, IconButton, CircularProgress, Box, Typography, Alert,
  Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Button
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

function OffersTable({ onEdit, onRefresh }) {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [offerToDelete, setOfferToDelete] = useState(null);

  async function fetchOffers() {
    try {
      setLoading(true);
      // ¡CORRECCIÓN! Obtenemos el ID del usuario logueado.
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setError("No hay una sesión activa. Por favor, inicia sesión.");
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from('offers')
        .select('*')
        .eq('client_id', session.user.id) // <-- Usamos el ID de la sesión
        .order('id', { ascending: true });

      if (error) throw error;
      setOffers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchOffers();
  }, [onRefresh]); // Se recarga cuando el padre lo indica

  const handleToggleActive = async (offer) => {
    try {
      const newStatus = !offer.is_active;
      const { error } = await supabase
        .from('offers')
        .update({ is_active: newStatus })
        .eq('id', offer.id);

      if (error) throw error;

      setOffers(offers.map(o => 
        o.id === offer.id ? { ...o, is_active: newStatus } : o
      ));
    } catch (err) {
      setError(`Error al cambiar el estado: ${err.message}`);
    }
  };

  const openDeleteDialog = (offer) => {
    setOfferToDelete(offer);
    setDeleteDialogOpen(true);
  };

  const closeDeleteDialog = () => {
    setOfferToDelete(null);
    setDeleteDialogOpen(false);
  };

  const handleDelete = async () => {
    if (!offerToDelete) return;
    try {
      const { error } = await supabase.from('offers').delete().eq('id', offerToDelete.id);
      if (error) throw error;
      onRefresh(); // Llama a la función para recargar la tabla
    } catch (err) {
      setError(err.message);
    } finally {
      closeDeleteDialog();
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
        Ofertas Activas
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Título</TableCell>
              <TableCell>Descripción</TableCell>
              <TableCell>Palabras Clave</TableCell>
              <TableCell align="center">Activa</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {offers.map((offer) => (
              <TableRow key={offer.id}>
                <TableCell>{offer.title}</TableCell>
                <TableCell>{offer.description}</TableCell>
                <TableCell>{offer.related_keywords}</TableCell>
                <TableCell align="center">
                  <Switch
                    checked={offer.is_active}
                    onChange={() => handleToggleActive(offer)}
                    color="secondary"
                  />
                </TableCell>
                <TableCell align="center">
                  <IconButton size="small" onClick={() => onEdit(offer)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton size="small" onClick={() => openDeleteDialog(offer)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Diálogo de Confirmación para Eliminar */}
      <Dialog open={deleteDialogOpen} onClose={closeDeleteDialog}>
        <DialogTitle>Confirmar Eliminación</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Estás seguro de que quieres eliminar la oferta "{offerToDelete?.title}"? Esta acción no se puede deshacer.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDeleteDialog}>Cancelar</Button>
          <Button onClick={handleDelete} color="error" autoFocus>Eliminar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default OffersTable;