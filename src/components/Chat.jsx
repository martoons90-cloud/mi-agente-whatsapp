import { useState } from 'react';
import { supabase } from '../supabaseClient'; // ¡Importante! Necesitamos esto para llamar a la función.
import { Box, TextField, Button, Paper, Typography, List, ListItem, ListItemText, CircularProgress, IconButton } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';

function Chat() {
  const [messages, setMessages] = useState([
    { from: 'bot', text: '¡Hola! Soy tu asistente de ventas. ¿En qué puedo ayudarte hoy?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { from: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    const currentInput = input; // Guardamos el input actual antes de limpiarlo
    setInput('');
    setLoading(true);

    try {
      // --- ¡CAMBIO CLAVE! ---
      // Leemos el ID del cliente desde el almacenamiento local.
      const clientId = localStorage.getItem('clientId');
      if (!clientId) {
        // Si no hay cliente configurado, no podemos continuar.
        throw new Error("No se ha configurado una cuenta de cliente. Por favor, ve a la sección 'Cuenta del Agente' para configurarla.");
      }

      // --- ESTA ES LA PARTE NUEVA ---
      // Llamamos a la Edge Function 'chat' que creamos
      const { data, error } = await supabase.functions.invoke('chat', {
        body: { 
          query: currentInput,
          history: messages, // <-- AÑADIMOS EL HISTORIAL DE LA CONVERSACIÓN
          clientId: clientId // <-- ¡Y AÑADIMOS EL ID DEL CLIENTE!
        },
      });

      if (error) {
        throw error;
      }

      // Usamos la respuesta real de la IA
      const botMessage = { from: 'bot', text: data.response };
      setMessages(prev => [...prev, botMessage]);

    } catch (error) {
      // Mostramos un error si algo falla
      const errorMessage = { from: 'bot', text: `Lo siento, tuve un problema: ${error.message}` };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
      <Typography variant="h5" component="h2" gutterBottom>
        Chatea con tu Agente de Ventas
      </Typography>
      <Paper variant="outlined" sx={{ height: '400px', overflowY: 'auto', p: 2, mb: 2 }}>
        <List>
          {messages.map((msg, index) => (
            <ListItem key={index} sx={{ justifyContent: msg.from === 'bot' ? 'flex-start' : 'flex-end' }}>
              <Box
                sx={{
                  bgcolor: msg.from === 'bot' ? 'grey.200' : 'primary.main',
                  color: msg.from === 'bot' ? 'black' : 'white',
                  p: 1.5,
                  borderRadius: 2,
                  maxWidth: '80%',
                }}
              >
                <ListItemText primary={msg.text} />
              </Box>
            </ListItem>
          ))}
          {loading && <ListItem sx={{ justifyContent: 'flex-start' }}><CircularProgress size={20} /></ListItem>}
        </List>
      </Paper>
      <Box component="form" onSubmit={handleSend} sx={{ display: 'flex', alignItems: 'center' }}>
        <TextField
          fullWidth
          variant="outlined"
          size="small"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribe tu mensaje..."
          disabled={loading}
        />
        <IconButton type="submit" color="primary" disabled={loading} sx={{ ml: 1 }}>
          <SendIcon />
        </IconButton>
      </Box>
    </Paper>
  );
}

export default Chat;