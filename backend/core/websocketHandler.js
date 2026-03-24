class WebSocketHandler {
  constructor() {
    this.wss = null;
    this.clients = new Set();
  }

  init(server) {
    const { WebSocketServer } = require('ws');
    this.wss = new WebSocketServer({ server });

    this.wss.on('connection', (ws) => {
      console.log('[WS] New client connected');
      this.clients.add(ws);

      ws.on('message', (message) => {
        this.handleMessage(ws, message);
      });

      ws.on('close', () => {
        console.log('[WS] Client disconnected');
        this.clients.delete(ws);
      });
    });

    console.log('[WS] WebSocket server initialized');
  }

  handleMessage(ws, message) {
    try {
      const data = JSON.parse(message);
      console.log('[WS] Received:', data);
      
      // Placeholder for routing messages
      // e.g., if data.type === 'execute_action' ...
      
      // Echoing back for testing
      ws.send(JSON.stringify({ type: 'ack', payload: data }));
    } catch (err) {
      console.error('[WS] Error parsing message:', err);
    }
  }

  broadcast(messageObj) {
    const data = JSON.stringify(messageObj);
    for (const client of this.clients) {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(data);
      }
    }
  }
}

module.exports = new WebSocketHandler();
