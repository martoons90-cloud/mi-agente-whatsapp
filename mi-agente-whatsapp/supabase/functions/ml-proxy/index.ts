// Setup CORS headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const url = new URL(req.url);

        // Usage: /ml-proxy?path=sites/MLA/search&query=category=MLA1744...
        const path = url.searchParams.get('path');
        const query = url.searchParams.get('query');

        if (!path) {
            throw new Error('Missing "path" parameter');
        }

        const mlUrl = `https://api.mercadolibre.com/${path}?${query || ''}`;
        console.log(`[Proxy] Forwarding to: ${mlUrl}`);

        // Construct Headers
        // We use a generic Mozilla UA to look like a browser
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json'
        };

        // Forward Authorization header if present
        const authHeader = req.headers.get('Authorization');
        if (authHeader) {
            headers['Authorization'] = authHeader;
        }

        const response = await fetch(mlUrl, { headers });
        const data = await response.json();

        return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: response.status,
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }
});
