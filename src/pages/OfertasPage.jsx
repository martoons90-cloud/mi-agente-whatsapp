// src/pages/OfertasPage.jsx
import { Typography, Box, Button } from '@mui/material';
import OffersTable from '../components/OffersTable.jsx';

function OfertasPage() {
  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" component="h1">
          Gestión de Ofertas
        </Typography>
        <Button variant="contained" color="secondary" onClick={() => alert('Función de agregar oferta no implementada aún.')}>
          Crear Oferta
        </Button>
      </Box>
      <OffersTable />
    </>
  );
}
export default OfertasPage;