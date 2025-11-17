import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Box, TextField, Button, Paper, Typography, List, ListItem, ListItemText, CircularProgress, IconButton } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';

function Chat() {
  const [messages, setMessages] = useState([
    { from: 'bot', text: '¡Hola! Soy tu asistente de ventas. ¿En qué puedo ayudarte hoy?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const listEndRef = useRef(null);

  useEffect(() => {
    // Desplazar al final de la lista de mensajes cuando se actualiza
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { from: 'user', text: input };
    const currentMessages = [...messages, userMessage];
    setMessages(currentMessages);
    const currentInput = input;
    setInput('');
    setLoading(true);

    try {
      // ¡CORRECCIÓN! Obtenemos el ID del usuario logueado, es más seguro.
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error("No hay una sesión activa. Por favor, inicia sesión.");
      const botConfigId = session.user.id;
      
      const { data, error } = await supabase.functions.invoke('chat', {
        body: { 
          // Ajustamos el cuerpo para que coincida con lo que espera la función 'chat'
          message: currentInput,
          // Para este chat de prueba, podemos usar el ID del negocio como ID de sesión
          sessionId: botConfigId, 
          // El ID del negocio que contiene la configuración
          clientId: botConfigId,
          // Pasamos el historial real de la conversación del chat de prueba
          history: messages,
        },
      });

      if (error) {
        throw error;
      }

      // ¡CORRECCIÓN! Nos aseguramos de que la respuesta tenga el formato esperado.
      if (data && data.reply) {
        const botMessage = { from: 'bot', text: data.reply };
        setMessages(prev => [...prev, botMessage]);
      } else {
        setMessages(prev => [...prev, { from: 'bot', text: 'No he recibido una respuesta válida.' }]);
      }

    } catch (error) {
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
          <div ref={listEndRef} />
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
