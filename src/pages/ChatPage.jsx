// src/pages/ChatPage.jsx
import { useState, useEffect } from 'react';
import useWebSocket from 'react-use-websocket';
import { supabase } from '../supabaseClient'; // <-- ¡NUEVO! Importamos supabase
import { useOutletContext } from 'react-router-dom';
import Chat from '../components/Chat.jsx';
import { Typography, Box, Paper, Alert, List, ListItemButton, ListItemText, ListItemAvatar, Avatar, Divider, Badge, IconButton } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import CloseIcon from '@mui/icons-material/Close';
function ChatPage() {
  const [conversations, setConversations] = useState({});
  const [activeTab, setActiveTab] = useState(null);
  const { websocketUrl } = useOutletContext(); // Recibimos la URL desde el Layout
  const { lastMessage } = useWebSocket(websocketUrl, {
    share: true, // Reutiliza la conexión del Layout
    shouldReconnect: () => true,
  });

  // ¡NUEVO! Este efecto se ejecuta una sola vez para cargar el historial desde la BD.
  useEffect(() => {
    // --- ¡LÓGICA DE PERSISTENCIA! ---
    const getClosedChats = () => JSON.parse(localStorage.getItem('closedChats') || '[]');

    const fetchHistory = async () => {
      const { data, error } = await supabase
        .from('chat_history')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        console.error("Error al cargar el historial de chats:", error);
        return;
      }

      const closedChats = getClosedChats();

      // Agrupamos los mensajes por session_id para reconstruir las conversaciones
      const groupedConversations = data.reduce((acc, message) => {
        // --- ¡CORRECCIÓN CLAVE! Leemos también la URL de la foto de perfil ---
        const { session_id, message_from, message_text, created_at, profile_pic_url } = message;
        // Si el chat está en la lista de cerrados, lo ignoramos.
        if (closedChats.includes(session_id)) return acc;

        if (!acc[session_id]) {
          // ¡CAMBIO! Ahora cada conversación es un objeto con mensajes y la foto.
          acc[session_id] = {
            messages: [],
            profilePicUrl: profile_pic_url || null, // <-- Usamos la URL de la BD
            isUnread: false,
          };
        }
        // Si encontramos una URL más reciente, la actualizamos (útil si el usuario cambia su foto)
        if (profile_pic_url) acc[session_id].profilePicUrl = profile_pic_url;

        acc[session_id].messages.push({ from: message_from, text: message_text, timestamp: created_at });
        return acc;
      }, {});

      setConversations(groupedConversations);

      // Si hay conversaciones, activamos la pestaña de la última conversación
      if (data.length > 0) {
        const lastSessionId = data[data.length - 1].session_id;
        setActiveTab(lastSessionId);
      }
    };

    fetchHistory();
  }, []); // El array vacío asegura que solo se ejecute una vez al montar el componente.

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
        const timestamp = new Date().toISOString(); // Usamos la hora actual para el nuevo mensaje
        setConversations(async (prev) => {
          let conversationToUpdate = prev[sessionId];

          // --- ¡LÓGICA CLAVE! ---
          // Si la conversación no existe en el estado (porque fue cerrada), la reconstruimos desde la BD.
          if (!conversationToUpdate) {
            console.log(`[DEBUG] Reconstruyendo historial para el chat cerrado: ${sessionId}`);
            const { data: historyData, error: historyError } = await supabase
              .from('chat_history')
              .select('*')
              .eq('session_id', sessionId)
              .order('created_at', { ascending: true });

            if (historyError) {
              console.error("Error al reconstruir historial:", historyError);
              return prev; // Si hay un error, no hacemos nada.
            }

            conversationToUpdate = {
              messages: historyData.map(msg => ({ from: msg.message_from, text: msg.message_text, timestamp: msg.created_at })),
              profilePicUrl: prev[sessionId]?.profilePicUrl || null, // Mantenemos la foto si ya la teníamos
              isUnread: false,
            };
          }

          // Añadimos el nuevo mensaje y actualizamos el estado de "no leído"
          const newMessages = [...conversationToUpdate.messages, { from, text, timestamp }];
          const unreadStatus = sessionId !== activeTab;

          // Si es el primer mensaje de una nueva conversación, la abrimos automáticamente
          if (!activeTab) {
            // LOG 3: Ver si se está intentando activar una nueva pestaña.
            console.log(`[DEBUG] No hay pestaña activa. Activando nueva pestaña para sessionId: ${sessionId}`);
            setActiveTab(sessionId);
          }

          return {
            ...prev,
            [sessionId]: { ...conversationToUpdate, messages: newMessages, isUnread: unreadStatus },
          };
        });
      } else if (message && message.type === 'user-profile-update') {
        // --- ¡NUEVO! Escuchamos el evento de la foto de perfil ---
        const { sessionId, profilePicUrl } = message.data;
        setConversations(prev => {
          const existingConversation = prev[sessionId] || { messages: [], profilePicUrl: null, isUnread: false };
          return {
            ...prev,
            [sessionId]: { ...existingConversation, profilePicUrl: profilePicUrl }
          };
        });
      }
    }
  }, [lastMessage]); // <-- CORRECCIÓN: Quitamos activeTab de las dependencias para evitar re-renders innecesarios.

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    // --- ¡LÓGICA DEL PUNTO VERDE! ---
    // Al abrir un chat, lo marcamos como leído.
    if (conversations[newValue]?.isUnread) {
      setConversations(prev => ({
        ...prev,
        [newValue]: { ...prev[newValue], isUnread: false }
      }));
    }
  };

  // --- ¡NUEVO! Función para cerrar/ocultar un chat ---
  const handleCloseChat = (e, sessionIdToClose) => {
    e.stopPropagation(); // Evita que al hacer clic en la 'X' también se abra el chat.

    // --- ¡LÓGICA DE PERSISTENCIA! ---
    const closedChats = JSON.parse(localStorage.getItem('closedChats') || '[]');
    if (!closedChats.includes(sessionIdToClose)) {
      closedChats.push(sessionIdToClose);
      localStorage.setItem('closedChats', JSON.stringify(closedChats));
    }

    setConversations(prev => {
      const { [sessionIdToClose]: _, ...remainingConversations } = prev;
      return remainingConversations;
    });

    // Si cerramos el chat que estaba activo, limpiamos la vista.
    if (activeTab === sessionIdToClose) {
      setActiveTab(null);
    }
  };

  // --- ¡NUEVO! Ordenamos las conversaciones por el timestamp del último mensaje ---
  const conversationIds = Object.keys(conversations).sort((a, b) => {
    const lastMsgA = conversations[a].messages[conversations[a].messages.length - 1];
    const lastMsgB = conversations[b].messages[conversations[b].messages.length - 1];
    if (!lastMsgA) return 1;
    if (!lastMsgB) return -1;
    return new Date(lastMsgB.timestamp) - new Date(lastMsgA.timestamp);
  });

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
        <Paper elevation={3} sx={{ display: 'flex', height: 'calc(100vh - 150px)', overflow: 'hidden' }}>
          {/* Columna de la Lista de Chats */}
          <Box sx={{ width: 320, borderRight: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="h6">Conversaciones</Typography>
            </Box>
            <List sx={{ flexGrow: 1, overflowY: 'auto', bgcolor: 'background.default' }}>
              {conversationIds.map((sessionId) => (
                <ListItemButton
                  key={sessionId}
                  selected={activeTab === sessionId}
                  onClick={() => handleTabChange(null, sessionId)}
                  sx={{
                    '&.Mui-selected': { bgcolor: 'secondary.main', color: 'white', '&:hover': { bgcolor: 'secondary.dark' } },
                  }}
                >
                  <ListItemAvatar>
                    {/* --- ¡CAMBIO CLAVE! Envolvemos el Avatar en un Badge para el punto verde --- */}
                    <Badge
                      color="success"
                      variant="dot"
                      invisible={!conversations[sessionId].isUnread}
                    >
                      <Avatar src={conversations[sessionId].profilePicUrl}><PersonIcon /></Avatar>
                    </Badge>
                  </ListItemAvatar>
                  <ListItemText
                    primary={sessionId.split('@')[0]}
                    primaryTypographyProps={{ fontWeight: 'medium', noWrap: true }}
                    secondary={
                      conversations[sessionId].messages.length > 0
                        ? conversations[sessionId].messages[conversations[sessionId].messages.length - 1].text.substring(0, 30) + '...'
                        : 'Nueva conversación'
                    }
                    secondaryTypographyProps={{ noWrap: true, color: activeTab === sessionId ? 'rgba(255,255,255,0.7)' : 'text.secondary' }}
                  />
                  {/* --- ¡NUEVO! Mostramos la hora del último mensaje --- */}
                  {conversations[sessionId].messages.length > 0 && (
                    <Typography
                      variant="caption"
                      sx={{
                        position: 'absolute',
                        top: 10,
                        right: 35, // Dejamos espacio para el botón de cerrar
                        color: activeTab === sessionId ? 'rgba(255,255,255,0.9)' : 'text.secondary',
                      }}
                    >
                      {new Date(conversations[sessionId].messages[conversations[sessionId].messages.length - 1].timestamp).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                    </Typography>
                  )}
                  {/* --- ¡NUEVO! Botón para cerrar el chat --- */}
                  <IconButton size="small" onClick={(e) => handleCloseChat(e, sessionId)} sx={{ ml: 1, position: 'absolute', top: 5, right: 5 }}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </ListItemButton>
              ))}
            </List>
          </Box>

          {/* Área de la Conversación Activa */}
          {activeTab && conversations[activeTab] && (
            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
                <Typography variant="h6">
                  Chat con {activeTab.split('@')[0]}
                </Typography>
              </Box>
              <Chat messages={conversations[activeTab].messages} />
            </Box>
          )}
        </Paper>
      )}
    </>
  );
}

export default ChatPage;
