import fs from 'fs';
import axios from 'axios';

const tokenFile = './ml_tokens.json';
if (!fs.existsSync(tokenFile)) { process.exit(1); }
const tokens = JSON.parse(fs.readFileSync(tokenFile, 'utf8'));

async function test() {
    console.log('--- TEST ATTRIBUTES WITH TOKEN ---');
    try {
        const url = 'https://api.mercadolibre.com/categories/MLA1744/attributes';
        const res = await axios.get(url, {
            headers: {
                'Authorization': `Bearer ${tokens.access_token}`,
                'User-Agent': 'Mozilla/5.0'
            }
        });
        console.log('Status:', res.status);

        const brand = res.data.find(a => a.id === 'BRAND');
        if (brand) console.log('Brand Values:', brand.values ? brand.values.length : 0);

        const model = res.data.find(a => a.id === 'MODEL');
        if (model) console.log('Model Values:', model.values ? model.values.length : 0);

    } catch (error) {
        console.error('Error:', error.message, error.response?.status);
    }
}
test();
