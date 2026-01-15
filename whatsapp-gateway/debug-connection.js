import axios from 'axios';

async function runDiagnostics() {
    console.log('\n--- DIAGNÓSTICO DE CONEXIÓN (BACKEND) ---\n');
    console.log('⚠️ NOTA: Este script solo prueba el SERVIDOR.');
    console.log('⚠️ Si la App tiene "Luz Verde", IGNORA los errores de aquí.');
    console.log('⚠️ La App ahora se conecta DIRECTO desde tu navegador (Priority 1).\n');

    // 1. Test Backend Check
    try {
        console.log('[1/4] Probando Backend Local (Localhost:8081)...');
        const res = await axios.get('http://localhost:8081/api/health'); // Just to see if it responds (it redirects usually)
        console.log('✅ Backend ONLINE y respondiendo.');
    } catch (e) {
        if (e.response && e.response.status === 302) {
            console.log('✅ Backend ONLINE (Redirección detectada, es normal en /auth).');
        } else if (e.code === 'ECONNREFUSED') {
            console.error('❌ CRÍTICO: El Backend NO está corriendo. Ejecuta "npm start" en whatsapp-gateway.');
            return;
        } else {
            console.log('⚠️ Backend responde con error:', e.message);
        }
    }

    // 2. Test ML Proxy (via Backend)
    try {
        console.log('\n[2/4] Probando Endpoint /api/ml/brands (Tu Proxy Interno)...');
        const start = Date.now();
        const res = await axios.get('http://localhost:8081/api/ml/brands');
        const duration = Date.now() - start;

        console.log(`✅ ÉXITO: Recibidos ${res.data.length} marcas.`);
        console.log(`⏱️ Tiempo de respuesta: ${duration}ms`);
        console.log('📦 Ejemplo de dato:', res.data[0]);
    } catch (e) {
        console.error('❌ FALLO en Proxy:', e.message);
        if (e.response) {
            console.error('   Status Code:', e.response.status);
            console.error('   Data:', e.response.data);
            if (e.response.status === 401 || e.response.status === 403) {
                console.error('   🛑 BLOQUEO: MercadoLibre rechazó la conexión del Backend.');
            }
        }
    }

    // 3. Test Public Proxy (AllOrigins)
    try {
        console.log('\n[3/4] Probando Proxy Público (Ruta de Escape)...');
        const target = 'https://api.mercadolibre.com/sites/MLA/search?category=MLA1744&limit=1';
        const url = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(target);
        const res = await axios.get(url);
        console.log(`✅ ÉXITO: Public Proxy contactó a ML.`);
        console.log('   Status:', res.status);
    } catch (e) {
        console.error('⚠️ Public Proxy falló:', e.message);
    }

    // 4. Test Direct Internet
    try {
        console.log('\n[4/4] Probando salida a Internet (Google)...');
        await axios.get('https://www.google.com');
        console.log('✅ Internet OK.');
    } catch (e) {
        console.error('❌ Sin Internet:', e.message);
    }

    console.log('\n--- FIN DEL DIAGNÓSTICO ---');
}

runDiagnostics();
