const { Client } = require('@xhayper/discord-rpc');

let rpcClient = null;
let pluginContext = null;

module.exports = {
  id: 'com.macro.discord',
  name: 'Discord Integration',
  description: 'Control your Discord voice states and monitor your channels.',

  configSchema: [
    {
      key: 'clientId',
      label: 'Client ID',
      type: 'text',
      description: 'Your Application Client ID (from Discord Developer Portal)',
      required: true
    },
    {
      key: 'clientSecret',
      label: 'Client Secret',
      type: 'text',
      description: 'Your Application Client Secret',
      required: true
    }
  ],

  hooks: {
    onLoad: (config, context) => {
      pluginContext = context;
      console.log('--> Loading Discord RPC Plugin');
      const { clientId, clientSecret } = config || {};

      if (!clientId || !clientSecret) {
        console.warn('--> [Discord] Client ID or Secret missing in configuration. Cannot connect via RPC.');
        context.setVariable('status', 'Aguardando Credenciais ⚪');
        return;
      }

      context.setVariable('status', 'Conectando... 🟡');

      if (rpcClient) {
        try { rpcClient.destroy(); } catch (e) { }
      }

      rpcClient = new Client({ transport: 'ipc', clientId: clientId, clientSecret: clientSecret });

      rpcClient.on('ready', () => {
        console.log(`--> [Discord] Authenticated locally as ${rpcClient.user.username}!`);

        // Export variables!
        context.setVariable('status', 'Conectado 🟢');
        context.setVariable('user', rpcClient.user.username);

        // Static leave action variables
        context.setVariable('leave_icon', '🚪');
        context.setVariable('leave_color', '#ef4444');

        // Initial Voice Settings fetch
        rpcClient.user.getVoiceSettings().then(settings => {
          const actualMute = settings.mute || settings.deaf;
          context.setVariable('mute', actualMute ? 'Mutado' : 'Aberto');
          context.setVariable('mute_icon', actualMute ? '🔇' : '🎤');
          context.setVariable('mute_color', actualMute ? '#ef4444' : '#22c55e');

          context.setVariable('deaf', settings.deaf ? 'Ensurdecido' : 'Ouvindo');
          context.setVariable('deaf_icon', settings.deaf ? '🎧 (X)' : '🎧');
          context.setVariable('deaf_color', settings.deaf ? '#ef4444' : '#22c55e');
        }).catch(() => { });

        // Initial channel state fetch
        rpcClient.request('GET_SELECTED_VOICE_CHANNEL').then(channel => {
          context.setVariable('channel_name', channel ? channel.name : 'Nenhum');
          context.setVariable('channel_users', channel?.voice_states ? channel.voice_states.length.toString() : '0');
        }).catch(() => {
          context.setVariable('channel_name', 'Nenhum');
          context.setVariable('channel_users', '0');
        });

        // Ask Discord to send us these events
        rpcClient.subscribe('VOICE_SETTINGS_UPDATE', {}).catch(() => { });
        rpcClient.subscribe('VOICE_CHANNEL_SELECT', {}).catch(() => { });

        // Listen for voice setting changes (Mute/Deafen)
        rpcClient.on('VOICE_SETTINGS_UPDATE', (data) => {
          if (!data) return;
          const actualMute = data.mute || data.deaf;
          context.setVariable('mute', actualMute ? 'Mutado' : 'Aberto');
          context.setVariable('mute_icon', actualMute ? '🔇' : '🎤');
          context.setVariable('mute_color', actualMute ? '#ef4444' : '#22c55e');

          context.setVariable('deaf', data.deaf ? 'Ensurdecido' : 'Ouvindo');
          context.setVariable('deaf_icon', data.deaf ? '🎧 (X)' : '🎧');
          context.setVariable('deaf_color', data.deaf ? '#ef4444' : '#22c55e');
        });

        // Listen for channel changes
        rpcClient.on('VOICE_CHANNEL_SELECT', async (data) => {
          if (data && data.channel_id) {
            try {
              const channelInfo = await rpcClient.request('GET_SELECTED_VOICE_CHANNEL');
              context.setVariable('channel_name', channelInfo.name || 'Desconhecido');
              context.setVariable('channel_users', channelInfo.voice_states ? channelInfo.voice_states.length.toString() : '0');
            } catch (e) {
              context.setVariable('channel_name', 'Nenhum');
              context.setVariable('channel_users', '0');
            }
          } else {
            context.setVariable('channel_name', 'Nenhum');
            context.setVariable('channel_users', '0');
          }
        });
      });

      rpcClient.login({
        clientId: clientId,
        clientSecret: clientSecret,
        scopes: ['rpc', 'rpc.voice.read', 'rpc.voice.write'],
        prompt: 'none',
        redirectUri: 'http://localhost:3001' // Dummy URI needed for OAuth2
      }).catch(err => {
        console.error('--> [Discord] RPC Login failed:', err.message);
        context.setVariable('status', `Erro 🔴 (${err.message})`);
      });
    },

    onUnload: () => {
      console.log('--> Unloading Discord RPC Plugin');
      if (rpcClient) {
        rpcClient.destroy();
      }
    }
  },

  actions: [
    {
      id: 'toggle_mute',
      name: 'Toggle Mute',
      execute: async () => {
        if (!rpcClient) return;
        try {
          const settings = await rpcClient.user.getVoiceSettings();
          const isMute = !settings.mute;
          await rpcClient.user.setVoiceSettings({ mute: isMute });
          console.log(`[Discord] Toggled mute to ${isMute}`);

          if (pluginContext) {
            const actualMute = isMute || settings.deaf;
            pluginContext.setVariable('mute', actualMute ? 'Mutado' : 'Aberto');
            pluginContext.setVariable('mute_icon', actualMute ? '🔇' : '🎤');
            pluginContext.setVariable('mute_color', actualMute ? '#ef4444' : '#22c55e');
          }
        } catch (e) {
          console.error('[Discord] Failed to toggle mute:', e.message);
        }
      }
    },
    {
      id: 'toggle_deafen',
      name: 'Toggle Deafen',
      execute: async () => {
        if (!rpcClient) return;
        try {
          const settings = await rpcClient.user.getVoiceSettings();
          const isDeaf = !settings.deaf;
          await rpcClient.user.setVoiceSettings({ deaf: isDeaf });
          console.log(`[Discord] Toggled deafen to ${isDeaf}`);

          if (pluginContext) {
            pluginContext.setVariable('deaf', isDeaf ? 'Ensurdecido' : 'Ouvindo');
            pluginContext.setVariable('deaf_icon', isDeaf ? '🎧 (X)' : '🎧');
            pluginContext.setVariable('deaf_color', isDeaf ? '#ef4444' : '#22c55e');

            const actualMute = settings.mute || isDeaf;
            pluginContext.setVariable('mute', actualMute ? 'Mutado' : 'Aberto');
            pluginContext.setVariable('mute_icon', actualMute ? '🔇' : '🎤');
            pluginContext.setVariable('mute_color', actualMute ? '#ef4444' : '#22c55e');
          }
        } catch (e) {
          console.error('[Discord] Failed to toggle deafen:', e.message);
        }
      }
    },
    {
      id: 'leave_channel',
      name: 'Leave Channel',
      execute: async () => {
        if (!rpcClient) return;
        try {
          await rpcClient.request('SELECT_VOICE_CHANNEL', { channel_id: null });
          console.log(`[Discord] Left the local voice channel.`);
        } catch (e) {
          console.error('[Discord] Failed to leave channel:', e.message);
        }
      }
    }
  ]
};