const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const easymidi = require('easymidi');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const midiInputs = easymidi.getInputs();
const midiOutputs = easymidi.getOutputs();
console.log('Available MIDI inputs:', midiInputs);
console.log('Available MIDI outputs:', midiOutputs);

let midiOutput;
const desiredDevice = 'loopMIDI Port'; // Forzar loopMIDI Port como salida

// Verificar si se encontró un dispositivo de salida
try {
    midiOutput = new easymidi.Output(desiredDevice);
    console.log('Using MIDI device:', desiredDevice);
} catch (e) {
    console.error('Failed to initialize MIDI output device:', e.message);
    console.error('Ensure loopMIDI is running and "loopMIDI Port" is active.');
    process.exit(1);
}

// Servir archivos estáticos (como style.css) desde el directorio raíz
app.use(express.static(__dirname));

// Ruta raíz
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// Conexiones WebSocket
wss.on('connection', (ws) => {
    console.log('Cliente WebSocket conectado');

    // Manejo de mensajes desde el navegador
    ws.on('message', (message) => {
        console.log('Raw message received from browser:', message);

        // Analizar el mensaje JSON
        try {
            const data = JSON.parse(message);
            const { ccNumber, ccValue, value } = data;
            console.log('Parsed data from browser:', { ccNumber, ccValue, value });

            // Enviar el mensaje MIDI basado en ccNumber
            if (ccNumber === 144) { // Note On
                sendMidiNote(ccValue, value || 127);
            } else if (ccNumber === 128) { // Note Off
                sendMidiNoteOff(ccValue, 0);
            } else if (ccNumber === 192) { // Program Change
                sendProgramChange(ccValue);
            } else {
                sendMidiCC(ccNumber, ccValue);
            }
        } catch (e) {
            console.error('Error parsing message from browser:', e);
        }
    });
});

// Función para enviar un mensaje MIDI CC
function sendMidiCC(ccNumber, ccValue) {
    if (midiOutput) {
        midiOutput.send('cc', {
            controller: ccNumber,
            value: ccValue,
            channel: 0,
        });
        console.log(`Enviando CC ${ccNumber} a ${desiredDevice} con valor: ${ccValue}`);
    } else {
        console.log('No MIDI output available for CC message');
    }
}

// Función para enviar un mensaje MIDI Note On
function sendMidiNote(note, velocity) {
    if (midiOutput) {
        midiOutput.send('noteon', {
            note: note,
            velocity: velocity,
            channel: 0,
        });
        console.log(`Enviando Note On ${note} a ${desiredDevice} con velocity: ${velocity}`);
    } else {
        console.log('No MIDI output available for Note On message');
    }
}

// Función para enviar un mensaje MIDI Note Off
function sendMidiNoteOff(note, velocity) {
    if (midiOutput) {
        midiOutput.send('noteoff', {
            note: note,
            velocity: velocity,
            channel: 0,
        });
        console.log(`Enviando Note Off ${note} a ${desiredDevice}`);
    } else {
        console.log('No MIDI output available for Note Off message');
    }
}

// Función para enviar un mensaje MIDI Program Change
function sendProgramChange(program) {
    if (midiOutput) {
        midiOutput.send('program', {
            number: program,
            channel: 0,
        });
        console.log(`Enviando Program Change ${program} a ${desiredDevice}`);
    } else {
        console.log('No MIDI output available for Program Change message');
    }
}

// Iniciar el servidor en el puerto 3001
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Servidor Node.js escuchando en el puerto ${PORT}`);
});