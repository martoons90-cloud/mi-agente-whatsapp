import fs from 'fs';
import axios from 'axios';

const tokenFile = './ml_tokens.json';
if (!fs.existsSync(tokenFile)) { process.exit(1); }
const tokens = JSON.parse(fs.readFileSync(tokenFile, 'utf8'));

async function test() {
    try {
        const url = 'https://api.mercadolibre.com/categories/MLA1744/attributes';
        const res = await axios.get(url, {
            headers: {
                'Authorization': `Bearer ${tokens.access_token}`,
                'User-Agent': 'Mozilla/5.0'
            }
        });

        const model = res.data.find(a => a.id === 'MODEL');
        if (model && model.values && model.values.length > 0) {
            console.log('Model Value Sample:', JSON.stringify(model.values[0], null, 2));
        } else {
            console.log('No model values found.');
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}
test();
