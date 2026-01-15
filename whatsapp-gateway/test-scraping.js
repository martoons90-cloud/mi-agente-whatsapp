import { gotScraping } from 'got-scraping';

async function testBypass() {
    console.log('--- TEST DE BYPASS CON GOT-SCRAPING ---');
    try {
        const url = 'https://api.mercadolibre.com/sites/MLA/search?category=MLA1744&limit=1';
        console.log('Target:', url);

        // got-scraping automatically manages headers and TLS fingerprints to look like a real browser
        const response = await gotScraping({
            url,
            headerGeneratorOptions: {
                browsers: [{ name: 'chrome', minVersion: 110 }],
                devices: ['desktop'],
                locales: ['es-AR', 'en-US']
            }
        });

        console.log('Status Code:', response.statusCode);
        console.log('Body Length:', response.body.length);

        const data = JSON.parse(response.body);
        if (data.results) {
            console.log('✅ ÉXITO: Datos recibidos correctamente.');
            console.log('Ejemplo:', data.results[0]?.title);
        } else {
            console.log('⚠️ Respuesta recibida pero estructura inesperada.');
        }

    } catch (error) {
        console.error('❌ FALLO:', error.message);
        if (error.response) {
            console.error('Status:', error.response.statusCode);
            console.error('Body:', error.response.body);
        }
    }
}

testBypass();
