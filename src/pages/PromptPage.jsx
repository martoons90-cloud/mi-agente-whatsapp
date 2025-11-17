import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import {
  Box, Button, TextField, Typography, Grid, Paper, Container,
  List, ListItem, ListItemIcon, ListItemText, CircularProgress, Alert, Snackbar, Divider,
  FormControl, InputLabel, Select, MenuItem, Accordion, AccordionSummary, AccordionDetails, Stack
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SaveIcon from '@mui/icons-material/Save';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';

const ADMIN_PASSWORD = "admin"; // Contraseña simple para desbloquear.

const agentRoles = [
  { value: 'product_seller', label: 'Vendedor de Productos' },
  { value: 'appointment_scheduler', label: 'Agendador de Turnos' },
  { value: 'real_estate', label: 'Agente Inmobiliario' },
];

const roleLabels = {
  product_seller: 'Vendedor de Productos',
  appointment_scheduler: 'Agendador de Turnos',
  real_estate: 'Agente Inmobiliario',
};

const DEFAULT_PROMPT = `Aquí puedes definir la personalidad y las reglas específicas de tu agente.
- Por ejemplo: "Siempre saluda al cliente por su nombre si lo sabes."
- O: "Ofrece un 5% de descuento en la primera compra."`.trim();

function PromptPage() {
  const [userRequest, setUserRequest] = useState('');
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [role, setRole] = useState('product_seller'); // <-- NUEVO: Estado para el rol
  const [rolePrompts, setRolePrompts] = useState([]); // <-- NUEVO: Para los prompts base de cada rol
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingRole, setSavingRole] = useState({}); // <-- NUEVO: para el estado de guardado de cada rol
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false); // <-- NUEVO: Para el editor de roles
  const [password, setPassword] = useState(''); // <-- NUEVO: Para la contraseña
  const [initialLoad, setInitialLoad] = useState(true); // <-- NUEVO: Para controlar la carga inicial
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    async function fetchPrompt() {
      setLoading(true);
      setError('');
      try {        
        // ¡CORRECCIÓN! Obtenemos el ID del usuario logueado, es más seguro.
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) throw new Error("No hay una sesión activa. Por favor, inicia sesión.");
        const currentUserId = session.user.id;

        const { data, error } = await supabase
          .from('clients') // <-- CORRECCIÓN: Leemos de la tabla 'clients'
          .select('agent_config, role') // <-- Leemos también el rol
          .eq('id', currentUserId) // <-- Usamos el ID del usuario
          .single();

        if (error && error.code !== 'PGRST116') throw error; // Ignorar si no encuentra la fila

        if (data) {          
          setGeneratedPrompt(data.agent_config?.prompt || DEFAULT_PROMPT);
          setRole(data.role || 'product_seller'); // <-- Establecemos el rol
        } else if (initialLoad) { // <-- CAMBIO: Solo usar el prompt por defecto en la carga inicial
          setGeneratedPrompt(DEFAULT_PROMPT);
        }
      } catch (err) {
        setError(`Error al cargar el prompt: ${err.message}`);
      }

      // Cargar los prompts base de todos los roles
      try {
        const { data, error } = await supabase
          .from('role_prompts')
          .select('*');
        
        if (error) throw error;
        
        setRolePrompts(data);
      } catch (err) {
        setError(prev => `${prev}\nError al cargar los prompts de rol: ${err.message}`);
      } finally {
        setLoading(false);
        if (initialLoad) {
          setInitialLoad(false); // <-- Marcar que la carga inicial ha terminado
        }
      }
    }
    fetchPrompt();
  }, []);

  const handleGeneratePrompt = async () => {
    if (!userRequest) return;
    setGenerating(true);
    try {      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error("No hay una sesión activa.");
      const clientId = session.user.id;
      
      // ¡Llamada a la nueva Edge Function!
      const { data, error } = await supabase.functions.invoke('generate-prompt-rule', {
        body: { userRequest, clientId },
      });

      if (error) throw error;

      // Añadimos la regla generada por la IA al prompt actual
      const newPrompt = `${generatedPrompt}\n${data.rule}`;
      setGeneratedPrompt(newPrompt);
      setUserRequest(''); // Limpiamos el input del usuario

    } catch (err) {
      setSnackbar({ open: true, message: `Error al generar la regla: ${err.message}`, severity: 'error' });
    } finally {
      setGenerating(false);
    }
  };

  const handleSavePrompt = async () => {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error("No hay una sesión activa.");
      const clientId = session.user.id;

      const { error } = await supabase
        .from('clients') // <-- CORRECCIÓN: Guardamos en la tabla 'clients'
        .update({ 
          agent_config: { prompt: generatedPrompt }, role: role // <-- Guardamos también el rol
        })
        .eq('id', clientId);

      if (error) throw error;

      setSnackbar({ open: true, message: '¡Prompt guardado con éxito!', severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: `Error al guardar el prompt: ${err.message}`, severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleUnlock = () => {
    if (password === ADMIN_PASSWORD) {
      setIsUnlocked(true);
      setSnackbar({ open: true, message: 'Editor de roles desbloqueado.', severity: 'info' });
      setError('');
    } else {
      setError('Contraseña incorrecta.');
      setIsUnlocked(false);
    }
    setPassword('');
  };

  const handleRolePromptChange = (roleName, newPrompt) => {
    setRolePrompts(prompts => 
      prompts.map(p => p.role_name === roleName ? { ...p, base_prompt: newPrompt } : p)
    );
  };

  const handleSaveRolePrompt = async (roleName) => {
    const promptToSave = rolePrompts.find(p => p.role_name === roleName);
    if (!promptToSave) return;

    setSavingRole(prev => ({ ...prev, [roleName]: true }));
    try {
      const { error } = await supabase
        .from('role_prompts')
        .update({ base_prompt: promptToSave.base_prompt, updated_at: new Date() })
        .eq('role_name', roleName);
      
      if (error) throw error;
      setSnackbar({ open: true, message: `¡Comportamiento del rol "${roleLabels[roleName]}" guardado!`, severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: `Error al guardar el rol: ${err.message}`, severity: 'error' });
    } finally {
      setSavingRole(prev => ({ ...prev, [roleName]: false }));
    }
  };

  // Extraer las reglas del prompt para el resumen
  const rules = generatedPrompt
    ?.split('\n') // El '?' evita errores si generatedPrompt es nulo o indefinido
    .filter(line => line.startsWith('-'))
    .map(line => line.substring(1).trim());

  return (
    <Container maxWidth={false} sx={{ px: { xs: 2, md: 3 } }}> {/* Ancho completo con padding controlado */}
      <Typography variant="h4" component="h1" gutterBottom>
        Configuración del Agente de Ventas
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Define y refina la personalidad y las reglas de tu agente de IA. Usa el generador para añadir comportamientos o edita el prompt técnico directamente.
      </Typography>

      {loading && <CircularProgress />}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {!loading && !error && (
        <>
          <Grid container spacing={3}>
            {/* Columna Izquierda: Petición del Usuario */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
                <Typography variant="h6" gutterBottom>1. Pide un nuevo comportamiento (con tus palabras)</Typography>
                <TextField
                  label="Ej: 'Quiero que ofrezcas un 10% de descuento si el cliente compra más de 3 productos'"
                  multiline
                  rows={8}
                  fullWidth
                  value={userRequest}
                  onChange={(e) => setUserRequest(e.target.value)}
                />
                <Button
                  variant="contained"
                  onClick={handleGeneratePrompt}
                  disabled={generating || !userRequest}
                  startIcon={generating ? <CircularProgress size={20} color="inherit" /> : <AutoAwesomeIcon />}
                  sx={{ mt: 2 }}
                >
                  {generating ? 'Generando...' : 'Generar con IA'}
                </Button>
              </Paper>
            </Grid>

            {/* Columna Derecha: Prompt Generado */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
                <Typography variant="h6" gutterBottom>2. Prompt Técnico del Agente (editable)</Typography>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel id="role-select-label">Rol del Agente</InputLabel>
                  <Select
                    labelId="role-select-label"
                    id="role-select"
                    name="role"
                    value={role}
                    label="Rol del Agente"
                    onChange={(e) => setRole(e.target.value)}
                  >
                    {agentRoles.map((r) => (
                      <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  multiline
                  rows={12}
                  fullWidth
                  value={generatedPrompt}
                  onChange={(e) => setGeneratedPrompt(e.target.value)}
                  helperText="Este es el prompt final que usará la IA. Puedes editarlo directamente."
                />
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleSavePrompt}
                  disabled={saving}
                  startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                  sx={{ mt: 2, alignSelf: 'flex-end' }}
                >
                  {saving ? 'Guardando...' : 'Guardar Prompt'}
                </Button>
              </Paper>
            </Grid>
          </Grid>

          {/* Sección de Resumen de Comportamiento */}
          <Paper sx={{ p: 2, mt: 4 }}>
            <Typography variant="h6" gutterBottom>Resumen de Comportamientos y Reglas Actuales</Typography>
            <List dense>
              {rules.map((rule, index) => (
                <ListItem key={index}>
                  <ListItemIcon sx={{ minWidth: '32px' }}><CheckCircleOutlineIcon color="success" fontSize="small" /></ListItemIcon>
                  <ListItemText primary={rule} />
                </ListItem>
              ))}
            </List>
          </Paper>
        </>
      )}

      <Divider sx={{ my: 4 }} />

      {/* Editor de Roles (movido desde SettingsPage) */}
      <Typography variant="h4" component="h1" gutterBottom>
        Comportamiento Base de Roles
      </Typography>
      <Paper sx={{ p: 3 }}>
        {!isUnlocked ? (
          <Box>
            <Typography variant="h6" gutterBottom>Desbloquear Editor de Roles</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Esta es una sección avanzada. Ingresa la contraseña de administrador para modificar el comportamiento base de cada rol.
            </Typography>
            <Stack direction="row" spacing={2} alignItems="center">
              <TextField
                label="Contraseña de Administrador"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleUnlock()}
              />
              <Button variant="contained" onClick={handleUnlock} startIcon={<LockIcon />}>
                Desbloquear
              </Button>
            </Stack>
          </Box>
        ) : (
          <Box>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <LockOpenIcon color="success" /> Editor Desbloqueado
            </Typography>
            {rolePrompts.map((role) => (
              <Accordion key={role.role_name} sx={{ mt: 2 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>{roleLabels[role.role_name] || role.role_name}</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <TextField label={`Prompt Base para "${roleLabels[role.role_name]}"`} multiline rows={10} fullWidth value={role.base_prompt} onChange={(e) => handleRolePromptChange(role.role_name, e.target.value)} />
                  <Button sx={{ mt: 2 }} variant="contained" onClick={() => handleSaveRolePrompt(role.role_name)} disabled={savingRole[role.role_name]}>
                    {savingRole[role.role_name] ? <CircularProgress size={24} /> : `Guardar Comportamiento de ${roleLabels[role.role_name]}`}
                  </Button>
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        )}
      </Paper>

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