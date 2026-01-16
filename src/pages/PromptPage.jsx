import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import {
  Box, Button, TextField, Typography, Paper, Container, Stack,
  CircularProgress, Alert, Snackbar,
  FormControl, InputLabel, Select, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions, IconButton
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';

const NEW_ROLE_PROMPT_TEMPLATE = `Tu única función es... Eres un asistente llamado Martin. Tu objetivo es guiar al cliente paso a paso.

**FILOSOFÍA OBLIGATORIA: "UN DATO A LA VEZ"**
No importa cuánta información te dé el cliente de golpe, tú SIEMPRE procesarás un solo dato a la vez.

**PLAN DE ACCIÓN SECUENCIAL E INQUEBRANTABLE:**

**PASO 1: ...**
*   Tu primera prioridad es...
*   ACCIÓN: ...
*   RESPUESTA: ...

**PASO 2: ...**
*   ...
`;

function PromptPage() {
  const [allRoles, setAllRoles] = useState([]);
  const [currentRole, setCurrentRole] = useState('');
  const [basePrompt, setBasePrompt] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const { selectedClientId } = useOutletContext();

  // Estados para el diálogo de creación de rol
  const [newRoleDialogOpen, setNewRoleDialogOpen] = useState(false);
  const [newRoleData, setNewRoleData] = useState({ role_name: '', role_label: '' });

  // Efecto para cargar los datos iniciales (lista de roles y rol actual del cliente)
  useEffect(() => {
    async function fetchInitialData() {
      if (!selectedClientId) return;
      setLoading(true);
      setError('');
      try {
        // 1. Obtener todas las actividades/roles disponibles
        const { data: rolesData, error: rolesError } = await supabase
          .from('role_prompts')
          .select('role_name, role_label');
        if (rolesError) throw rolesError;
        setAllRoles(rolesData);

        // 2. Obtener el rol actual del cliente
        const { data: clientData, error: clientError } = await supabase
          .from('clients')
          .select('agent_role')
          .eq('id', selectedClientId)
          .single();
        if (clientError) throw clientError;

        const roleName = clientData?.agent_role || rolesData[0]?.role_name || '';
        setCurrentRole(roleName);

      } catch (err) {
        setError(`Error al cargar datos iniciales: ${err.message}`);
      } finally {
        // El loading se setea a false en el siguiente useEffect
      }
    }
    fetchInitialData();
  }, [selectedClientId]);

  // Efecto para cargar el prompt correspondiente cuando cambia el rol seleccionado
  useEffect(() => {
    async function fetchRolePrompt() {
      if (!currentRole) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const { data: roleData, error: roleError } = await supabase
          .from('role_prompts')
          .select('base_prompt')
          .eq('role_name', currentRole)
          .single();
        if (roleError) throw roleError;
        setBasePrompt(roleData?.base_prompt || 'No se encontró un prompt para este rol.');
      } catch (err) {
        setError(`Error al cargar el prompt para el rol: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }
    fetchRolePrompt();
  }, [currentRole]);

  const handleSavePrompt = async () => {
    setSaving(true);
    try {
      if (!selectedClientId) throw new Error("No hay un cliente seleccionado.");

      // 1. Guardar el rol seleccionado en la tabla 'clients'
      const { error: clientUpdateError } = await supabase
        .from('clients')
        .update({ agent_role: currentRole })
        .eq('id', selectedClientId);
      if (clientUpdateError) throw clientUpdateError;

      // 2. Guardar el prompt editado en la tabla 'role_prompts'
      const { error: rolePromptError } = await supabase
        .from('role_prompts')
        .update({ base_prompt: basePrompt })
        .eq('role_name', currentRole);
      if (rolePromptError) throw rolePromptError;

      setSnackbar({ open: true, message: '¡Rol y comportamiento guardados con éxito!', severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: `Error al guardar el prompt: ${err.message}`, severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // Función para guardar la nueva actividad/rol
  const handleSaveNewRole = async () => {
    if (!newRoleData.role_label) {
      setSnackbar({ open: true, message: 'El nombre de la actividad es obligatorio.', severity: 'warning' });
      return;
    }
    setSaving(true);
    try {
      const roleNameInternal = newRoleData.role_label.toLowerCase().replace(/\s+/g, '_');
      const { data, error } = await supabase
        .from('role_prompts')
        .insert({
          role_name: roleNameInternal,
          role_label: newRoleData.role_label,
          base_prompt: NEW_ROLE_PROMPT_TEMPLATE,
        })
        .select()
        .single();

      if (error) throw error;

      setSnackbar({ open: true, message: '¡Nueva actividad creada con éxito!', severity: 'success' });
      setNewRoleDialogOpen(false);
      setNewRoleData({ role_name: '', role_label: '' });

      // Recargar la lista de roles y seleccionar el nuevo
      const { data: rolesData, error: rolesError } = await supabase.from('role_prompts').select('role_name, role_label');
      if (rolesError) throw rolesError;
      setAllRoles(rolesData);
      setCurrentRole(data.role_name);

    } catch (err) {
      setSnackbar({ open: true, message: `Error al crear la actividad: ${err.message}`, severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Container maxWidth={false} sx={{ px: { xs: 2, md: 3 } }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Configuración del Rol del Agente
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Selecciona la actividad principal de tu bot y edita su comportamiento base. Este prompt es el "cerebro" completo de tu agente para la actividad elegida.
      </Typography>

      {loading && <CircularProgress />}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {!loading && !error && (
        <>
          <Paper sx={{ p: 3 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 3 }}>
              <FormControl fullWidth>
                <InputLabel id="role-select-label">Actividad del Agente</InputLabel>
                <Select
                  labelId="role-select-label"
                  value={currentRole}
                  label="Actividad del Agente"
                  onChange={(e) => setCurrentRole(e.target.value)}
                >
                  {allRoles.map((r) => (
                    <MenuItem key={r.role_name} value={r.role_name}>{r.role_label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <IconButton color="secondary" onClick={() => setNewRoleDialogOpen(true)} title="Crear Nueva Actividad">
                <AddCircleOutlineIcon />
              </IconButton>
            </Stack>
            <Typography variant="h6" gutterBottom>Edita el Comportamiento Base (Prompt)</Typography>
            <TextField
              multiline
              rows={25}
              fullWidth
              value={basePrompt}
              onChange={(e) => setBasePrompt(e.target.value)}
              helperText="Este es el prompt completo que define la personalidad y las reglas del bot para la actividad seleccionada."
            />
            <Button
              variant="contained"
              color="primary"
              onClick={handleSavePrompt}
              disabled={saving || loading}
              startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
              sx={{ mt: 2, float: 'right' }}
            >
              {saving ? 'Guardando...' : 'Guardar Rol y Comportamiento'}
            </Button>
          </Paper>
        </>
      )}

      {/* Diálogo para crear una nueva actividad/rol */}
      <Dialog open={newRoleDialogOpen} onClose={() => setNewRoleDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Crear Nueva Actividad de Agente</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              autoFocus
              margin="dense"
              label="Nombre de la Actividad (para el usuario)"
              value={newRoleData.role_label}
              onChange={(e) => setNewRoleData({ ...newRoleData, role_label: e.target.value })}
              helperText="Ej: Asistente de Gimnasio"
              fullWidth
            />
            <TextField
              margin="dense"
              label="Nombre Interno (automático)"
              value={newRoleData.role_label.toLowerCase().replace(/\s+/g, '_')}
              disabled
              fullWidth
              helperText="Se genera automáticamente para uso del sistema."
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewRoleDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleSaveNewRole} variant="contained" disabled={saving}>
            {saving ? <CircularProgress size={24} /> : 'Crear y Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>{snackbar.message}</Alert>
      </Snackbar>
    </Container>
  );
}

export default PromptPage;
