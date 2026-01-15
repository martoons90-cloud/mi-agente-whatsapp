import https from 'https';

async function testNativeFetch() {
    console.log('--- TEST NATIVE FETCH ---');
    try {
        const url = 'https://api.mercadolibre.com/sites/MLA/search?category=MLA1744&limit=1';
        console.log('Fetching:', url);

        // Native fetch isn't available in CommonJS without flag in older Node, 
        // but Node 18+ has it global.
        // If this crashes, user is on old Node. But diagnostic said Node v22.

        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json'
            }
        });

        console.log('Status:', res.status);
        if (res.ok) {
            const data = await res.json();
            console.log('Data Length:', data.results?.length);
            console.log('✅ Native Fetch WORKS!');
        } else {
            console.log('❌ Native Fetch Failed:', res.statusText);
        }
    } catch (e) {
        console.error('Error:', e.message);
    }
}

testNativeFetch();
