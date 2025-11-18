import { useEffect, useRef } from 'react';
import { Box, Paper, Typography, List, ListItem, ListItemText, CircularProgress } from '@mui/material';

function Chat({ messages, loading }) {
  const listEndRef = useRef(null);

  useEffect(() => {
    // Desplazar al final de la lista de mensajes cuando se actualiza
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);
  
  return (
    <Box sx={{ height: '60vh', overflowY: 'auto', p: 2 }}>
      <List>
        {messages.map((msg, index) => (
          <ListItem key={index} sx={{ justifyContent: msg.from === 'user' ? 'flex-end' : 'flex-start' }}>
            <Box
              sx={{
                bgcolor: msg.from === 'user' ? 'primary.main' : 'grey.200',
                color: msg.from === 'user' ? 'white' : 'black',
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
    </Box>
  );
}

export default Chat;
