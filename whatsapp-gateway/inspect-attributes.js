import axios from 'axios';

async function test() {
    console.log('--- INSPECT ATTRIBUTES ---');
    try {
        const url = 'https://api.mercadolibre.com/categories/MLA1744/attributes';
        console.log('Fetching:', url);
        const res = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        console.log('Status:', res.status);
        console.log('Total Attributes:', res.data.length);

        // Find BRAND
        const brand = res.data.find(a => a.id === 'BRAND');
        if (brand) {
            console.log('Found BRAND attribute.');
            if (brand.values && brand.values.length > 0) {
                console.log('Brand Values Count:', brand.values.length);
                console.log('First 3:', JSON.stringify(brand.values.slice(0, 3)));
            } else {
                console.log('BRAND has no values listed directly.');
            }
        } else {
            console.log('BRAND attribute not found.');
        }

        // Find MODEL
        const model = res.data.find(a => a.id === 'MODEL');
        if (model) {
            console.log('Found MODEL attribute.');
            if (model.values && model.values.length > 0) {
                console.log('Model Values Count:', model.values.length);
            } else {
                console.log('MODEL has no values listed directly.');
            }
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

test();
