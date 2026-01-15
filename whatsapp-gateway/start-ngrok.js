import ngrok from 'ngrok';

(async function () {
    try {
        await ngrok.kill();
        const url = await ngrok.connect({
            proto: 'http',
            addr: 8080,
            authtoken: '38CuPPYMYcXnoT6VtarEQl6Dipv_4ssj5BcSzSxgYcaUtbPJo'
        });
        console.log("NGROK_URL_IS:" + url);
    } catch (e) {
        console.error("NGROK_ERROR:", e);
    }
})();
