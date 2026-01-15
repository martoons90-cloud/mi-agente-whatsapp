import axios from 'axios';

async function test() {
    console.log('--- TEST CORS PROXY ---');
    try {
        // corsproxy.io usage: https://corsproxy.io/?<url>
        const target = 'https://api.mercadolibre.com/sites/MLA/search?category=MLA1744&limit=1';
        const url = 'https://corsproxy.io/?' + encodeURIComponent(target);
        // Note: corsproxy.io often expects unencoded? Let's try raw first if axios supports it, 
        // but encoding is safer for query params. 
        // Actually corsproxy.io docs say just append. "https://corsproxy.io/?https://..."

        const rawUrl = 'https://corsproxy.io/?' + target;

        console.log('Fetching:', rawUrl);
        const res = await axios.get(rawUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        console.log('Status:', res.status);
        console.log('Results:', res.data.results ? res.data.results.length : 'N/A');
    } catch (error) {
        console.log('Error:', error.message);
        if (error.response) console.log('Response:', error.response.status);
    }
}

test();
