// src/pages/ChatPage.jsx
import { useState, useEffect } from 'react';
import useWebSocket from 'react-use-websocket';
import { useOutletContext } from 'react-router-dom'; // Importamos el hook para recibir el contexto
import Chat from '../components/Chat.jsx';
import { Typography, Box, Paper, Alert, List, ListItemButton, ListItemText } from '@mui/material';

function ChatPage() {
  const [conversations, setConversations] = useState({});
  const [activeTab, setActiveTab] = useState(null);
  const { websocketUrl } = useOutletContext(); // Recibimos la URL desde el Layout
  const { lastMessage } = useWebSocket(websocketUrl, {
    share: true, // Reutiliza la conexión del Layout
    shouldReconnect: () => true,
  });

  useEffect(() => {
    // LOG 1: Ver si el hook de WebSocket está recibiendo algún mensaje.
    console.log('[DEBUG] useEffect de ChatPage activado. lastMessage:', lastMessage);

    if (lastMessage !== null) {
      const message = JSON.parse(lastMessage.data);
      // LOG 2: Ver el mensaje parseado para comprobar su estructura y tipo.
      console.log('[DEBUG] Mensaje recibido y parseado:', message);

      // Escuchamos los mensajes que el gateway nos envía
      if (message && (message.type === 'user-message' || message.type === 'bot-reply')) {
        const { sessionId, text, from } = message.data;

        setConversations(prev => {
          const existingHistory = prev[sessionId] || [];
          const newHistory = [...existingHistory, { from, text }];

          const updatedConversations = {
            ...prev,
            [sessionId]: newHistory,
          };

          // Si es el primer mensaje de una nueva conversación, la abrimos automáticamente
          if (!activeTab) {
            // LOG 3: Ver si se está intentando activar una nueva pestaña.
            console.log(`[DEBUG] No hay pestaña activa. Activando nueva pestaña para sessionId: ${sessionId}`);
            setActiveTab(sessionId);
          }

          return updatedConversations;
        });
      }
    }
  }, [lastMessage]); // <-- CORRECCIÓN: Quitamos activeTab de las dependencias para evitar re-renders innecesarios.

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const conversationIds = Object.keys(conversations);

  return (
    <>
      <Typography variant="h4" component="h1" gutterBottom>
        Monitor de Conversaciones
      </Typography>

      {conversationIds.length === 0 ? (
        <Alert severity="info">
          Esperando la primera conversación. Cuando un cliente envíe un mensaje a tu bot, aparecerá aquí una nueva pestaña.
        </Alert>
      ) : (
        <Paper elevation={3} sx={{ display: 'flex', height: '75vh' }}>
          {/* Lista de Contactos (similar a WhatsApp) */}
          <List sx={{ width: 200, bgcolor: 'background.paper' }}>
            {conversationIds.map((sessionId) => (
              <ListItemButton
                key={sessionId}
                selected={activeTab === sessionId}
                onClick={() => handleTabChange(null, sessionId)}
                alignItems="flex-start"
                sx={{
                  borderBottom: '1px solid #e0e0e0',
                  '&:last-child': { borderBottom: 'none' },
                  '&.Mui-selected': { bgcolor: 'action.selected' },
                }}
              >
                <ListItemText
                  primary={sessionId.split('@')[0]} // Muestra el número de teléfono
                  secondary={
                    conversations[sessionId].length > 0
                      ? conversations[sessionId][conversations[sessionId].length - 1].text.substring(0, 40) + '...' // Muestra un fragmento del último mensaje
                      : 'Nueva conversación'
                  }
                />
              </ListItemButton>
            ))}
          </List>

          {/* El componente Chat ahora solo muestra los mensajes, no tiene lógica propia */}
          {activeTab && conversations[activeTab] && (
            <Box sx={{ flexGrow: 1, p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Chat con {activeTab.split('@')[0]}
              </Typography>
              <Chat messages={conversations[activeTab]} />
            </Box>
          )}
        </Paper>
      )}
    </>
  );
}

export default ChatPage;
