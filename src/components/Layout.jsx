import { useState, useEffect } from 'react';
import useWebSocket from 'react-use-websocket';
import { supabase } from '../supabaseClient';
import { Box, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Toolbar, Collapse, CssBaseline, AppBar, IconButton, Divider } from '@mui/material';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
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
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import MonitorHeartOutlinedIcon from '@mui/icons-material/MonitorHeartOutlined';
import DashboardIcon from '@mui/icons-material/Dashboard'; // <-- ¡NUEVO! Icono para el Dashboard
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'; // <-- ¡NUEVO! Icono para el Calendario
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import TopBar from './TopBar';

const WEBSOCKET_URL = 'ws://localhost:8080'; // <-- ¡CORRECCIÓN CLAVE! Conectar directamente al servidor local.

const menuItems = [
  { text: 'Monitor de Chat', icon: <MonitorHeartOutlinedIcon />, path: '/' },
  { text: 'Chat IA', icon: <SmartToyOutlinedIcon />, path: '/ia-chat' },
  { text: 'Productos', icon: <Inventory2OutlinedIcon />, path: '/productos' },
  { text: 'Agenda', icon: <CalendarMonthIcon />, path: '/calendar' }, // <-- ¡NUEVO!
  { text: 'WhatsApp', icon: <WhatsAppIcon />, path: '/whatsapp' }, // Conexión de WhatsApp
  { text: 'Configuración', path: '/settings', icon: <SettingsOutlinedIcon /> }, // <-- ¡CAMBIO! Apunta a la nueva página
];

function Layout() {
  const navigate = useNavigate();
  const location = useLocation(); // <-- ¡NUEVO! Para saber la ruta actual.
  const drawerWidth = 240;
  const [agenteVentasOpen, setAgenteVentasOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(true); // Estado para el menú
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [whatsAppUserData, setWhatsAppUserData] = useState(null);
  const [authUserData, setAuthUserData] = useState(null); // <-- NUEVO: Para el usuario de Supabase
  const [agentRole, setAgentRole] = useState(null); // <-- ¡NUEVO! Para guardar el rol del agente
  const [allClients, setAllClients] = useState([]); // <-- ¡NUEVO! Para la lista de clientes del admin
  const [selectedClientId, setSelectedClientId] = useState(null); // <-- ¡NUEVO! El cliente que el admin está viendo
  const [isAdmin, setIsAdmin] = useState(false); // <-- ¡NUEVO! Para saber si el usuario es admin
  const [timeFormat, setTimeFormat] = useState('24h'); // <-- ¡NUEVO! Formato de hora global

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
          .select('agent_role, system_role') // <-- PASO 1: Leemos solo los datos de 'clients'
          .eq('id', user.id) // <-- Usamos el ID del usuario autenticado
          .single();
        
        if (clientData) {
          // --- ¡CORRECCIÓN! PASO 2: Hacemos una segunda consulta para la info del negocio ---
          const { data: businessData, error: businessDataError } = await supabase
            .from('business_info')
            .select('*')
            .eq('client_id', user.id)
            .single();

          // Si la consulta a business_info da un error (que no sea porque no existe la fila),
          // lo manejamos para que no rompa la aplicación.
          if (businessDataError && businessDataError.code !== 'PGRST116') {
            console.error("Error fetching business_info:", businessDataError);
          }

          const userIsAdmin = clientData.system_role === 'admin'; // <-- ¡CORRECCIÓN! isAdmin depende de system_role.
          // Usamos el resultado de la segunda consulta.
          setTimeFormat(businessData?.time_format || '24h'); 
          setAgentRole(clientData.agent_role); // El rol del agente es agent_role.
          setIsAdmin(userIsAdmin); // <-- ¡CORRECCIÓN!
          setSelectedClientId(user.id); // Por defecto, vemos nuestros propios datos

          // Si es admin, cargamos la lista de todos los clientes
          if (userIsAdmin) {
            // ¡CAMBIO CLAVE! Llamamos a la nueva Edge Function para obtener todos los usuarios.
            const { data: clientsList, error: clientsError } = await supabase.functions.invoke('list-clients');
            if (clientsError) console.error("Error al listar clientes:", clientsError);

            if (clientsList) setAllClients(clientsList);
          }
        }
      }
    };
    fetchUserData();
  }, [selectedClientId]); // <-- ¡CORRECCIÓN CLAVE!

  // Handler para cambiar el cliente seleccionado desde el TopBar
  const handleClientChange = (clientId) => {
    setSelectedClientId(clientId);
    // Opcional: podríamos navegar a una página por defecto cada vez que cambiamos de cliente
    // navigate('/'); 
  };

  return (
    <Box sx={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <CssBaseline />
      {/* Barra superior ahora es independiente y siempre de ancho completo */}
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, backgroundColor: 'grey.200', color: 'grey.800' }}>
        <TopBar 
          whatsAppUserData={whatsAppUserData} 
          authUserData={authUserData} 
          connectionStatus={connectionStatus} 
          agentRole={agentRole}
          isAdmin={isAdmin}
          allClients={allClients}
          selectedClientId={selectedClientId}
          onClientChange={handleClientChange}
        />
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
            {/* Enlace al Dashboard (solo para administradores) */}
            {isAdmin && (() => {
              const isActive = location.pathname === '/dashboard';
              return (
                <ListItem disablePadding sx={{ display: 'block' }}>
                  <ListItemButton
                    onClick={() => navigate('/dashboard')}
                    sx={{
                      minHeight: 48, justifyContent: drawerOpen ? 'initial' : 'center', px: 2.5, mx: 1, borderRadius: 2,
                      bgcolor: isActive ? 'white' : 'transparent',
                      color: isActive ? 'primary.main' : 'white',
                      '&:hover': { bgcolor: isActive ? 'white' : 'primary.dark' },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 0, mr: drawerOpen ? 3 : 'auto', justifyContent: 'center', color: 'inherit' }}>
                      <DashboardIcon />
                    </ListItemIcon>
                    <ListItemText primary="Dashboard" sx={{ opacity: drawerOpen ? 1 : 0 }} />
                  </ListItemButton>
                </ListItem>
              );
            })()}
            {menuItems.map((item) => {
              // --- ¡LÓGICA DE ROL! ---
              // Si el item es la Agenda y el rol no es el correcto, no lo mostramos.
              if (item.path === '/calendar' && agentRole !== 'appointment_scheduler') return null;

              const isActive = location.pathname === item.path;
              return (
                <ListItem key={item.text} disablePadding sx={{ display: 'block' }}>
                  <ListItemButton
                    onClick={() => navigate(item.path)}
                    sx={{
                      minHeight: 48,
                      justifyContent: drawerOpen ? 'initial' : 'center',
                      px: 2.5,
                      mx: 1,
                      borderRadius: 2,
                      bgcolor: isActive ? 'white' : 'transparent',
                      '&:hover': {
                        bgcolor: isActive ? 'white' : 'primary.dark',
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 0, mr: drawerOpen ? 3 : 'auto', justifyContent: 'center', color: isActive ? 'primary.main' : 'white' }}>
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText primary={item.text} sx={{ opacity: drawerOpen ? 1 : 0, color: isActive ? 'primary.main' : 'white' }} />
                  </ListItemButton>
                </ListItem>
              );
            })}
            {/* Menú Desplegable para Agente de Ventas */}
            {(() => {
              const isAgenteVentasActive = [
                '/prompt', '/ventas/ofertas', '/ventas/pagos', 
                '/payment-gateways', '/cuenta-agente', '/connections', '/configuracion'
              ].some(path => location.pathname.startsWith(path));

              return (
                <ListItemButton
                  onClick={() => setAgenteVentasOpen(!agenteVentasOpen)}
                  sx={{
                    minHeight: 48,
                    justifyContent: drawerOpen ? 'initial' : 'center',
                    px: 2.5,
                    mx: 1,
                    borderRadius: 2,
                    bgcolor: isAgenteVentasActive && !agenteVentasOpen ? 'white' : 'transparent',
                    color: isAgenteVentasActive && !agenteVentasOpen ? 'primary.main' : 'white',
                    '&:hover': {
                      bgcolor: isAgenteVentasActive && !agenteVentasOpen ? 'white' : 'primary.dark',
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 0, mr: drawerOpen ? 3 : 'auto', justifyContent: 'center', color: 'inherit' }}>
                    <StorefrontOutlinedIcon />
                  </ListItemIcon>
                  <ListItemText primary="Agente de Ventas" sx={{ opacity: drawerOpen ? 1 : 0 }} />
                  {drawerOpen ? (agenteVentasOpen ? <ExpandLess /> : <ExpandMore />) : null}
                </ListItemButton>
              );
            })()}
            <Collapse in={agenteVentasOpen && drawerOpen} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                {[
                  { text: 'Info del Negocio', path: '/business-info', icon: <StorefrontOutlinedIcon /> },
                  { text: 'Editar Prompt', path: '/prompt', icon: <PsychologyOutlinedIcon /> },
                  { text: 'Ofertas', path: '/ventas/ofertas', icon: <LocalOfferOutlinedIcon /> },
                  { text: 'Métodos de Pago', path: '/ventas/pagos', icon: <CreditCardOutlinedIcon /> },
                  { text: 'Pasarelas de Pago', path: '/payment-gateways', icon: <SettingsOutlinedIcon /> }, // Usando un ícono genérico
                  { text: 'Cuenta del Agente', path: '/cuenta-agente', icon: <PeopleOutlineOutlinedIcon /> },
                  // El enlace a 'Configuración' ya está en el menú principal, lo quitamos de aquí para evitar duplicados.
                ].map(item => {
                  const isActive = location.pathname === item.path;
                  return (
                    <ListItemButton
                      key={item.text}
                      sx={{
                        pl: 4,
                        mx: 1,
                        borderRadius: 2,
                        bgcolor: isActive ? 'white' : 'transparent',
                        color: isActive ? 'primary.main' : 'white',
                        '&:hover': {
                          bgcolor: isActive ? 'white' : 'primary.dark',
                        },
                      }}
                      onClick={() => navigate(item.path)}
                    >
                      <ListItemIcon sx={{ color: 'inherit' }}>{item.icon}</ListItemIcon>
                      <ListItemText primary={item.text} />
                    </ListItemButton>
                  );
                })}
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
          overflow: 'auto', // Permite el scroll DENTRO del área de contenido
          // ¡AQUÍ LA MAGIA! Añadimos un borde rojo para delimitar el área de trabajo.
          border: '2px dashed red',
        }}>
        <Toolbar />
        <Outlet context={{ websocketUrl: WEBSOCKET_URL, selectedClientId, timeFormat }} /> {/* <-- ¡NUEVO! Pasamos el formato de hora */}
      </Box>
    </Box>
  );
}

export default Layout;
