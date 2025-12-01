import { useEffect, useRef } from 'react';
import { Box, List, ListItem, ListItemText, CircularProgress, Chip, Typography } from '@mui/material';

// --- ¡NUEVA FUNCIÓN! ---
// Helper para formatear las fechas como en WhatsApp
const formatDateSeparator = (date) => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'HOY';
  if (date.toDateString() === yesterday.toDateString()) return 'AYER';
  
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

function Chat({ messages, loading }) {
  const listEndRef = useRef(null);
  let lastDate = null; // Para controlar cuándo mostrar el separador de fecha

  useEffect(() => {
    // Desplazar al final de la lista de mensajes cuando se actualiza
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);
  
  return (
    <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2 }}>
      <List>
        {messages.map((msg, index) => {
          const msgDate = new Date(msg.timestamp);
          const showDateSeparator = !lastDate || lastDate.toDateString() !== msgDate.toDateString();
          if (showDateSeparator) {
            lastDate = msgDate;
          }

          return (
            <div key={index}>
              {showDateSeparator && (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
                  <Chip label={formatDateSeparator(msgDate)} />
                </Box>
              )}
              <ListItem sx={{ display: 'flex', flexDirection: 'column', alignItems: msg.from === 'user' ? 'flex-end' : 'flex-start', px: 1, py: 0.5 }}>
                <Box sx={{
                  bgcolor: msg.from === 'user' ? 'primary.main' : 'grey.200',
                  color: msg.from === 'user' ? 'white' : 'black',
                  p: 1,
                  borderRadius: 2,
                  maxWidth: '80%',
                }}>
                  <ListItemText 
                    primary={<Typography sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'break-word' }}>{msg.text}</Typography>} 
                  />
                </Box>
                <Typography
                  variant="caption"
                  sx={{
                    color: 'text.secondary',
                    mt: 0.5,
                  }}
                >
                  {msgDate.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                </Typography>
              </ListItem>
            </div>
          );
        })}
        {loading && <ListItem sx={{ justifyContent: 'flex-start' }}><CircularProgress size={20} /></ListItem>}
        <div ref={listEndRef} />
      </List>
    </Box>
  );
}

export default Chat;
