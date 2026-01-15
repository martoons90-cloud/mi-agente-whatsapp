import axios from 'axios';

async function test() {
    console.log('--- INSPECT CATEGORY ---');
    try {
        const url = 'https://api.mercadolibre.com/categories/MLA1744';
        console.log('Fetching:', url);
        const res = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        console.log('Status:', res.status);
        console.log('Name:', res.data.name);

        // Check for attributes or filters
        if (res.data.settings) {
            console.log('Settings:', JSON.stringify(res.data.settings, null, 2));
        }

        // Do we have children_categories?
        if (res.data.children_categories && res.data.children_categories.length > 0) {
            console.log('Children:', res.data.children_categories.length);
        } else {
            console.log('No children categories.');
        }

        // Try to find where brands are listed. 
        // Often 'attributes' in the category detail might list allowed values for 'BRAND'.

    } catch (error) {
        console.error('Error:', error.message);
    }
}

test();
