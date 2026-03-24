require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const wsHandler = require('../core/websocketHandler');
const db = require('../core/database'); // Initialize DB
const pluginManager = require('../core/pluginManager');
const routes = require('./routes');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// REST API setup
app.use('/api', routes);

// Init WebSocket
wsHandler.init(server);

// Init Plugins
pluginManager.init();

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`[Core] Server listening on port ${PORT}`);
});
