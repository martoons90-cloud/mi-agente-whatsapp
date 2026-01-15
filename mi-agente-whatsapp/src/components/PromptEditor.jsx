// src/components/PromptEditor.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient'; // <-- ¡CORRECCIÓN IMPORTANTE!
import {
  Button, Dialog, DialogActions, DialogContent, DialogTitle, Box,
  TextField, Typography, CircularProgress, Alert
} from '@mui/material';
import EditNoteIcon from '@mui/icons-material/EditNote';

function PromptEditor({ open, onClose, onSave }) {
  const [promptText, setPromptText] = useState('');
  const [loading, setLoading] = useState(false);
  const [isNewPrompt, setIsNewPrompt] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      async function fetchPrompt() {
        setLoading(true);
        setError('');
        try {
          const clientId = localStorage.getItem('clientId');
          if (!clientId) {
            setError("No se ha configurado una cuenta de cliente. Ve a 'Cuenta del Agente' primero.");
            setLoading(false);
            return;
          }

          const { data, error } = await supabase
            .from('agent_config')
            .select('prompt')
            .eq('client_id', clientId)
            .limit(1)
            .single();

          if (error && error.code !== 'PGRST116') throw error;

          if (data) setPromptText(data.prompt);
          else setIsNewPrompt(true);

        } catch (err) {
          setError(`Error al cargar el prompt: ${err.message}`);
        } finally {
          setLoading(false);
        }
      }
      fetchPrompt();
    }
  }, [open]);

  const handleSave = async () => {
    setLoading(true);
    setError('');
    try {
      const clientId = localStorage.getItem('clientId');
      if (!clientId) throw new Error("No se encontró el ID del cliente.");

      const configData = { client_id: clientId, prompt: promptText };

      if (isNewPrompt) {
        const { error } = await supabase.from('agent_config').insert([configData]);
        if (error) throw error;
        setIsNewPrompt(false);
      } else {
        const { error } = await supabase
          .from('agent_config')
          .update({ prompt: promptText }) // Solo actualizamos el prompt
          .eq('client_id', clientId);
        if (error) throw error;
      }
      onSave(); // Llama a la función onSave pasada por props para mostrar el snackbar
    } catch (err) {
      setError(`Error al guardar el prompt: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <EditNoteIcon color="primary" />
          <Typography variant="h6" component="div">Editar Personalidad del Agente</Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        {loading && <CircularProgress sx={{ my: 2 }} />}
        {error && <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>}
        {!loading && !error && (
          <TextField
            label="Prompt del Agente"
            multiline
            rows={20}
            fullWidth
            variant="outlined"
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            sx={{ mt: 2 }}
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">Cancelar</Button>
        <Button onClick={handleSave} variant="contained" color="secondary" disabled={loading}>
          Guardar Cambios
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default PromptEditor;
