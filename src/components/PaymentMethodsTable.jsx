// src/components/PaymentMethodsTable.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Switch,
  Paper, IconButton, CircularProgress, Box, Typography, Alert
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

function PaymentMethodsTable({ keyProp, onEdit }) {
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function fetchMethods() {
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
        .from('payment_methods')
        .select('*')
        .eq('client_id', session.user.id) // <-- Usamos el ID de la sesión
        .order('id', { ascending: true });

      if (error) throw error;
      setMethods(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMethods();
  }, [keyProp]); // Se recarga cuando la key cambia

  const handleToggleActive = async (method) => {
    try {
      const newStatus = !method.is_active;
      const { error } = await supabase
        .from('payment_methods')
        .update({ is_active: newStatus })
        .eq('id', method.id);

      if (error) throw error;

      setMethods(methods.map(m => 
        m.id === method.id ? { ...m, is_active: newStatus } : m
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
        Métodos de Pago
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nombre</TableCell>
              <TableCell align="right">Recargo (%)</TableCell>
              <TableCell align="center">Activo</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {methods.map((method) => (
              <TableRow key={method.id}>
                <TableCell>{method.name}</TableCell>
                <TableCell align="right">{method.surcharge_percentage}%</TableCell>
                <TableCell align="center">
                  <Switch
                    checked={method.is_active}
                    onChange={() => handleToggleActive(method)}
                    color="secondary"
                  />
                </TableCell>
                <TableCell align="center">
                  <IconButton size="small" onClick={() => onEdit(method)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton size="small" onClick={() => alert('Función de eliminar no implementada aún.')}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

export default PaymentMethodsTable;