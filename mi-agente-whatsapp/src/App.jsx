// src/App.jsx
import { useState, useEffect } from 'react';
import './App.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { theme } from './theme';
import { supabase } from './supabaseClient';
import Layout from './components/Layout.jsx';
import ChatPage from './pages/ChatPage.jsx';
import ProductsPage from './pages/VehiclesPage.jsx';
import BusinessInfoPage from './BusinessInfoPage.jsx'; // <-- ¡CORRECCIÓN! Apuntamos al archivo en la raíz de src
import SettingsPage from './pages/SettingsPage.jsx';
import OfertasPage from './pages/OfertasPage.jsx'; // Nueva página
import PagosPage from './pages/PagosPage.jsx';   // Nueva página
import AgentAccountPage from './pages/AgentAccountPage.jsx'; // <-- Página de cuenta del agente
import WhatsappPage from './pages/WhatsappPage.jsx'; // <-- Nueva página de conexión
import PromptPage from './pages/PromptPage.jsx'; // <-- ¡NUEVA PÁGINA!
import LoginPage from './pages/LoginPage.jsx'; // <-- ¡NUEVO! Importamos la página de login
import RegisterPage from './pages/RegisterPage.jsx'; // <-- ¡NUEVO! Importamos la página de registro
import AIChatPage from './pages/AIChatPage.jsx'; // <-- ¡NUEVA PÁGINA DE CHAT IA!
import DashboardPage from './pages/DashboardPage.jsx'; // <-- ¡NUEVA PÁGINA DE DASHBOARD!
import PaymentGatewaysPage from './pages/PaymentGatewaysPage.jsx'; // <-- ¡NUEVA PÁGINA!

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Comprobar la sesión existente al cargar la app
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // 2. Escuchar cambios en el estado de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    // 3. Limpiar la suscripción al desmontar el componente
    return () => subscription.unsubscribe();
  }, []);

  // Mientras se comprueba la sesión, no mostramos nada para evitar parpadeos
  if (loading) {
    return null;
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline /> {/* Normaliza los estilos del navegador */}
      <BrowserRouter>
        <Routes>
          {/* Si no hay sesión, todas las rutas redirigen al login */}
          {!session ? (
            <>
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="*" element={<Navigate to="/login" />} />
            </>
          ) : (
            <>
              {/* Si hay sesión, las rutas protegidas están dentro de Layout */}
              <Route path="/" element={<Layout />}>
                <Route path="dashboard" element={<DashboardPage />} />
                <Route index element={<ChatPage />} />
                <Route path="ia-chat" element={<AIChatPage />} />
                <Route path="vehicles" element={<ProductsPage />} />
                <Route path="ventas/ofertas" element={<OfertasPage />} />
                <Route path="cuenta-agente" element={<AgentAccountPage />} />
                <Route path="prompt" element={<PromptPage />} />
                <Route path="whatsapp" element={<WhatsappPage />} />
                <Route path="ventas/pagos" element={<PagosPage />} />
                <Route path="business-info" element={<BusinessInfoPage />} /> {/* <-- ¡CAMBIO! Ruta para Info del Negocio */}
                <Route path="settings" element={<SettingsPage />} /> {/* <-- ¡NUEVO! Ruta para Configuración */}
                <Route path="payment-gateways" element={<PaymentGatewaysPage />} />
              </Route>
              {/* Si hay sesión y se intenta ir a /login, redirigir a la página principal */}
              <Route path="*" element={<Navigate to="/" />} />
            </>
          )}
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
