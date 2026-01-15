import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

import { fileURLToPath } from 'url';
import fs from 'fs';
import makeWASocket, { DisconnectReason, Browsers, useMultiFileAuthState } from '@whiskeysockets/baileys'; // prettier-ignore
import { createClient } from '@supabase/supabase-js';
import { WebSocketServer } from 'ws';
import pino from 'pino';
import { GoogleGenerativeAI } from '@google/generative-ai';
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import { createServer } from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const {
  SUPABASE_URL = 'https://gljqujylxootxmzsuogp.supabase.co',
  SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdsanF1anlseG9vdHhtenN1b2dwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2NTc2MDQsImV4cCI6MjA3ODIzMzYwNH0.nyTMuATxLb_QJD5ZLJQo6dOCSCnR2wGmVxLmFWiEEG8',
  WEBSOCKET_PORT = 8081,
  SESSION_DIR = './session_data',
  ML_APP_ID,
  ML_CLIENT_SECRET,
  ML_REDIRECT_URI
} = process.env;

let CLIENT_ID = null;
let supabase = null;
if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  console.log('[DB] Cliente de Supabase inicializado.');
} else {
  console.warn('*********************************************************************');
  console.warn('ADVERTENCIA: Variables de Supabase no encontradas en .env.');
  console.warn("La aplicación se ejecutará en 'modo offline'.");
  console.warn('*********************************************************************');
}

// --- TOKEN MANAGEMENT ---
const TOKEN_FILE = path.join(__dirname, 'ml_tokens.json');
let mlTokens = null;

const loadTokens = () => {
  try {
    if (fs.existsSync(TOKEN_FILE)) {
      const data = fs.readFileSync(TOKEN_FILE, 'utf8');
      mlTokens = JSON.parse(data);
    }
  } catch (err) {
    console.error('Error loading tokens:', err);
  }
};

const saveTokens = (tokens) => {
  try {
    mlTokens = tokens;
    fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2));
  } catch (err) {
    console.error('Error saving tokens:', err);
  }
};

loadTokens();

// --- EXPRESS SERVER & PROXY ---
const app = express();
app.use(cors());
app.use(express.json());

// 1. Auth Endpoint - Redirects user to ML Login
app.get('/auth', (req, res) => {
  if (!ML_APP_ID || !ML_REDIRECT_URI) {
    return res.send('Faltan configurar ML_APP_ID o ML_REDIRECT_URI en .env');
  }
  const authUrl = `https://auth.mercadolibre.com.ar/authorization?response_type=code&client_id=${ML_APP_ID}&redirect_uri=${ML_REDIRECT_URI}&scope=read write offline_access`;
  res.redirect(authUrl);
});

// 2. Callback Endpoint - Exchanges Code for Token
app.get('/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.send('No code received');

  try {
    const response = await axios.post('https://api.mercadolibre.com/oauth/token', {
      grant_type: 'authorization_code',
      client_id: ML_APP_ID,
      client_secret: ML_CLIENT_SECRET,
      code: code,
      redirect_uri: ML_REDIRECT_URI
    }, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    saveTokens(response.data);
    res.send('<h1>¡Autenticación Exitosa!</h1><p>Ya puedes cerrar esta ventana y usar el buscador de autos.</p>');
    console.log('[ML] Tokens received and saved.');
  } catch (error) {
    console.error('[ML] Auth Error:', error.response?.data || error.message);
    res.send('Error en autenticación: ' + JSON.stringify(error.response?.data || error.message));
  }
});

// Middleware to Refresh Token if expired
const ensureAuth = async () => {
  if (!mlTokens) return false;
  // Simple check, or just try functionality. Ideally check expiry.
  return true;
};

// Enhanced User-Agent Pool (Latest Chrome/Edge)
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edge/121.0.0.0'
];

const getRandomHeaders = () => {
  return {
    'User-Agent': USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Accept-Language': 'es-419,es;q=0.9,en;q=0.8',
    'Cache-Control': 'max-age=0',
    'Sec-Ch-Ua': '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1'
  };
};

// Proxy Route for MercadoLibre
// Proxy Route for MercadoLibre
app.get('/api/ml/brands', async (req, res) => {
  console.log('[API] -> Solicitud recibida en /api/ml/brands');
  try {
    const headers = getRandomHeaders();
    if (mlTokens?.access_token) {
      console.log('[API] Usando Token guardado.');
      headers['Authorization'] = `Bearer ${mlTokens.access_token}`;
    } else {
      console.log('[API] No hay token, usando modo anónimo.');
    }

    const response = await axios.get('https://api.mercadolibre.com/sites/MLA/search', {
      params: { category: 'MLA1744' },
      headers: headers
    });

    console.log('[API] ✅ Respuesta exitosa de ML (Intento 1).');

    const brandFilter = response.data.available_filters.find(f => f.id === 'BRAND');
    if (!brandFilter) return res.json([]);

    const brands = brandFilter.values.sort((a, b) => a.name.localeCompare(b.name));
    res.json(brands);
  } catch (error) {
    console.warn(`[API] ⚠️ Error en Intento 1: ${error.message} (Status: ${error.response?.status})`);

    // Retry Logic
    if (error.response?.status === 401 || error.response?.status === 403) {
      console.warn('[API] 🔄 Reintentando ANÓNIMAMENTE (sin token)...');
      try {
        const cleanHeaders = getRandomHeaders();
        const response = await axios.get('https://api.mercadolibre.com/sites/MLA/search', {
          params: { category: 'MLA1744' },
          headers: cleanHeaders
        });

        console.log('[API] ✅ Respuesta exitosa en REINTENTO anónimo.');

        const brandFilter = response.data.available_filters.find(f => f.id === 'BRAND');
        if (!brandFilter) return res.json([]);
        const brands = brandFilter.values.sort((a, b) => a.name.localeCompare(b.name));
        return res.json(brands);
      } catch (retryError) {
        console.error(`[API] ❌ Reintento anónimo FALLÓ: ${retryError.message}`);
        return res.status(401).json({
          error: 'Unauthorized/Blocked',
          detail: 'Anonymous Retry Failed',
          debug_msg: retryError.message,
          status_code: retryError.response?.status
        });
      }
    }

    console.error('Error fetching brands:', error.message);
    if (error.response?.status === 401 || error.response?.status === 403) {
      res.status(401).json({
        error: 'Unauthorized/Blocked',
        detail: 'Original Request Failed',
        debug_msg: error.message
      });
    } else {
      res.status(500).json({ error: 'Failed to fetch brands' });
    }
  }
});

app.get('/api/ml/models', async (req, res) => {
  const { brandId } = req.query;
  if (!brandId) return res.status(400).json({ error: 'brandId required' });

  try {
    const headers = getRandomHeaders();
    if (mlTokens?.access_token) {
      headers['Authorization'] = `Bearer ${mlTokens.access_token}`;
    }

    const response = await axios.get('https://api.mercadolibre.com/sites/MLA/search', {
      params: { category: 'MLA1744', BRAND: brandId },
      headers: headers
    });

    const modelFilter = response.data.available_filters.find(f => f.id === 'MODEL');
    if (!modelFilter) return res.json([]);

    const models = modelFilter.values.sort((a, b) => a.name.localeCompare(b.name));
    res.json(models);
  } catch (error) {
    console.error('Error fetching models:', error.message);
    res.status(500).json({ error: 'Failed to fetch models' });
  }
});

app.get('/api/ml/versions', async (req, res) => {
  const { brandId, modelId, yearId } = req.query;
  // Year is optional but highly recommended for better filtering
  if (!brandId || !modelId) return res.status(400).json({ error: 'brandId and modelId required' });

  try {
    const headers = getRandomHeaders();
    if (mlTokens?.access_token) {
      headers['Authorization'] = `Bearer ${mlTokens.access_token}`;
    }

    const params = {
      category: 'MLA1744',
      BRAND: brandId,
      MODEL: modelId
    };

    if (yearId) {
      params.VEHICLE_YEAR = yearId;
    }

    const response = await axios.get('https://api.mercadolibre.com/sites/MLA/search', {
      params: params,
      headers: headers
    });

    let versions = [];
    // Prioritize specific version filters
    const versionFilter = response.data.available_filters.find(f => f.id === 'VEHICLE_VERSION' || f.id === 'TRIM');

    if (versionFilter) {
      versions = versionFilter.values.map(v => ({ id: v.id, name: v.name }));
    } else {
      // If no version filter found, it might be because the search is too broad or too narrow.
      // Or maybe check 'results' titles if list is short?
      // For now, if no detailed version found, return empty or fallback.
      // If year was passed, we expect specific versions.
    }

    let bodyType = 'sedan';
    const vehicleTypeFilter = response.data.available_filters.find(f => f.id === 'VEHICLE_BODY_TYPE');
    if (vehicleTypeFilter && vehicleTypeFilter.values.length > 0) {
      bodyType = vehicleTypeFilter.values[0].name;
    }

    res.json({ versions, bodyType });

  } catch (error) {
    console.error('Error fetching versions:', error.message);
    res.status(500).json({ error: 'Failed to fetch versions' });
  }
});

// Create HTTP Server
const server = createServer(app);

// Initialize WebSocket on the same server
const wss = new WebSocketServer({ server });

console.log(`[SERVER] Servidor HTTP y WebSocket iniciando...`);

// --- MEMORIA DE CONVERSACIÓN ---
const conversationHistories = new Map();
const MAX_HISTORY_LENGTH = 20;

let sock;
let lastKnownQR = null;

const broadcast = (data) => {
  const message = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === client.OPEN) {
      client.send(message);
    }
  });
};

wss.on('connection', ws => {
  console.log('[WSS] Cliente de Frontend conectado.');
  ws.on('close', () => console.log('[WSS] Cliente de Frontend desconectado.'));
  ws.on('message', async (message) => {
    try {
      const parsedMessage = JSON.parse(message);
      if (parsedMessage.type === 'logout' && sock) {
        console.log('[WSS] Recibida solicitud de logout desde el frontend.');
        await sock.logout();
        console.log('[BAILEYS] Sesión cerrada. Limpiando para un reinicio limpio.');
        process.exit(0);
      } else if (parsedMessage.type === 'request_status') {
        console.log('[WSS] Solicitud de estado recibida. Enviando QR si existe.');
        if (lastKnownQR) {
          ws.send(JSON.stringify({ type: 'qr', data: lastKnownQR }));
        }
      }
    } catch (e) {
      console.error('[WSS] Error procesando mensaje del frontend:', e);
    }
  });
});

let retryCount = 0;
const MAX_RETRY_COUNT = 5;

async function startSock() {
  console.log('[BAILEYS] Iniciando socket...');
  const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);

  sock = makeWASocket({
    auth: state,
    browser: Browsers.macOS('Desktop'),
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    syncFullHistory: false,
  });

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      lastKnownQR = qr;
      console.log('[BAILEYS] Código QR recibido, enviando a frontend.');
      broadcast({ type: 'qr', data: qr });
    }

    if (connection === 'close') {
      const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('[BAILEYS] Conexión cerrada debido a:', lastDisconnect.error, ', reconectando:', shouldReconnect);
      if (shouldReconnect) {
        if (retryCount < MAX_RETRY_COUNT) {
          retryCount++;
          setTimeout(startSock, 3000);
        } else {
          console.error('[BAILEYS] Max failed retries reached. Stopping WhatsApp attempts but keeping Server alive...');
          // process.exit(1); // REMOVED to keep API alive
        }
      } else {
        console.log('[BAILEYS] Desconectado. Borrando sesión...');
        // process.exit(0); // REMOVED to keep API alive
      }
    } else if (connection === 'open') {
      console.log('[BAILEYS] Conexión abierta exitosamente.');
      retryCount = 0;
      broadcast({ type: 'status', data: 'connected' });

      const userJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
      CLIENT_ID = userJid;
      console.log(`[BAILEYS] Identificado como: ${userJid}`);
    }
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (!msg.message) continue;
      console.log('[BAILEYS] Mensaje recibido (log simple).');
    }
  });
}

startSock();

server.listen(WEBSOCKET_PORT, () => {
  console.log(`[SERVER] Escuchando en el puerto ${WEBSOCKET_PORT}`);
});
