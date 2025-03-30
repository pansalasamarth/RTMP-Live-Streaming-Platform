require('dotenv').config();
const express = require('express');
const fs = require('fs');
const https = require('https');
const WebSocket = require('ws');
const path = require('path');
const cors = require('cors');

const HTTPS_PORT = process.env.HTTPS_PORT || 8443;
const SIGNALING_SERVER_PATH = process.env.SIGNALLING_SERVER_PATH || '/ws';

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.static(path.join(__dirname, 'public')));

// Data structures to hold active publishers and viewers.
const publishers = {};  // publisherId -> publisher WebSocket
const viewers = {};     // viewerId -> viewer WebSocket


// Serve static files from the 'dist' directory
app.use(express.static(path.join(__dirname, 'dist')));

// Route to serve the homepage (index.html)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});


// Read SSL key and certificate.
const serverOptions = {
  key: fs.readFileSync('./certs/key.pem'),
  cert: fs.readFileSync('./certs/cert.pem')
};

const httpsServer = https.createServer(serverOptions, app);
httpsServer.listen(HTTPS_PORT, () => {
  console.log(`Express HTTPS server is running on port ${HTTPS_PORT}`);
  console.log(`https://${process.env.SIGNALLING_SERVER_HOST || '127.0.0.1'}:${HTTPS_PORT}`);
});

// Attach a secure WebSocket server to the HTTPS server.
const wss = new WebSocket.Server({ server: httpsServer, path: SIGNALING_SERVER_PATH });

// Helper function to generate a unique ID.
function generateId() {
  return Math.random().toString(36).substring(2, 10);
}

// REST endpoint: return active streams (publishers)
app.get('/streams', (req, res) => {
  const streamList = Object.values(publishers).map(pub => ({
    publisherId: pub.id,
    name: pub.name,
  }));
  res.json({ streams: streamList });
});

// Endpoint to provide ICE server configuration
app.get('/ice-config', (req, res) => {
  const ice = {
    iceServers: [
      { urls: process.env.STUN_SERVER },
      {
        urls: process.env.TURN_SERVER,
        username: process.env.TURN_USERNAME,
        credential: process.env.TURN_CREDENTIAL
      }
    ]
  }
  console.log(ice);
  res.json(ice);
});


wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    let data;
    try {
      data = JSON.parse(message);
    } catch (err) {
      console.error('Invalid JSON message received:', message);
      return;
    }

    // Handle join messages for publishers and viewers.
    if (data.type === 'join') {
      if (data.role === 'publisher') {
        const publisherId = generateId();
        ws.role = 'publisher';
        ws.id = publisherId;
        ws.name = data.name || "Unnamed Publisher";
        publishers[publisherId] = ws;
        console.log(`Publisher joined: ${publisherId} (${ws.name})`);
      } else if (data.role === 'viewer') {
        const viewerId = generateId();
        ws.role = 'viewer';
        ws.id = viewerId;
        ws.name = data.name || "Unnamed Viewer";
        ws.target = data.target; // target should be the publisherId the viewer wishes to join
        viewers[viewerId] = ws;
        console.log(`Viewer joined: ${viewerId} (${ws.name}) targeting publisher: ${ws.target}`);

        // Notify the targeted publisher that a new viewer has joined.
        const targetPublisher = publishers[ws.target];
        if (targetPublisher) {
          targetPublisher.send(JSON.stringify({
            type: 'newViewer',
            viewerId,
            viewerName: ws.name
          }));
        } else {
          console.warn(`No publisher found with id: ${ws.target}`);
        }
      }
    }
    // Relay offer, answer, and candidate messages.
    else if (['offer', 'answer', 'candidate'].includes(data.type)) {
      // Message from publisher to viewer.
      if (data.role === 'publisher' && data.target) {
        const targetViewer = viewers[data.target];
        if (targetViewer) {
          targetViewer.send(JSON.stringify({
            type: data.type,
            payload: data.payload,
            viewerId: data.target,
            publisherId: ws.id
          }));
          console.log(`Relayed ${data.type} from publisher ${ws.id} to viewer ${data.target}`);
        } else {
          console.warn(`Target viewer ${data.target} not found for ${data.type} message.`);
        }
      }
      // Message from viewer to publisher.
      else if (data.role === 'viewer' && data.target) {
        const targetPublisher = publishers[data.target];
        if (targetPublisher) {
          targetPublisher.send(JSON.stringify({
            type: data.type,
            payload: data.payload,
            viewerId: ws.id,
            publisherId: data.target
          }));
          console.log(`Relayed ${data.type} from viewer ${ws.id} to publisher ${data.target}`);
        } else {
          console.warn(`Target publisher ${data.target} not found for ${data.type} message.`);
        }
      }
      
      else if (data.type === "getPublisherName") {
        if (publishers[data.publisherId]) {
            ws.send(JSON.stringify({
                type: "publisherName",
                publisherId: data.publisherId,
                publisherName: publishers[data.publisherId].ws.name
            }));
        }
    }
    }
  });

  

  ws.on('close', () => {
    if (ws.role === 'publisher') {
      if (ws.id && publishers[ws.id]) {
        console.log(`Publisher disconnected: ${ws.id}`);
        delete publishers[ws.id];
      }
    } else if (ws.role === 'viewer') {
      if (ws.id && viewers[ws.id]) {
        console.log(`Viewer disconnected: ${ws.id}`);
        delete viewers[ws.id];
        // Notify the publisher that this viewer has left.
        if (ws.target && publishers[ws.target]) {
          publishers[ws.target].send(JSON.stringify({
            type: 'viewerLeft',
            viewerId: ws.id
          }));
        }
      }
    }
  });
});





console.log('Secure signaling server with Express is running.');
