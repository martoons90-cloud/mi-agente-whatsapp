// src/components/VehicleTable.jsx
import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Switch,
  Paper, IconButton, CircularProgress, Box, Typography, Alert, Chip,
  Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Button
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

function VehicleTable({ tableKey, onEdit }) {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [vehicleToDelete, setVehicleToDelete] = useState(null);
  const { selectedClientId } = useOutletContext();

  async function fetchVehicles() {
    try {
      setLoading(true);
      setError(null);
      if (!selectedClientId) return;

      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('client_id', selectedClientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVehicles(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchVehicles();
  }, [tableKey, selectedClientId]);

  const openDeleteDialog = (vehicle) => {
    setVehicleToDelete(vehicle);
    setDeleteDialogOpen(true);
  };

  const closeDeleteDialog = () => {
    setVehicleToDelete(null);
    setDeleteDialogOpen(false);
  };

  const handleDelete = async () => {
    if (!vehicleToDelete) return;
    try {
      const { error } = await supabase
        .from('vehicles')
        .delete()
        .eq('id', vehicleToDelete.id);

      if (error) throw error;

      // Refresca la lista de productos
      fetchVehicles();
    } catch (err) {
      setError(err.message);
    } finally {
      closeDeleteDialog();
    }
  };

  const handleToggleActive = async (vehicle) => {
    try {
      const newStatus = !vehicle.is_active;
      const { error } = await supabase
        .from('vehicles')
        .update({ is_active: newStatus })
        .eq('id', vehicle.id);

      if (error) throw error;

      // Actualiza el estado local para un feedback visual inmediato
      setVehicles(vehicles.map(v =>
        v.id === vehicle.id ? { ...v, is_active: newStatus } : v
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
        <Table sx={{ minWidth: 650 }} aria-label="simple table" size="small">
          <TableHead>
            <TableRow>
              <TableCell>Vehículo</TableCell> {/* Make + Model + Year */}
              <TableCell>KM</TableCell>
              <TableCell>Transmisión</TableCell>
              <TableCell align="right">Precio</TableCell>
              <TableCell align="center">Estado</TableCell>
              <TableCell align="center">Activo</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {vehicles.map((vehicle) => (
              <TableRow key={vehicle.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                <TableCell component="th" scope="row">
                  <Typography variant="subtitle2" fontWeight="bold">
                    {vehicle.make} {vehicle.model}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {vehicle.year}
                  </Typography>
                </TableCell>
                <TableCell>{vehicle.mileage?.toLocaleString()} km</TableCell>
                <TableCell>{vehicle.transmission}</TableCell>
                <TableCell align="right">{vehicle.currency || 'USD'} {vehicle.price?.toLocaleString()}</TableCell>
                <TableCell align="center">
                  <Chip
                    label={vehicle.status || 'Disponible'}
                    color={vehicle.status === 'sold' ? 'error' : vehicle.status === 'reserved' ? 'warning' : 'success'}
                    size="small"
                  />
                </TableCell>
                <TableCell align="center">
                  <Switch
                    checked={vehicle.is_active}
                    onChange={() => handleToggleActive(vehicle)}
                    size="small"
                    color="secondary"
                  />
                </TableCell>
                <TableCell align="center">
                  <IconButton size="small" onClick={() => onEdit(vehicle)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton size="small" onClick={() => openDeleteDialog(vehicle)}>
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
            ¿Estás seguro de que quieres eliminar el vehículo "{vehicleToDelete?.make} {vehicleToDelete?.model}"? Esta acción no se puede deshacer.
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

export default VehicleTable;
