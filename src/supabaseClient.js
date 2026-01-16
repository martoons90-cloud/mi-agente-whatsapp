// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

// Estas claves deberían estar en un archivo .env.local para más seguridad
// usando import.meta.env.VITE_SUPABASE_URL y import.meta.env.VITE_SUPABASE_ANON_KEY
const supabaseUrl = 'https://gljqujylxootxmzsuogp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdsanF1anlseG9vdHhtenN1b2dwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2NTc2MDQsImV4cCI6MjA3ODIzMzYwNH0.nyTMuATxLb_QJD5ZLJQo6dOCSCnR2wGmVxLmFWiEEG8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);