import React from 'react';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { Box, IconButton, Tooltip } from '@mui/material';
import Chip from '@mui/material/Chip';
import AccountCircle from '@mui/icons-material/AccountCircle';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import LogoutIcon from '@mui/icons-material/Logout';
import { supabase } from '../supabaseClient';

const handleLogout = async () => {
  await supabase.auth.signOut();
  // El onAuthStateChange en App.jsx se encargará de la redirección.
};

function TopBar({ connectionStatus, whatsAppUserData, authUserData }) {
  const isConnected = connectionStatus === 'authenticated';

  return (
    // ¡CAMBIO! Toolbar más delgado
    <Toolbar sx={{ pr: '24px', minHeight: '56px !important' }}>
      {/* Título a la izquierda */}
      <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
        Agente de WhatsApp
      </Typography>

      {/* Contenedor para la información del usuario a la derecha */}
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
          icon={isConnected ? <CheckCircleIcon /> : <ErrorIcon />}
          label={isConnected ? 'Conectado' : 'Desconectado'}
          color={isConnected ? 'success' : 'error'}
          variant="outlined"
          size="small"
          sx={{ mx: 2 }}
        />

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