import { useState, useEffect } from 'react';
import useWebSocket from 'react-use-websocket';
import { supabase } from '../supabaseClient';
import { Box, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Toolbar, Collapse, CssBaseline, AppBar, IconButton, Divider } from '@mui/material';
import { Outlet, useNavigate } from 'react-router-dom';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChatOutlinedIcon from '@mui/icons-material/ChatOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined';
import PeopleOutlineOutlinedIcon from '@mui/icons-material/PeopleOutlineOutlined';
import WhatsAppIcon from '@mui/icons-material/WhatsApp'; // Este se mantiene relleno por ser un logo
import PsychologyOutlinedIcon from '@mui/icons-material/PsychologyOutlined'; // Icono para el nuevo prompt
import CreditCardOutlinedIcon from '@mui/icons-material/CreditCardOutlined';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import TopBar from '../components/TopBar'; // <-- ¡CORRECCIÓN CLAVE! Apuntamos al componente correcto.

const WEBSOCKET_URL = 'ws://localhost:8080';

const menuItems = [
  { text: 'Chat', icon: <ChatOutlinedIcon />, path: '/' },
  { text: 'Productos', icon: <Inventory2OutlinedIcon />, path: '/productos' },
  { text: 'WhatsApp', icon: <WhatsAppIcon />, path: '/whatsapp' }, // Conexión de WhatsApp
  { text: 'Configuración', icon: <SettingsOutlinedIcon />, path: '/configuracion' },
];

function Layout() {
  const navigate = useNavigate();
  const drawerWidth = 240;
  const [agenteVentasOpen, setAgenteVentasOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(true); // Estado para el menú
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [whatsAppUserData, setWhatsAppUserData] = useState(null);
  const [authUserData, setAuthUserData] = useState(null); // <-- NUEVO: Para el usuario de Supabase
  const [agentRole, setAgentRole] = useState(null); // <-- ¡NUEVO! Para guardar el rol del agente

  const { lastMessage } = useWebSocket(WEBSOCKET_URL, {
    share: true,
    shouldReconnect: () => true,
  });

  useEffect(() => {
    if (lastMessage !== null) {
      const data = JSON.parse(lastMessage.data);
      
      if (data.type === 'authenticated') {
        setConnectionStatus('authenticated');
        setWhatsAppUserData(data.data); // Guardamos nombre y número de WhatsApp
      } else if (data.type === 'disconnected') {
        setConnectionStatus('disconnected');
        setWhatsAppUserData(null);
      }
      // Aquí podrías manejar otros eventos como 'qr' o 'user-message' en el futuro
    }
  }, [lastMessage]);

  useEffect(() => {
    // Obtenemos el usuario de Supabase al cargar el layout
    const fetchUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setAuthUserData(user);
        // Una vez que tenemos el usuario, buscamos su rol en la tabla 'clients'
        const { data: clientData } = await supabase
          .from('clients')
          .select('role')
          .eq('id', user.id) // <-- Usamos el ID del usuario autenticado
          .single();
        if (clientData) setAgentRole(clientData.role);
      }
    };
    fetchUserData();
  }, []);

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      {/* Barra superior ahora es independiente y siempre de ancho completo */}
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, backgroundColor: 'grey.200', color: 'grey.800' }}>
        <TopBar whatsAppUserData={whatsAppUserData} authUserData={authUserData} connectionStatus={connectionStatus} agentRole={agentRole} />
      </AppBar>

      {/* Menú lateral con animación de ancho */}
      <Drawer
        variant="permanent"
        sx={{
          width: drawerOpen ? drawerWidth : (theme) => theme.spacing(7),
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerOpen ? drawerWidth : (theme) => theme.spacing(7),
            transition: (theme) => theme.transitions.create('width', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
            overflowX: 'hidden',
            bgcolor: 'primary.main',
            color: 'white',
          },
        }}
      >
        <Toolbar /> {/* Espaciador para que el contenido empiece debajo del TopBar */}
        <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
          {/* ¡ARREGLADO! Restauramos la lista de menú que había borrado por error */}
          <List>
            {menuItems.map((item) => (
              <ListItem key={item.text} disablePadding sx={{ display: 'block' }}>
                <ListItemButton onClick={() => navigate(item.path)} sx={{ minHeight: 48, justifyContent: drawerOpen ? 'initial' : 'center', px: 2.5, '&:hover': { bgcolor: 'primary.dark' } }}>
                  <ListItemIcon sx={{ minWidth: 0, mr: drawerOpen ? 3 : 'auto', justifyContent: 'center', color: 'white' }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText primary={item.text} sx={{ opacity: drawerOpen ? 1 : 0 }} />
                </ListItemButton>
              </ListItem>
            ))}
            {/* Menú Desplegable para Agente de Ventas */}
            <ListItemButton onClick={() => setAgenteVentasOpen(!agenteVentasOpen)} sx={{ minHeight: 48, justifyContent: drawerOpen ? 'initial' : 'center', px: 2.5, '&:hover': { bgcolor: 'primary.dark' } }}>
              <ListItemIcon sx={{ minWidth: 0, mr: drawerOpen ? 3 : 'auto', justifyContent: 'center', color: 'white' }}>
                <StorefrontOutlinedIcon />
              </ListItemIcon>
              <ListItemText primary="Agente de Ventas" sx={{ opacity: drawerOpen ? 1 : 0 }} />
              {drawerOpen ? (agenteVentasOpen ? <ExpandLess /> : <ExpandMore />) : null}
            </ListItemButton>
            <Collapse in={agenteVentasOpen && drawerOpen} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                <ListItemButton sx={{ pl: 4, '&:hover': { bgcolor: 'primary.dark' } }} onClick={() => navigate('/prompt')}>
                  <ListItemIcon sx={{ color: 'white' }}><PsychologyOutlinedIcon /></ListItemIcon>
                  <ListItemText primary="Editar Prompt" />
                </ListItemButton>
                <ListItemButton sx={{ pl: 4, '&:hover': { bgcolor: 'primary.dark' } }} onClick={() => navigate('/ventas/ofertas')}>
                  <ListItemIcon sx={{ color: 'white' }}><LocalOfferOutlinedIcon /></ListItemIcon>
                  <ListItemText primary="Ofertas" />
                </ListItemButton>
                <ListItemButton sx={{ pl: 4, '&:hover': { bgcolor: 'primary.dark' } }} onClick={() => navigate('/ventas/pagos')}>
                  <ListItemIcon sx={{ color: 'white' }}><CreditCardOutlinedIcon /></ListItemIcon>
                  <ListItemText primary="Métodos de Pago" />
                </ListItemButton>
                <ListItemButton sx={{ pl: 4, '&:hover': { bgcolor: 'primary.dark' } }} onClick={() => navigate('/cuenta-agente')}>
                  <ListItemIcon sx={{ color: 'white' }}><PeopleOutlineOutlinedIcon /></ListItemIcon>
                  <ListItemText primary="Configuración" />
                </ListItemButton>
              </List>
            </Collapse>
          </List>
        </Box>
        {/* ¡NUEVO! Botón de colapso en la parte inferior del menú */}
        <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.12)' }} />
        <List>
          <ListItem disablePadding sx={{ display: 'block' }}>
            <ListItemButton
              onClick={() => setDrawerOpen(!drawerOpen)}
              sx={{ minHeight: 48, justifyContent: 'center', px: 2.5, '&:hover': { bgcolor: 'primary.dark' } }}
            >
              {/* ¡ARREGLADO! Quitamos el IconButton para un look más sutil */}
              <ListItemIcon
                sx={{
                  minWidth: 0, justifyContent: 'center', color: 'white',
                  transform: drawerOpen ? 'rotate(0deg)' : 'rotate(180deg)',
                  transition: 'transform 0.2s ease-in-out',
                }}>
                <ChevronLeftIcon />
              </ListItemIcon>
            </ListItemButton>
          </ListItem>
        </List>
      </Drawer>

      {/* Contenido Principal */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: '100%', // Asegura que el contenido principal intente ocupar todo el ancho disponible
          p: 3,
          bgcolor: 'background.default',
          height: '100vh', // Ocupa toda la altura de la ventana
          overflowY: 'auto', // Permite el scroll vertical
          overflowX: 'hidden', // Oculta el scroll horizontal
          // ¡AQUÍ LA MAGIA! Añadimos un borde rojo para delimitar el área de trabajo.
          border: '2px dashed red',
        }}>
        <Toolbar /> {/* Espaciador para que el contenido no quede debajo del TopBar */}
        <Outlet />
      </Box>
    </Box>
  );
}

export default Layout;
