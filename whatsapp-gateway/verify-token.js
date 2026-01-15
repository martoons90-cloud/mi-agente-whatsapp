import axios from 'axios';

async function test() {
    console.log('--- START TEST PUBLIC ---');
    const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

    try {
        console.log('1. Testing /sites/MLA/categories (No Token)...');
        const cats = await axios.get('https://api.mercadolibre.com/sites/MLA/categories', {
            headers: { 'User-Agent': UA }
        });
        console.log('SUCCESS Categories. Status:', cats.status);
    } catch (error) {
        console.error('FAIL Categories:', error.response?.status);
    }

    try {
        console.log('\n2. Testing /sites/MLA/search (No Token)...');
        const search = await axios.get('https://api.mercadolibre.com/sites/MLA/search', {
            params: { category: 'MLA1744', limit: 1 },
            headers: { 'User-Agent': UA }
        });
        console.log('SUCCESS Search (No Token). Found:', search.data.results.length);
    } catch (error) {
        console.error('FAIL Search (No Token):', error.response?.status);
    }
    console.log('--- END TEST PUBLIC ---');
}

test();
