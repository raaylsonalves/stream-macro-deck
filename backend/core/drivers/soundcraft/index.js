const WebSocket = require('ws');

module.exports = {
  id: 'com.macro.soundcraft',
  name: 'Soundcraft Ui',
  description: 'Controle Absoluto de Faders e Mutes via Network WebSocket Nativo.',
  version: '1.0.0',
  author: 'Raylson',
  
  configSchema: [
    {
      key: 'ip',
      label: 'Endereço IP da Mesa na Rede',
      type: 'text',
      required: true,
      default: '10.10.1.1'
    }
  ],

  hooks: {
    onLoad: async (config, context) => {
      module.exports.isUnloaded = false;
      const ip = config.ip || '10.10.1.1';
      
      const connectSC = () => {
        if (module.exports.isUnloaded) return;
        
        context.setVariable('status', 'Conectando... ⏳');
        const ws = new WebSocket(`ws://${ip}`);
        module.exports.wsClient = ws;

        ws.on('open', () => {
          if (module.exports.isUnloaded) return ws.close();
          context.setVariable('status', 'Conectado 🟢');
        });

        ws.on('message', (data) => {
          // Native variables extraction logic could go here later
        });

        ws.on('close', () => {
          module.exports.wsClient = null;
          if (module.exports.isUnloaded) return;
          context.setVariable('status', 'Desconectado 🔴');
          setTimeout(connectSC, 5000); // Reconnect
        });

        ws.on('error', (err) => {
          console.error('[Soundcraft] WS Error:', err.message);
          ws.close();
        });
      };

      connectSC();
      
      // Ping keep-alive loop to emulate the official Bitfocus Companion heartbeat
      module.exports.pingInterval = setInterval(() => {
        if (module.exports.wsClient && module.exports.wsClient.readyState === WebSocket.OPEN) {
          module.exports.wsClient.send('ALIVE');
        }
      }, 2000);
    },

    onUnload: () => {
      module.exports.isUnloaded = true;
      if (module.exports.pingInterval) clearInterval(module.exports.pingInterval);
      if (module.exports.wsClient) {
        module.exports.wsClient.close();
        module.exports.wsClient = null;
      }
    }
  },

  actions: [
    {
      id: 'set_mute',
      name: 'Mutar/Desmutar Canal',
      description: 'Payload: { "channel": "i.0", "state": 1 } (1=Mute, 0=Aberto)',
      execute: async ({ channel, state }) => {
        const ws = module.exports.wsClient;
        if (!ws || ws.readyState !== WebSocket.OPEN || !channel) return;
        
        // Ensure values map cleanly to Soundcraft's schema
        const value = parseInt(state) === 1 ? 1 : 0;
        ws.send(`SETD^${channel}.mute^${value}`);
      }
    },
    {
      id: 'set_fader',
      name: 'Deslizar Fader (Mix)',
      description: 'Volume Linear 0.0 a 1.0. Payload: { "channel": "i.0", "val": 0.5 }',
      execute: async ({ channel, val }) => {
        const ws = module.exports.wsClient;
        if (!ws || ws.readyState !== require('ws').OPEN || !channel) return;
        
        const numberVal = parseFloat(val);
        if (isNaN(numberVal)) return;
        ws.send(`SETD^${channel}.mix^${numberVal}`);
      }
    },
    {
      id: 'set_solo',
      name: 'Ligar/Desligar Solo',
      description: 'Payload: { "channel": "i.0", "state": 1 }',
      execute: async ({ channel, state }) => {
        const ws = module.exports.wsClient;
        if (!ws || ws.readyState !== require('ws').OPEN || !channel) return;
        const value = parseInt(state) === 1 ? 1 : 0;
        ws.send(`SETD^${channel}.solo^${value}`);
      }
    },
    {
      id: 'set_phantom',
      name: 'Phantom Power 48v',
      description: 'Payload: { "channel": "i.0", "state": 1 }',
      execute: async ({ channel, state }) => {
        const ws = module.exports.wsClient;
        if (!ws || ws.readyState !== require('ws').OPEN || !channel) return;
        const value = parseInt(state) === 1 ? 1 : 0;
        ws.send(`SETD^${channel}.phantom^${value}`);
      }
    },
    {
      id: 'master_mute',
      name: 'Mutar Master (L/R)',
      description: 'Mute geral. Payload: { "state": 1 }',
      execute: async ({ state }) => {
        const ws = module.exports.wsClient;
        if (!ws || ws.readyState !== require('ws').OPEN) return;
        const value = parseInt(state) === 1 ? 1 : 0;
        ws.send(`SETD^m.mute^${value}`);
      }
    },
    {
      id: 'master_fader',
      name: 'Fader do Master (L/R)',
      description: 'Volume 0.0 a 1.0. Payload: { "val": 0.75 }',
      execute: async ({ val }) => {
        const ws = module.exports.wsClient;
        if (!ws || ws.readyState !== require('ws').OPEN) return;
        const numberVal = parseFloat(val);
        if (isNaN(numberVal)) return;
        ws.send(`SETD^m.mix^${numberVal}`);
      }
    }
  ]
};
