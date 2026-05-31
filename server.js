const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const { exec } = require('child_process');
const path = require('path');
const os = require('os'); // <--- Neu importiert für Server-IPs

const app = express();
const server = http.createServer(app);

const io = socketIO(server);

// Statische Dateien
app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
    // Client-IP auslesen (beachtet auch Proxies)

    const clientIp = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;
    console.log(`Client verbunden von IP: ${clientIp}`);

    // ----------------------------------------
    // HISTORY (RRD via Python)
    // ----------------------------------------
    socket.on('get_history', () => {
        exec(
            'python3 read_rrd.py ShellyPStripG4-98A3167B61A0.rrd',
            (err, stdout, stderr) => {
                if (err) {
                    socket.emit('history_error', stderr);
                    return;
                }

                try {
                    const data = JSON.parse(stdout);
                    socket.emit('history', data);
                } catch (e) {
                    socket.emit('history_error', 'JSON Fehler');
                }
            }
        );
    });

    // ----------------------------------------
    // LIVE DEVICE DATA
    // ----------------------------------------
    const liveInterval = setInterval(() => {
        const live = {
            timestamp: Date.now(),
            power: 10 + Math.random() * 20,
            voltage: 229 + Math.random()
        };
        socket.emit('live_data', live);
    }, 1000);

    socket.on('disconnect', () => {
        // Intervall aufräumen, wenn der Client die Verbindung trennt
        clearInterval(liveInterval); 
        console.log(`Client von IP ${clientIp} getrennt`);
    });
});

// Server starten und alle verfügbaren IPs loggen
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server läuft auf Port ${PORT}`);
    console.log('Verfügbare IP-Adressen des Servers:');
    
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            // Nur IPv4 anzeigen und interne (Loopback) Adressen wie 127.0.0.1 ignorieren
            if (net.family === 'IPv4' && !net.internal) {
                console.log(`  - http://${net.address}:${PORT}`);
            }
        }
    }
    console.log(`  - http://localhost:${PORT} (Lokal)`);
});