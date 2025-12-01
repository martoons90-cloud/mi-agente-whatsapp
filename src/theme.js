import { createTheme } from '@mui/material/styles';

// Un tema profesional y serio con tonalidades de azul y gris claro.
export const theme = createTheme({
  palette: {
    mode: 'light', // Cambiamos a modo claro
    primary: {
      main: '#1565c0', // Un azul más corporativo y serio
    },
    secondary: {
      main: '#42a5f5', // Un azul más claro para acentos
    },
    background: {
      default: '#f4f6f8', // Un fondo gris muy claro
      paper: '#ffffff',   // Las superficies como tarjetas serán blancas
    },
    grey: {
      200: '#eeeeee', // Un gris claro para la barra superior
      800: '#424242', // Un gris oscuro para el texto de la barra
    }
  },
  typography: {
    // Reducimos el tamaño de los encabezados para un look más refinado
    h4: {
      fontSize: '1.75rem', // Antes era ~2.125rem
      fontWeight: 400, // Letra normal, no negrita
    },
    h5: {
      fontSize: '1.4rem', // Antes era ~1.5rem
    },
    h6: {
      fontSize: '1.1rem', // Antes era ~1.25rem
    },
  },
  // ¡AQUÍ LA MAGIA! Sobreescribimos estilos de componentes globales.
  components: {
    // Apuntamos al componente de texto de los ítems de lista
    MuiListItemText: {
      styleOverrides: {
        primary: { // Aplicamos el estilo al texto primario
          fontWeight: 300, // Usamos una fuente ligera (light)
        },
      },
    },
  },
});