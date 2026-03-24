const WebSocket = require('ws');

let teamsWs = null;
let pluginContext = null;
let currentMeetingState = {};
let pingInterval = null;
let reconnectTimer = null;
let requestId = 1;

// Helper to send JSON messages
function sendMessage(action, parameters = {}) {
  if (teamsWs && teamsWs.readyState === WebSocket.OPEN) {
    const payload = { 
      apiVersion: "2.0.0",
      service: action,
      action: action, 
      parameters: parameters,
      manufacturer: "Bitfocus",
      device: "Companion",
      timestamp: Date.now(),
      requestId: requestId++
    };
    teamsWs.send(JSON.stringify(payload));
  } else {
    console.log('[Teams] Cannot send command, WebSocket is not open.');
  }
}

// Maps incoming meeting states to global variables
function parseMeetingState(state) {
  currentMeetingState = state;
  if (!pluginContext) return;

  const isMuted = state.isMuted;
  pluginContext.setVariable('mute', isMuted ? 'Mutado' : 'Aberto');
  pluginContext.setVariable('mute_icon', isMuted ? '🔇' : '🎤');
  pluginContext.setVariable('mute_color', isMuted ? '#ef4444' : '#22c55e');

  const isVideoOn = state.isVideoOn;
  pluginContext.setVariable('video', isVideoOn ? 'Câmera Ativa' : 'Câmera Off');
  pluginContext.setVariable('video_icon', isVideoOn ? 'Video' : 'VideoOff');
  pluginContext.setVariable('video_color', isVideoOn ? '#22c55e' : '#ef4444');

  const isHandRaised = state.isHandRaised;
  pluginContext.setVariable('hand', isHandRaised ? 'Mão Levantada' : 'Abaixada');
  pluginContext.setVariable('hand_icon', isHandRaised ? '✋' : '🤚');
  pluginContext.setVariable('hand_color', isHandRaised ? '#eab308' : '#262626');
  
  pluginContext.setVariable('status', 'Em Chamada 🟢');
}

function clearMeetingState() {
  if (!pluginContext) return;
  pluginContext.setVariable('mute', 'Fora de Call');
  pluginContext.setVariable('mute_icon', '🎤');
  pluginContext.setVariable('mute_color', '#262626');
  
  pluginContext.setVariable('video', 'Fora de Call');
  pluginContext.setVariable('video_icon', 'VideoOff');
  pluginContext.setVariable('video_color', '#262626');
  
  pluginContext.setVariable('hand', 'Fora de Call');
  pluginContext.setVariable('hand_icon', '🤚');
  pluginContext.setVariable('hand_color', '#262626');
  
  pluginContext.setVariable('status', 'Aguardando Reunião ⚪');
}

module.exports = {
  id: 'com.macro.teams',
  name: 'Microsoft Teams',
  description: 'Controle microfone, câmera e interações nativas em chamadas do Microsoft Teams. Requer opção "Third-party app API" ativa no app.',

  configSchema: [
    {
      key: 'token',
      label: 'API Token',
      type: 'password',
      description: 'Abra seu Teams > Configurações > Privacidade > Gerenciar API. Clique em "Gerenciar API", ative-a e copie a chave gerada aqui.',
      required: true
    }
  ],

  hooks: {
    onLoad: (config, context) => {
      pluginContext = context;
      console.log('--> Loading Microsoft Teams Plugin');
      pluginContext.setVariable('status', 'Conectando... 🟡');
      
      // Static leave action variables
      pluginContext.setVariable('leave_icon', 'PhoneOff');
      pluginContext.setVariable('leave_color', '#ef4444');

      if (teamsWs) {
        try { teamsWs.close(); } catch (e) {}
        clearInterval(pingInterval);
      }

      // Format initial connection URI
      const token = config?.token || '';
      const wsUri = `ws://127.0.0.1:8124?token=${token}&protocol-version=2.0.0&manufacturer=Bitfocus&device=Companion&app=Companion-Microsoft%20Teams&app-version=1.0.2`;

      function connectTeams() {
        if (reconnectTimer) clearTimeout(reconnectTimer);
        
        try {
          teamsWs = new WebSocket(wsUri);
          
          teamsWs.on('open', () => {
            console.log('--> [Teams] Connected to local WebSocket API 8124 (v2.0.0)');
            if (token) {
              pluginContext.setVariable('status', 'Aguardando Reunião ⚪');
            } else {
              pluginContext.setVariable('status', 'Aguardando Pareamento... 👀');
            }
            
            // v2.0.0 uses an empty ping to keep the socket alive immediately after opening
            teamsWs.send('');
          });

          teamsWs.on('message', (data) => {
            try {
              const payload = JSON.parse(data);
              
              if (payload.tokenRefresh && payload.tokenRefresh !== token) {
                 console.log('--> [Teams] Acquired new API token. Saving to config db.');
                 context.saveConfig({ token: payload.tokenRefresh });
                 pluginContext.setVariable('status', 'Pareado! Aguardando Reunião ⚪');
              }

              if (payload.meetingUpdate && payload.meetingUpdate.meetingState) {
                 parseMeetingState(payload.meetingUpdate.meetingState);
              }
              
              if (payload.meetingUpdate && payload.meetingUpdate.meetingPermissions) {
                 if (payload.meetingUpdate.meetingPermissions.canToggleMute === false) {
                   clearMeetingState();
                 }
              }

            } catch (e) {
              console.error('--> [Teams] Failed to parse incoming message:', e);
            }
          });

          teamsWs.on('error', (err) => {
            console.error('--> [Teams] WebSocket error:', err.message);
            if (pluginContext) pluginContext.setVariable('status', `Erro 🔴 (${err.message})`);
            clearMeetingState();
          });

          teamsWs.on('close', () => {
            console.log('--> [Teams] Connection closed. Retrying in 5 seconds...');
            if (pluginContext) pluginContext.setVariable('status', 'Fechado/Tentando Reabrir 🔴');
            clearMeetingState();
            reconnectTimer = setTimeout(connectTeams, 5000);
          });
          
        } catch (err) {
          console.error('--> [Teams] Failed to initiate connection:', err.message);
          if (pluginContext) pluginContext.setVariable('status', `Offline 🔴`);
          reconnectTimer = setTimeout(connectTeams, 5000);
        }
      }

      connectTeams();
    },

    onUnload: () => {
      console.log('--> Unloading Microsoft Teams Plugin');
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (teamsWs) {
        teamsWs.close();
      }
      clearInterval(pingInterval);
    }
  },

  actions: [
    {
      id: 'toggle_mute',
      name: 'Toggle Mute',
      execute: async () => {
        console.log('[Teams] Dispatching toggle-mute...');
        sendMessage('toggle-mute');
      }
    },
    {
      id: 'toggle_video',
      name: 'Toggle Video',
      execute: async () => {
        sendMessage('toggle-video');
        console.log('[Teams] Dispatched toggle-video command');
      }
    },
    {
      id: 'toggle_hand',
      name: 'Raise/Lower Hand',
      execute: async () => {
        sendMessage('toggle-hand');
        console.log('[Teams] Dispatched toggle-hand command');
      }
    },
    {
      id: 'leave_call',
      name: 'Leave Call',
      execute: async () => {
        sendMessage('leave-call');
        console.log('[Teams] Dispatched leave-call command');
      }
    }
  ]
};
