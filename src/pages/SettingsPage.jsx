// src/pages/SettingsPage.jsx
import { Typography, Box, Paper } from '@mui/material';

function SettingsPage() {
  return (
    <>
      <Typography variant="h4" component="h1" gutterBottom>
        Configuración de la Aplicación
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Typography variant="body1">
          Esta sección está en desarrollo. Aquí podrás configurar parámetros de la aplicación, como la personalización de cotizaciones en PDF y otros ajustes técnicos.
        </Typography>
      </Paper>
    </>
  );
}

export default SettingsPage;