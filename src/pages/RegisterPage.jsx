import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Link as RouterLink } from 'react-router-dom';
import {
  CssBaseline, Box, Button, TextField, Typography, Container,
  Paper, CircularProgress, Alert, Link
} from '@mui/material';

function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleRegister = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const { data: { user }, error } = await supabase.auth.signUp({
      email: email,
      password: password,
    });

    if (error) {
      setError(error.message);
    } else if (user) {
      // Si el registro es exitoso, actualizamos el perfil con el nombre completo
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ full_name: fullName })
        .eq('id', user.id);

      if (profileError) {
        setError(`Usuario creado, pero hubo un error al guardar el nombre: ${profileError.message}`);
      } else {
        setSuccess('¡Registro exitoso! Ahora puedes iniciar sesión.');
        // Limpiamos los campos
        setEmail('');
        setPassword('');
        setFullName('');
      }
    }
    setLoading(false);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', bgcolor: 'background.default' }}>
      <CssBaseline />
      <Container component="main" maxWidth="xs">
        <Paper elevation={6} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 4 }}>
          <Typography component="h1" variant="h5">
            Crear Cuenta
          </Typography>
          <Box component="form" onSubmit={handleRegister} noValidate sx={{ mt: 1 }}>
            <TextField margin="normal" required fullWidth id="fullName" label="Nombre Completo" name="fullName" autoComplete="name" autoFocus value={fullName} onChange={(e) => setFullName(e.target.value)} disabled={loading} />
            <TextField margin="normal" required fullWidth id="email" label="Correo Electrónico" name="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} />
            <TextField margin="normal" required fullWidth name="password" label="Contraseña" type="password" id="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} />
            
            {error && <Alert severity="error" sx={{ mt: 2, width: '100%' }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mt: 2, width: '100%' }}>{success}</Alert>}

            <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }} disabled={loading}>
              {loading ? <CircularProgress size={24} /> : 'Registrarse'}
            </Button>
            <Typography variant="body2" align="center">
              ¿Ya tienes una cuenta?{' '}
              <Link component={RouterLink} to="/login" variant="body2">
                Inicia sesión aquí
              </Link>
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}

export default RegisterPage;