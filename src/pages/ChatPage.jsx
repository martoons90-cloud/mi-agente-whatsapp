// src/pages/ChatPage.jsx
import { useState } from 'react';
import Chat from '../components/Chat.jsx';
import PromptEditor from '../components/PromptEditor.jsx';
import { Typography, Box, Button, Snackbar, Alert } from '@mui/material';
import EditNoteIcon from '@mui/icons-material/EditNote';

function ChatPage() {
  const [editorOpen, setEditorOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '' });

  const handleSavePrompt = () => {
    setSnackbar({ open: true, message: '¡Prompt guardado con éxito!' });
    setEditorOpen(false);
  };

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" component="h1">Chat</Typography>
        <Button variant="outlined" startIcon={<EditNoteIcon />} onClick={() => setEditorOpen(true)}>
          Editar Prompt
        </Button>
      </Box>
      <Chat />
      <PromptEditor open={editorOpen} onClose={() => setEditorOpen(false)} onSave={handleSavePrompt} />
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert severity="success" sx={{ width: '100%' }}>{snackbar.message}</Alert>
      </Snackbar>
    </>
  );
}
export default ChatPage;
