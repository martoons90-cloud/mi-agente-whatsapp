// verify_db.js
import { createClient } from '@supabase/supabase-js';

// Usamos las credenciales públicas (ANON) que vimos en el proyecto
const SUPABASE_URL = 'https://gljqujylxootxmzsuogp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdsanF1anlseG9vdHhtenN1b2dwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2NTc2MDQsImV4cCI6MjA3ODIzMzYwNH0.nyTMuATxLb_QJD5ZLJQo6dOCSCnR2wGmVxLmFWiEEG8';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkTables() {
    console.log('--- Verificando estado de la Base de Datos ---');

    // 1. Verificar tabla 'vehicles'
    console.log('\n[1] Consultando tabla "vehicles"...');
    const { data: vehicles, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('count', { count: 'exact', head: true });

    if (vehiclesError) {
        if (vehiclesError.code === '42P01') { // undefined_table
            console.error('❌ La tabla "vehicles" NO EXISTE. Debes ejecutar el script SQL.');
        } else {
            console.error('❌ Error accediendo a "vehicles":', vehiclesError.message);
        }
    } else {
        console.log('✅ La tabla "vehicles" EXISTE y es accesible.');
    }

    // 2. Verificar tabla 'products' (debería no existir o estar ahí si no la borraron)
    console.log('\n[2] Consultando tabla "products"...');
    const { error: productsError } = await supabase
        .from('products')
        .select('count', { count: 'exact', head: true });

    if (productsError && productsError.code === '42P01') {
        console.log('✅ La tabla "products" YA NO EXISTE (Correcto si ejecutaste el borrado).');
    } else if (!productsError) {
        console.log('ℹ️ La tabla "products" TODAVÍA EXISTE. (Puedes borrarla si ya no la usas).');
    } else {
        console.log('ℹ️ Estado de "products":', productsError.message);
    }

    // 3. Verificar funcion RPC 'match_vehicles'
    console.log('\n[3] Verificando función RPC match_vehicles...');
    // Intentamos una llamada dummy que fallará por argumentos pero confirmará existencia
    const { error: rpcError } = await supabase.rpc('match_vehicles', {
        query_embedding: [],
        match_threshold: 0,
        match_count: 1,
        p_client_id: '00000000-0000-0000-0000-000000000000'
    });

    // Si el error es "function not found", no existe. Si es error de argumentos/postgres, existe.
    if (rpcError && rpcError.code === '42883') { // undefined_function
        console.error('❌ La función RPC "match_vehicles" NO EXISTE. Debes ejecutar el SQL.');
    } else {
        console.log('✅ La función RPC "match_vehicles" PARECE EXISTIR (o dio error de args que implica existencia).');
    }
}

checkTables();
