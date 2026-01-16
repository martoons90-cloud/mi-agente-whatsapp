import { useState } from 'react';
import { Toolbar, Typography, Box, IconButton, Tooltip, Chip, Menu, MenuItem, Button } from '@mui/material';
import ClientSwitcherDialog from './ClientSwitcherDialog'; // <-- ¡NUEVO! Importamos el diálogo
import AccountCircle from '@mui/icons-material/AccountCircle';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import LogoutIcon from '@mui/icons-material/Logout';
import WorkOutlineIcon from '@mui/icons-material/WorkOutline';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const roleLabels = {
  product_seller: 'Vendedor de Productos',
  appointment_scheduler: 'Agendador de Turnos',
  real_estate: 'Agente Inmobiliario',
};

function TopBar({ connectionStatus, whatsAppUserData, authUserData, agentRole, isAdmin, allClients, selectedClientId, onClientChange }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false); // <-- ¡NUEVO! Estado para el diálogo
  const navigate = useNavigate();

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    handleClose();
    navigate('/login'); // Redirigir explícitamente al login
  };

  const isConnected = connectionStatus === 'authenticated';
  const roleLabel = agentRole ? roleLabels[agentRole] : 'No definido';

  return (
    // ¡CAMBIO! Toolbar más delgado
    <Toolbar sx={{ pr: '24px', minHeight: '56px !important' }}>
      {/* Título a la izquierda */}
      <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
        Agente de WhatsApp
      </Typography>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {isConnected && whatsAppUserData ? (
          <>
            <WhatsAppIcon />
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <Typography variant="body2" component="div">
                {whatsAppUserData.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                +{whatsAppUserData.number}
              </Typography>
            </Box>
          </>
        ) : (
          <Typography variant="body2">WhatsApp no conectado</Typography>
        )}

        <Chip
          icon={<CheckCircleIcon />}
          label={isConnected ? 'Conectado' : 'Desconectado'}
          color={isConnected ? 'success' : 'error'}
          variant="outlined"
          size="small"
        />

        {/* Botón para abrir el selector de cliente (movido a la derecha) */}
        {isAdmin && (
          <>
            <Button
              variant="outlined"
              startIcon={<SupervisorAccountIcon />}
              onClick={() => setDialogOpen(true)}
            >
              Cambiar Cliente
            </Button>
            <ClientSwitcherDialog
              open={dialogOpen}
              onClose={() => setDialogOpen(false)}
              allClients={allClients}
              onConfirm={onClientChange}
            />
          </>
        )}

        {/* Indicador del cliente que se está viendo */}
        {isAdmin && selectedClientId && authUserData?.id !== selectedClientId && (
          <Typography variant="caption" sx={{ fontStyle: 'italic', color: 'primary.main' }}>
            Viendo: {allClients.find(c => c.id === selectedClientId)?.email || 'Cliente desconocido'}
          </Typography>
        )}

        {authUserData && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AccountCircle />
            <Typography variant="body2">{authUserData.email}</Typography>
          </Box>
        )}
        <Tooltip title="Cerrar Sesión">
          <IconButton onClick={handleLogout} color="inherit">
            <LogoutIcon />
          </IconButton>
        </Tooltip>
      </Box>
    </Toolbar>
  );
}

export default TopBar;