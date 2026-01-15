import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testToken() {
    console.log('--- TEST DE TOKEN ---');
    try {
        const tokenPath = path.join(__dirname, 'ml_tokens.json');
        if (!fs.existsSync(tokenPath)) {
            console.error('❌ No se encontró ml_tokens.json. Logueate primero.');
            return;
        }

        const tokens = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
        console.log('Token encontrado. Access Token (inicio):', tokens.access_token.substring(0, 15) + '...');

        console.log('Probando GET /users/me (Datos de Usuario)...');
        const resMe = await axios.get('https://api.mercadolibre.com/users/me', {
            headers: { Authorization: `Bearer ${tokens.access_token}` }
        });
        console.log('✅ /users/me FUNCIONA. Status:', resMe.status);
        console.log('Usuario:', resMe.data.nickname);

        console.log('\nProbando GET /sites/MLA/search (Búsqueda)...');
        const resSearch = await axios.get('https://api.mercadolibre.com/sites/MLA/search?category=MLA1744&limit=1', {
            headers: { Authorization: `Bearer ${tokens.access_token}` }
        });
        console.log('✅ /sites/MLA/search FUNCIONA. Status:', resSearch.status);

    } catch (error) {
        console.error('❌ FALLÓ:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

testToken();
