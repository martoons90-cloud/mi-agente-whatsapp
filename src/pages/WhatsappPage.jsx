// src/pages/WhatsappPage.jsx
import { useState, useEffect } from 'react';
import { Box, Typography, Paper, CircularProgress, Alert, Button, Chip, Avatar, Stack } from '@mui/material';
import { QRCodeCanvas } from 'qrcode.react';
import useWebSocket, { ReadyState } from 'react-use-websocket';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import LinkOffIcon from '@mui/icons-material/LinkOff';

const SOCKET_URL = 'ws://localhost:8080';

function WhatsappPage() {
  const [qrCode, setQrCode] = useState('');
  const [statusText, setStatusText] = useState('Esperando conexión del gateway...');
  const [connectedNumber, setConnectedNumber] = useState(null);

  const { lastMessage, readyState, sendMessage } = useWebSocket(SOCKET_URL, {
    shouldReconnect: () => true,
    reconnectInterval: 3000,
  });

  useEffect(() => {
    if (lastMessage !== null) {
      const message = JSON.parse(lastMessage.data);
      switch (message.type) {
        case 'qr':
          setStatusText('Por favor, escanea el código QR para conectar.');
          setQrCode(message.data);
          setConnectedNumber(null);
          break;
        case 'authenticated':
          setStatusText('¡Conectado y autenticado!');
          setConnectedNumber(message.data.number);
          setQrCode(''); // Ocultar el QR una vez conectado
          break;
        case 'disconnected':
          setStatusText(`Sesión desconectada. Reinicia el gateway para volver a conectar.`);
          setQrCode('');
          setConnectedNumber(null);
          break;
        default:
          break;
      }
    }
  }, [lastMessage]);

  const handleLogout = () => {
    if (readyState === ReadyState.OPEN) {
      setStatusText('Desconectando sesión...');
      sendMessage(JSON.stringify({ type: 'logout' }));
    }
  };

  const renderGatewayStatus = () => {
    const statusMap = {
      [ReadyState.CONNECTING]: { text: 'Conectando al Gateway...', color: 'info' },
      [ReadyState.OPEN]: { text: 'Conectado al Gateway', color: 'success' },
      [ReadyState.CLOSING]: { text: 'Desconectando...', color: 'warning' },
      [ReadyState.CLOSED]: { text: 'Desconectado del Gateway', color: 'error' },
      [ReadyState.UNINSTANTIATED]: { text: 'Iniciando...', color: 'info' },
    };
    const currentStatus = statusMap[readyState];
    return (
      <Chip 
        label={currentStatus.text} 
        color={currentStatus.color}
        size="small" 
        icon={readyState === ReadyState.OPEN ? <CheckCircleIcon /> : <ErrorIcon />}
      />
    );
  };

  const renderContent = () => {
    // Si hay un número conectado, mostramos el estado de éxito y el botón de logout.
    if (connectedNumber) {
      return (
        <Stack alignItems="center" spacing={2}>
          <Avatar sx={{ bgcolor: 'success.main', width: 64, height: 64 }}>
            <WhatsAppIcon fontSize="large" />
          </Avatar>
          <Typography variant="h6" color="success.main">{statusText}</Typography>
          <Typography variant="body1">Número conectado: <strong>+{connectedNumber}</strong></Typography>
          <Button variant="contained" color="error" onClick={handleLogout} startIcon={<LinkOffIcon />}>
            Desconectar Sesión
          </Button>
        </Stack>
      );
    }
    // Si hay un QR, lo mostramos.
    if (qrCode) {
      return (
        <Stack alignItems="center" spacing={2}>
          <Typography variant="h6">Escanea para conectar</Typography>
          <QRCodeCanvas value={qrCode} size={256} />
          <Typography color="text.secondary">{statusText}</Typography>
        </Stack>
      );
    }
    // Si no hay ni número ni QR, mostramos un estado de carga o espera.
    return (
      <Stack alignItems="center" spacing={2}>
        {readyState === ReadyState.OPEN ? <CircularProgress /> : <ErrorIcon color="disabled" sx={{ fontSize: 40 }} />}
        <Typography color="text.secondary">
          {readyState === ReadyState.OPEN ? 'Esperando código QR del gateway...' : 'Asegúrate de que el programa whatsapp-gateway esté corriendo.'}
        </Typography>
      </Stack>
    );
  };

  return (
    <Paper sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, maxWidth: 500, margin: 'auto' }}>
      <Typography variant="h4" component="h1">Conexión de WhatsApp</Typography>
      
      <Stack direction="row" spacing={1} alignItems="center">
        <Typography variant="body1">Estado del Gateway:</Typography>
        {renderGatewayStatus()}
      </Stack>

      <Box sx={{ my: 2, p: 3, border: '1px solid #e0e0e0', borderRadius: 2, minHeight: 340, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
        {renderContent()}
      </Box>
    </Paper>
  );
}

export default WhatsappPage;
