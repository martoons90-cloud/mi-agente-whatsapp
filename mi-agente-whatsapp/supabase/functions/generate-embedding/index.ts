// supabase/functions/generate-embedding/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { text } = await req.json();

        if (!text) {
            throw new Error('No text provided');
        }

        const genAI = new GoogleGenerativeAI(Deno.env.get('GOOGLE_API_KEY')!);
        const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });

        const result = await model.embedContent(text);
        const embedding = result.embedding.values;

        return new Response(JSON.stringify({ embedding }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }
});
