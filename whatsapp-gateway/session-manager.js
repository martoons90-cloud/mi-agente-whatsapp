// c:\Users\Martin\whatsapp-gateway\session-manager.js
import fs from 'fs';
import { proto, initAuthCreds, BufferJSON } from '@whiskeysockets/baileys';

const SESSION_FILE_PATH = './session.json';

export const useSingleFileAuthState = () => {
    let creds;
    let keys = {};

    // Cargar la sesión si existe
    if (fs.existsSync(SESSION_FILE_PATH)) {
        const data = JSON.parse(fs.readFileSync(SESSION_FILE_PATH, { encoding: 'utf-8' }), BufferJSON.reviver);
        creds = data.creds;
        keys = data.keys;
    } else {
        creds = initAuthCreds();
    }

    const saveState = () => {
        const data = { creds, keys };
        fs.writeFileSync(SESSION_FILE_PATH, JSON.stringify(data, BufferJSON.replacer, 2));
    };

    return {
        state: {
            creds,
            keys: {
                get: (type, ids) => {
                    const key = `${type}:${ids.join(':')}`;
                    return keys[key];
                },
                set: (data) => {
                    Object.assign(keys, data);
                    saveState();
                },
            },
        },
        saveState,
    };
};
