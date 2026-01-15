// src/pages/AIChatPage.jsx
import { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Box, TextField, Button, Paper, Typography, List, ListItem, ListItemText, CircularProgress, IconButton } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';

function AIChatPage() {
  const [messages, setMessages] = useState([
    { from: 'bot', text: '¡Hola! Soy tu asistente de ventas. Puedes probar mi comportamiento aquí.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const listEndRef = useRef(null);
  const { selectedClientId } = useOutletContext();

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { from: 'user', text: input };
    const currentInput = input;
    setInput('');
    setMessages(prev => [...prev, userMessage]);
    setLoading(true);

    try {
      if (!selectedClientId) throw new Error("No hay un cliente seleccionado para probar.");
      
      const { data, error } = await supabase.functions.invoke('chat', {
        body: { 
          message: currentInput,
          sessionId: `test-chat-${selectedClientId}`, // Usamos un ID de sesión de prueba
          clientId: selectedClientId, // <-- ¡CAMBIO CLAVE!
          history: messages, // Pasamos el historial del chat de prueba
        },
      });

      if (error) throw error;

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
    <Paper elevation={3} sx={{ p: 3, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Chat de Prueba con IA
      </Typography>
      <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2, border: '1px solid #e0e0e0', borderRadius: 1, mb: 2 }}>
        <List>
          {messages.map((msg, index) => (
            <ListItem key={index} sx={{ justifyContent: msg.from === 'bot' ? 'flex-start' : 'flex-end' }}>
              <Box sx={{ bgcolor: msg.from === 'bot' ? 'grey.200' : 'primary.main', color: msg.from === 'bot' ? 'black' : 'white', p: 1.5, borderRadius: 2, maxWidth: '80%' }}>
                <ListItemText primary={msg.text} />
              </Box>
            </ListItem>
          ))}
          {loading && <ListItem sx={{ justifyContent: 'flex-start' }}><CircularProgress size={20} /></ListItem>}
          <div ref={listEndRef} />
        </List>
      </Box>
      <Box component="form" onSubmit={handleSend} sx={{ display: 'flex', alignItems: 'center' }}>
        <TextField
          fullWidth
          variant="outlined"
          size="small"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribe tu mensaje para probar al bot..."
          disabled={loading}
        />
        <IconButton type="submit" color="primary" disabled={loading || !input.trim()} sx={{ ml: 1 }}>
          <SendIcon />
        </IconButton>
      </Box>
    </Paper>
  );
}

export default AIChatPage;