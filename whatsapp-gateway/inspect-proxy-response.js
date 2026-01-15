import axios from 'axios';

async function inspect() {
    console.log('--- INSPECCIONANDO RESPUESTA DE CORSPROXY.IO ---');
    try {
        const target = 'https://api.mercadolibre.com/sites/MLA/search?category=MLA1744&limit=1';
        // Note: corsproxy.io usage is https://corsproxy.io/?<url_verbatim>
        const url = 'https://corsproxy.io/?' + encodeURIComponent(target);

        console.log('Target URL:', target);
        console.log('Proxy URL:', url);

        const res = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });

        console.log('\nStatus:', res.status);
        console.log('Headers:', res.headers);
        console.log('\n--- BODY START ---');
        console.log(JSON.stringify(res.data, null, 2).substring(0, 1000));
        console.log('--- BODY END ---');

        if (res.data.results) {
            console.log('\n✅ "results" array FOUND. Length:', res.data.results.length);
        } else {
            console.log('\n❌ "results" array NOT FOUND.');
        }

    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) {
            console.log('Response Status:', error.response.status);
            console.log('Response Data:', error.response.data);
        }
    }
}

inspect();
