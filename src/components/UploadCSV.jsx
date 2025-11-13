import { useState } from 'react';
import { supabase } from '../supabaseClient'; // Importamos nuestro cliente
import { Box, Button, Snackbar, Alert, CircularProgress } from '@mui/material';
import FileUploadIcon from '@mui/icons-material/FileUpload';

function UploadCSV({ onUploadComplete }) {
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [openSnackbar, setOpenSnackbar] = useState(false);
  
  async function handleUpload(event) {
    try {
      setUploading(true);

      const file = event.target.files[0];
      if (!file) {
        throw new Error('Debes seleccionar un archivo para subir.');
      }

      const fileName = `${Date.now()}_${file.name}`;

      // Subimos el archivo al bucket 'catalogs' en Supabase Storage.
      const { error: uploadError } = await supabase.storage
        .from('catalogs')
        .upload(fileName, file);

      if (uploadError) {
        throw uploadError;
      }

      setMessage(`¡Éxito! Archivo "${file.name}" subido correctamente.`);
      if (onUploadComplete) {
        // Opcional: esperar un poco para que la función de Supabase procese el archivo
        setTimeout(onUploadComplete, 5000); 
      }

    } catch (error) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setUploading(false);
      setOpenSnackbar(true);
    }
  }

  return (
    <Box>
      <Button
        variant="outlined"
        component="label"
        disabled={uploading}
        startIcon={uploading ? <CircularProgress size={20} /> : <FileUploadIcon />}
      >
        Importar CSV
        <input type="file" hidden accept=".csv" onChange={handleUpload} />
      </Button>
      <Snackbar open={openSnackbar} autoHideDuration={6000} onClose={() => setOpenSnackbar(false)}>
        <Alert onClose={() => setOpenSnackbar(false)} severity={message.startsWith('Error') ? 'error' : 'success'} sx={{ width: '100%' }}>
          {message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default UploadCSV;
