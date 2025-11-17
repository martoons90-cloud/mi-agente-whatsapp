// src/pages/ChatPage.jsx
import { useNavigate } from 'react-router-dom';
import Chat from '../components/Chat.jsx';
import { Typography, Box, Button } from '@mui/material';
import EditNoteIcon from '@mui/icons-material/EditNote';

function ChatPage() {
  const navigate = useNavigate();

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" component="h1">Chat</Typography>
        {/* ¡CAMBIO! Este botón ahora navega a la nueva página de prompts */}
        <Button variant="outlined" startIcon={<EditNoteIcon />} onClick={() => navigate('/prompt')}>
          Editar Prompt
        </Button>
      </Box>
      <Chat />
    </>
  );
}
export default ChatPage;
