const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const easymidi = require('easymidi');
const fs = require('fs');
const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
});

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Obtener salidas MIDI disponibles
const midiOutputs = easymidi.getOutputs();

// Mostrar opciones por consola
console.log("Salidas MIDI disponibles:");
midiOutputs.forEach((device, index) => {
  console.log(`${index}: ${device}`);
});

// Preguntar al usuario por su elección
readline.question("Elige un dispositivo MIDI de salida (introduce un número): ", (respuesta) => {
  const eleccion = parseInt(respuesta);

  // Validar la entrada
  if (isNaN(eleccion) || eleccion < 0 || eleccion >= midiOutputs.length) {
    console.error("Elección inválida. Debe ser un número correspondiente a un dispositivo listado.");
    process.exit(1);
  }

  const midiDevice = midiOutputs[eleccion];
  let midiOutput;
  try {
    midiOutput = new easymidi.Output(midiDevice);
    console.log(`Conectado a: ${midiDevice}`);
  } catch (e) {
    console.error('Failed to initialize MIDI output device:', e.message);
    console.error('Ensure the MIDI device is active.');
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
      console.log(`Enviando CC ${ccNumber} a ${midiDevice} con valor: ${ccValue}`);
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
      console.log(`Enviando Note On ${note} a ${midiDevice} con velocity: ${velocity}`);
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
      console.log(`Enviando Note Off ${note} a ${midiDevice}`);
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
      console.log(`Enviando Program Change ${program} a ${midiDevice}`);
    } else {
      console.log('No MIDI output available for Program Change message');
    }
  }

  // Iniciar el servidor en el puerto 3001
  const PORT = process.env.PORT || 3001;
  server.listen(PORT, () => {
    console.log(`Servidor Node.js escuchando en el puerto ${PORT}`);
  });

  readline.close();
});
