import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Link as RouterLink } from 'react-router-dom';
import {
  CssBaseline,
  Box, Button, TextField, Typography, Container, Link,
  Paper, CircularProgress, Alert
} from '@mui/material';

function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      setError(error.message);
    }
    // Si el login es exitoso, el onAuthStateChange en App.jsx se encargará de la redirección.
    setLoading(false);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        bgcolor: 'background.default', // Usamos el color de fondo del tema
      }}
    >
      <CssBaseline />
      <Container component="main" maxWidth="xs">
        <Paper
          elevation={6}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: 4,
          }}
        >
        <Typography component="h1" variant="h5">
          Iniciar Sesión
        </Typography>
        <Box component="form" onSubmit={handleLogin} noValidate sx={{ mt: 1 }}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Correo Electrónico"
            name="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Contraseña"
            type="password"
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
          {error && <Alert severity="error" sx={{ mt: 2, width: '100%' }}>{error}</Alert>}
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Ingresar'}
          </Button>
          <Typography variant="body2" align="center">
            ¿No tienes una cuenta?{' '}
            <Link component={RouterLink} to="/register" variant="body2">
              Regístrate aquí
            </Link>
          </Typography>
        </Box>
        </Paper>
      </Container>
    </Box>
  );
}

export default LoginPage;