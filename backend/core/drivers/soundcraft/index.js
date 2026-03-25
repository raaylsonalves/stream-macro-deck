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
          if (module.exports.isUnloaded) return;
          const msgString = data.toString();
          const lines = msgString.split('\n');
          
          for (const line of lines) {
            const payload = line.replace(/^3:::/, '');
            if (payload.startsWith('SETD^')) {
              const parts = payload.split('^');
              if (parts.length >= 3) {
                const path = parts[1];
                const value = parts[2];

                // Mapear Line In L (l.0) e R (l.1)
                if (path === 'l.0.mix') context.setVariable('line_l_mix', value);
                else if (path === 'l.0.mute') context.setVariable('line_l_mute', value);
                else if (path === 'l.1.mix') context.setVariable('line_r_mix', value);
                else if (path === 'l.1.mute') context.setVariable('line_r_mute', value);
              }
            }
          }
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
          module.exports.wsClient.send('3:::ALIVE');
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
      description: 'Muta ou abre um canal específico.',
      fields: [
        { id: 'channel', label: 'ID do Canal (ex: i.0, l.0, a.0)', type: 'string', default: 'i.0' },
        { id: 'state', label: 'Ação de Mute', type: 'dropdown', options: [{label: 'Mutar (1)', value: '1'}, {label: 'Desmutar (0)', value: '0'}], default: '1' }
      ],
      execute: async ({ channel, state }) => {
        const ws = module.exports.wsClient;
        if (!ws || ws.readyState !== WebSocket.OPEN || !channel) return;
        
        // Ensure values map cleanly to Soundcraft's schema
        const value = parseInt(state) === 1 ? 1 : 0;
        ws.send(`3:::SETD^${channel}.mute^${value}`);
      }
    },
    {
      id: 'set_fader',
      name: 'Deslizar Fader (Mix)',
      description: 'Ajusta o fader de um canal para um volume específico.',
      fields: [
        { id: 'channel', label: 'ID do Canal (ex: i.0, l.0)', type: 'string', default: 'i.0' },
        { id: 'val', label: 'Nível (0.0 até 1.0)', type: 'string', default: '0.765' }
      ],
      execute: async ({ channel, val }) => {
        const ws = module.exports.wsClient;
        if (!ws || ws.readyState !== require('ws').OPEN || !channel) return;
        
        const numberVal = parseFloat(val);
        if (isNaN(numberVal)) return;
        ws.send(`3:::SETD^${channel}.mix^${numberVal}`);
      }
    },
    {
      id: 'set_solo',
      name: 'Ligar/Desligar Solo',
      fields: [
        { id: 'channel', label: 'ID do Canal', type: 'string', default: 'i.0' },
        { id: 'state', label: 'Ação', type: 'dropdown', options: [{label: 'Ligar (1)', value: '1'}, {label: 'Desligar (0)', value: '0'}], default: '1' }
      ],
      execute: async ({ channel, state }) => {
        const ws = module.exports.wsClient;
        if (!ws || ws.readyState !== require('ws').OPEN || !channel) return;
        const value = parseInt(state) === 1 ? 1 : 0;
        ws.send(`3:::SETD^${channel}.solo^${value}`);
      }
    },
    {
      id: 'set_phantom',
      name: 'Phantom Power 48v',
      fields: [
        { id: 'channel', label: 'ID do Canal', type: 'string', default: 'i.0' },
        { id: 'state', label: 'Energia', type: 'dropdown', options: [{label: 'Ligar 48v (1)', value: '1'}, {label: 'Desligar (0)', value: '0'}], default: '0' }
      ],
      execute: async ({ channel, state }) => {
        const ws = module.exports.wsClient;
        if (!ws || ws.readyState !== require('ws').OPEN || !channel) return;
        const value = parseInt(state) === 1 ? 1 : 0;
        ws.send(`3:::SETD^${channel}.phantom^${value}`);
      }
    },
    {
      id: 'master_mute',
      name: 'Mutar Master (L/R)',
      fields: [
        { id: 'state', label: 'Ação de Mute', type: 'dropdown', options: [{label: 'Mutar (1)', value: '1'}, {label: 'Desmutar (0)', value: '0'}], default: '1' }
      ],
      execute: async ({ state }) => {
        const ws = module.exports.wsClient;
        if (!ws || ws.readyState !== require('ws').OPEN) return;
        const value = parseInt(state) === 1 ? 1 : 0;
        ws.send(`3:::SETD^m.mute^${value}`);
      }
    },
    {
      id: 'master_fader',
      name: 'Fader do Master (L/R)',
      fields: [
        { id: 'val', label: 'Nível (0.0 até 1.0)', type: 'string', default: '0.765' }
      ],
      execute: async ({ val }) => {
        const ws = module.exports.wsClient;
        if (!ws || ws.readyState !== require('ws').OPEN) return;
        const numberVal = parseFloat(val);
        if (isNaN(numberVal)) return;
        ws.send(`3:::SETD^m.mix^${numberVal}`);
      }
    }
  ]
};
