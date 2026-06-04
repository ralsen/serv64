const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const { exec } = require('child_process');
const path = require('path');
const os = require('os'); // <--- Neu importiert für Server-IPs
const log4js = require('log4js');

const app = express();

const server = http.createServer(app);

const io = socketIO(server);


log4js.configure({
    appenders: { 
    file: { type: 'file', filename: './log/'+path.basename(process.argv[1]).replace('.js', '')+'_'+os.hostname()+'-'+new Date().toISOString().slice(0, 10).replace(/-/g, '_')+'.log' },
    console: { type: 'console' } 
    },
    categories: { 
    default: { appenders: ['file', 'console'], level: 'debug' } 
    }
});

const logger = log4js.getLogger(); 

// ✅ Punkt 4: Prüfe das Arbeitsverzeichnis
logger.info(`Arbeitsverzeichnis (cwd): ${process.cwd()}`);

// Statische Dateien
app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
    // Client-IP auslesen (beachtet auch Proxies)

    const clientIp = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;
    logger.info(`Neuer Client verbunden von IP: ${clientIp}`);

    // ✅ Punkt 6: Teste, ob exec funktioniert
    exec('echo "Test" && echo "Python is called" >&2', (err, stdout, stderr) => {
        logger.info(`✅ exec Test - stdout: ${stdout}`);
        logger.info(`❌ exec Test - stderr: ${stderr}`);
        if (err) {
            logger.error(`❌ exec Test fehlgeschlagen: ${err.message}`);
        }
    });    
    // ----------------------------------------
    // HISTORY (RRD via Python)
    // ----------------------------------------
socket.on('get_history', () => {
        logger.info('get_history Event empfangen. Starte RRD-Skript...');
        
        exec(
            'python3 read_rrd.py ShellyPStripG4-98A3167B61A0.rrd',
            (error, stdout, stderr) => {
                // Falls beim Ausführen des Skripts (z.B. Datei nicht gefunden) ein Fehler auftritt
                if (error) {
                    logger.error(`Exec-Fehler beim Aufruf von Python: ${error.message}`);
                    socket.emit('get_history_error', 'Python-Skript konnte nicht ausgeführt werden.');
                    return;
                }
                if (stderr) {
                    logger.error(`Python-Fehlerausgabe (stderr): ${stderr}`);
                    socket.emit('get_history_error', 'Python meldet einen internen Fehler.');
                    return;
                }

                try {
                    // .trim() entfernt unsichtbare Leerzeichen und Zeilenumbrüche vor/nach dem JSON
                    const cleanedStdout = stdout.trim();
                    
                    // JSON parsen und an Client senden
                    const data = JSON.parse(cleanedStdout);
                    socket.emit('get_history', data);
                    logger.info('RRD-Daten erfolgreich an Client gesendet.');
                } catch (e) {
                    // HIER LOGGEN WIR NUN DEN GENAUEN INHALT, DER DEN FEHLER VERURSACHT!
                    logger.error('!!! JSON-Parse-Fehler im Server !!!');
                    logger.error(`Erhaltene Ausgabe von Python war: "${stdout}"`);
                    logger.error(`Fehlermeldung: ${e.message}`);
                    
                    socket.emit('get_history_error', `JSON Fehler: Skript-Ausgabe war ungültig.`);
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
    }, 10000);

    socket.on('disconnect', () => {
        // Intervall aufräumen, wenn der Client die Verbindung trennt
        clearInterval(liveInterval); 
        logger.info(`Client von IP ${clientIp} getrennt`);
    });
});

// Server starten und alle verfügbaren IPs loggen
const PORT = 3000;
server.listen(PORT, () => {
    logger.info(`Server läuft auf Port ${PORT}`);
    logger.info('Verfügbare IP-Adressen des Servers:');
    
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            // Nur IPv4 anzeigen und interne (Loopback) Adressen wie 127.0.0.1 ignorieren
            if (net.family === 'IPv4' && !net.internal) {
                logger.info(`Server erreichbar unter http://${net.address}:${PORT}`);
            }
        }
    }
    logger.info(`Server gestartet auf Port ${PORT}`);
});