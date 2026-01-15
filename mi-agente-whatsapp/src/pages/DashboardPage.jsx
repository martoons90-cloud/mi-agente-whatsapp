// src/pages/DashboardPage.jsx
import { Typography, Box, Paper, Grid } from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';

function DashboardPage() {
  // Aquí podrías cargar datos reales en el futuro
  const totalClients = 10;

  return (
    <>
      <Typography variant="h4" component="h1" gutterBottom>
        Dashboard de Administración
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6} lg={4}>
          <Paper sx={{ p: 2, display: 'flex', alignItems: 'center' }}>
            <PeopleIcon color="primary" sx={{ fontSize: 40, mr: 2 }} />
            <Box>
              <Typography variant="h6">{totalClients}</Typography>
              <Typography color="text.secondary">Clientes Totales</Typography>
            </Box>
          </Paper>
        </Grid>
        {/* Aquí podrás añadir más tarjetas con estadísticas en el futuro */}
      </Grid>
    </>
  );
}

export default DashboardPage;