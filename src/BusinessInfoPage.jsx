// src/pages/SettingsPage.jsx
import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom'; // <-- ¡NUEVO! Para recibir el cliente seleccionado
import { supabase } from './supabaseClient';
import {
  Typography, Box, Paper, TextField, Button, CircularProgress, Alert, Stack, Snackbar, 
  FormControlLabel, Switch, Avatar, Divider, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, Grid
} from '@mui/material';
import CategoryForm from './components/CategoryForm.jsx';

// --- ¡NUEVO! ---
const daysOfWeek = [
  { key: '1', label: 'Lunes' },
  { key: '2', label: 'Martes' },
  { key: '3', label: 'Miércoles' },
  { key: '4', label: 'Jueves' },
  { key: '5', label: 'Viernes' },
  { key: '6', label: 'Sábado' },
  { key: '0', label: 'Domingo' },
];

function BusinessInfoPage() {
  const [info, setInfo] = useState({ name: '', address: '', hours: '', phone: '', location_url: '', directions: '', logo_url: '', quote_includes_vat: true, time_format: '24h' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isNewInfo, setIsNewInfo] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const { selectedClientId } = useOutletContext(); // <-- ¡NUEVO! Obtenemos el ID del cliente

  // --- NUEVO: Estados para las categorías ---
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [categoryFormOpen, setCategoryFormOpen] = useState(false);
  const [workHours, setWorkHours] = useState(
    daysOfWeek.reduce((acc, day) => {
      acc[day.key] = { enabled: false, start: '09:00', end: '18:00' };
      return acc;
    }, {})
  );
  // -----------------------------------------

  useEffect(() => {
    async function fetchInfo() {
      if (!selectedClientId) return; // No hacer nada si no hay cliente seleccionado
      setLoading(true);
      setError('');
      setInfo({ name: '', address: '', hours: '', phone: '', location_url: '', directions: '', logo_url: '', quote_includes_vat: true, time_format: '24h' }); // Resetear
      setIsNewInfo(false);
      try {
 
        const { data, error } = await supabase
          .from('business_info')
          .select('*')
          .eq('client_id', selectedClientId) // <-- ¡CAMBIO CLAVE! Usamos el ID del cliente seleccionado
          .limit(1)
          .single();
 
        if (error && error.code !== 'PGRST116') throw error; // Ignorar error si no encuentra la fila
 
        if (data) {
          setInfo(data);
          // --- ¡NUEVO! Cargar los horarios de trabajo ---
          if (data.work_hours) {
            const loadedHours = { ...workHours };
            for (const dayKey in data.work_hours) {
              loadedHours[dayKey] = { ...loadedHours[dayKey], ...data.work_hours[dayKey], enabled: true };
            }
            setWorkHours(loadedHours);
          }
        } else {
          setIsNewInfo(true); // Si no hay datos, es para crear
        }
 
      } catch (err) {
        setError(`Error al cargar la información: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }
    fetchInfo();
  }, [selectedClientId]); // <-- ¡CAMBIO CLAVE! Se ejecuta cada vez que cambia el cliente seleccionado

  // --- NUEVO: Efecto para cargar las categorías ---
  const fetchCategories = async () => {
    if (!selectedClientId) return;
    try {
      setLoadingCategories(true);
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('client_id', selectedClientId)
        .order('name', { ascending: true });

      if (error) throw error;
      setCategories(data);
    } catch (error) {
      setSnackbar({ open: true, message: `Error al cargar categorías: ${error.message}`, severity: 'error' });
    } finally {
      setLoadingCategories(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [selectedClientId]);
  // ---------------------------------------------

  const handleInfoChange = (e) => {
    const { name, value } = e.target;
    setInfo(prev => ({ ...prev, [name]: value }));
  };
 
  const handleVatChange = (e) => {
    setInfo(prev => ({ ...prev, quote_includes_vat: e.target.checked }));
  };

  const handleTimeFormatChange = (e) => {
    const newFormat = e.target.checked ? '12h' : '24h';
    setInfo(prev => ({ ...prev, time_format: newFormat }));
  };

  // --- ¡NUEVO! Handler para los horarios ---
  const handleWorkHoursChange = (dayKey, field, value) => {
    setWorkHours(prev => ({
      ...prev,
      [dayKey]: {
        ...prev[dayKey],
        [field]: value,
      }
    }));
  };
  const handleDayToggle = (dayKey) => {
    const currentStatus = workHours[dayKey].enabled;
    handleWorkHoursChange(dayKey, 'enabled', !currentStatus);
  };

  const handleLogoUpload = async (event) => {
    try {
      setLoading(true);
      const file = event.target.files[0];
      if (!file) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `${selectedClientId}-${Date.now()}.${fileExt}`; // Usamos el ID del cliente seleccionado
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage.from('logos').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(filePath);
      setInfo(prev => ({ ...prev, logo_url: publicUrl }));

    } catch (err) {
      setSnackbar({ open: true, message: `Error al subir el logo: ${err.message}`, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveInfo = async () => {
    setLoading(true);
    setError('');
    try {
 
      // --- ¡NUEVO! Preparamos el JSON de horarios para guardar ---
      const hoursToSave = {};
      for (const dayKey in workHours) {
        if (workHours[dayKey].enabled) {
          hoursToSave[dayKey] = {
            start: workHours[dayKey].start,
            end: workHours[dayKey].end,
          };
        }
      }
      const infoData = {
        client_id: selectedClientId, // <-- ¡CAMBIO CLAVE!
        name: info.name,
        address: info.address,
        hours: info.hours,
        phone: info.phone,
        location_url: info.location_url,
        directions: info.directions,
        logo_url: info.logo_url,
        quote_includes_vat: info.quote_includes_vat,
        time_format: info.time_format, // <-- ¡NUEVO! Guardamos el formato de hora
        work_hours: hoursToSave, // <-- ¡NUEVO!
      };
 
      if (isNewInfo) {
        // Crear nueva información
        const { error } = await supabase.from('business_info').insert([infoData]);
        if (error) throw error;
        setIsNewInfo(false); // Ya no es nueva
      } else {
        // Actualizar información existente
        const { client_id, ...updateData } = infoData; // No se puede actualizar la columna client_id
        const { error } = await supabase.from('business_info').update(updateData).eq('client_id', selectedClientId);
        if (error) throw error;
      }
      setSnackbar({ open: true, message: '¡Información del comercio guardada con éxito!', severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: `Error al guardar: ${err.message}`, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // --- NUEVO: Lógica para guardar categorías ---
  const handleSaveCategory = async (categoryData) => {
    try {
      if (!selectedClientId) throw new Error("No hay un cliente seleccionado.");

      const { error } = await supabase.from('categories').insert({
        ...categoryData,
        client_id: selectedClientId,
      });

      if (error) {
        if (error.code === '23505') throw new Error(`La categoría "${categoryData.name}" ya existe.`);
        throw error;
      }

      setSnackbar({ open: true, message: '¡Categoría guardada con éxito!', severity: 'success' });
      fetchCategories(); // Recargar la lista
    } catch (error) {
      setSnackbar({ open: true, message: `Error: ${error.message}`, severity: 'error' });
    }
  };
 
  return (
    <>
      <Typography variant="h4" component="h1" gutterBottom>
        Configuración del Negocio
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {!loading && (
        <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>Información del Comercio</Typography>
        <Stack spacing={3} sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar src={info.logo_url} sx={{ width: 80, height: 80 }} variant="rounded">
              {!info.logo_url && 'Logo'}
            </Avatar>
            <Button variant="outlined" component="label" color="secondary" disabled={loading}>
              Subir Logo
              <input type="file" hidden onChange={handleLogoUpload} accept="image/png, image/jpeg" />
            </Button>
          </Box>
          <TextField label="Nombre del Comercio" name="name" value={info.name} onChange={handleInfoChange} fullWidth />
          <TextField label="Dirección" name="address" value={info.address} onChange={handleInfoChange} fullWidth />
          <TextField label="Horarios de Atención" name="hours" value={info.hours} onChange={handleInfoChange} fullWidth />
          <TextField label="Teléfono de Contacto" name="phone" value={info.phone} onChange={handleInfoChange} fullWidth />
          <TextField label="Link de Google Maps" name="location_url" value={info.location_url || ''} onChange={handleInfoChange} fullWidth placeholder="https://maps.app.goo.gl/..." />
          <TextField label="Indicaciones Adicionales (Opcional)" name="directions" value={info.directions || ''} onChange={handleInfoChange} fullWidth multiline rows={3} placeholder="Ej: Toca el timbre rojo, local con puerta de vidrio." />
          <FormControlLabel
            control={<Switch checked={info.quote_includes_vat} onChange={handleVatChange} color="secondary" />}
            label="Incluir desglose de IVA (21%) en las cotizaciones"
          />
          {/* --- ¡NUEVO INTERRUPTOR DE FORMATO DE HORA! --- */}
          <FormControlLabel
            control={<Switch checked={info.time_format === '12h'} onChange={handleTimeFormatChange} color="secondary" />}
            label="Usar formato de 12 horas (AM/PM) en toda la aplicación"
          />

        </Stack>

        <Divider sx={{ my: 3 }} />

        {/* --- ¡NUEVA SECCIÓN DE HORARIOS! --- */}
        <Typography variant="h6" gutterBottom>Horarios de Atención</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Define los horarios en los que el bot podrá agendar turnos. Si un día no está habilitado, el bot lo considerará cerrado.
        </Typography>
        <Stack spacing={2}>
          {daysOfWeek.map(day => (
            <Grid container spacing={2} alignItems="center" key={day.key}>
              <Grid item xs={12} sm={3}>
                <FormControlLabel
                  control={<Switch checked={workHours[day.key].enabled} onChange={() => handleDayToggle(day.key)} color="secondary" />}
                  label={day.label}
                />
              </Grid>
              <Grid item xs={6} sm={4}>
                <TextField type="time" label="Desde" fullWidth disabled={!workHours[day.key].enabled} value={workHours[day.key].start} onChange={(e) => handleWorkHoursChange(day.key, 'start', e.target.value)} InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid item xs={6} sm={4}>
                <TextField type="time" label="Hasta" fullWidth disabled={!workHours[day.key].enabled} value={workHours[day.key].end} onChange={(e) => handleWorkHoursChange(day.key, 'end', e.target.value)} InputLabelProps={{ shrink: true }} />
              </Grid>
            </Grid>
          ))}
        </Stack>

        <Box sx={{ textAlign: 'right', mt: 3 }}>
          <Button variant="contained" color="secondary" onClick={handleSaveInfo} disabled={loading}>
            {loading ? <CircularProgress size={24} /> : 'Guardar Toda la Configuración'}
          </Button>
        </Box>

        </Paper>
      )}

      <Divider sx={{ my: 4 }} />

      {/* --- NUEVA SECCIÓN DE CATEGORÍAS --- */}
      <Typography variant="h6" gutterBottom>Gestión de Categorías</Typography>
      <Paper sx={{ p: 3, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="body1">
            Define las categorías para organizar tus productos.
          </Typography>
          <Button variant="contained" color="secondary" onClick={() => setCategoryFormOpen(true)}>
            Crear Categoría
          </Button>
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Nombre</TableCell>
                <TableCell>Color</TableCell>
                <TableCell>Vista Previa</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loadingCategories ? (
                <TableRow><TableCell colSpan={3}><CircularProgress size={24} /></TableCell></TableRow>
              ) : (
                categories.map((cat) => (
                  <TableRow key={cat.id}>
                    <TableCell>{cat.name}</TableCell>
                    <TableCell>{cat.color}</TableCell>
                    <TableCell>
                      <Chip label={cat.name} style={{ backgroundColor: cat.color, color: '#fff' }} size="small" />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <CategoryForm open={categoryFormOpen} onClose={() => setCategoryFormOpen(false)} onSave={handleSaveCategory} />
      {/* ------------------------------------ */}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}

export default BusinessInfoPage;
