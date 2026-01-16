export const config = {
    // En producción (DonWeb), usaremos la variable de entorno VITE_API_URL.
    // En local, usamos localhost:8081.
    apiBaseUrl: import.meta.env.VITE_API_URL || 'https://whatsapp-backend-jcf0.onrender.com',
};
