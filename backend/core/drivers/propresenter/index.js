let pollInterval = null;

module.exports = {
  id: 'com.macro.propresenter',
  name: 'ProPresenter 7',
  description: 'Controle nativo de Slides via OpenAPI REST v1',
  version: '1.0.0',
  author: 'Raylson',
  
  configSchema: [
    {
      key: 'url',
      label: 'Endereço de Rede (IP)',
      type: 'text',
      required: true,
      default: '127.0.0.1'
    },
    {
      key: 'port',
      label: 'Porta da API (Padrão: 50001)',
      type: 'text',
      required: true,
      default: '50001'
    }
  ],

  hooks: {
    onLoad: async (config, context) => {
      // Setup the base URL
      let baseUrl = `http://${config.url || '127.0.0.1'}:${config.port || '50001'}/v1`;
      module.exports.baseUrl = baseUrl;
      module.exports.isUnloaded = false;

      const checkStatus = async () => {
        if (module.exports.isUnloaded) return;
        try {
          const res = await fetch(`${baseUrl}/status/slide`);
          if (res.ok) {
            context.setVariable('status', 'Conectado 🟢');
            // We could parse the current slide here if needed
          } else {
            context.setVariable('status', 'Erro na API 🟠');
          }
        } catch (e) {
          if (!module.exports.isUnloaded) {
            context.setVariable('status', 'Desconectado 🔴');
          }
        }
      };

      // Poll connection status every 5 seconds
      checkStatus();
      pollInterval = setInterval(checkStatus, 5000);
    },

    onUnload: () => {
      module.exports.isUnloaded = true;
      if (pollInterval) clearInterval(pollInterval);
    }
  },

  actions: [
    {
      id: 'trigger_next',
      name: 'Próximo Slide',
      description: 'Avança para o próximo slide ativo',
      execute: async () => {
        try {
          await fetch(`${module.exports.baseUrl}/trigger/next`);
        } catch(e) { console.error('[ProPresenter] ERRO:', e.message); }
      }
    },
    {
      id: 'trigger_prev',
      name: 'Slide Anterior',
      description: 'Retorna para o slide anterior',
      execute: async () => {
        try {
          await fetch(`${module.exports.baseUrl}/trigger/previous`);
        } catch(e) { console.error('[ProPresenter] ERRO:', e.message); }
      }
    },
    {
      id: 'clear_all',
      name: 'Limpar Tudo',
      description: 'Remove todas as camadas da tela principal',
      execute: async () => {
        try {
          await fetch(`${module.exports.baseUrl}/clear/layer/all`);
        } catch(e) { console.error('[ProPresenter] ERRO:', e.message); }
      }
    },
    {
      id: 'clear_layer',
      name: 'Limpar Camada Específica',
      description: 'Limpa uma camada. Payload: { "layer": "slide" } (vídeo, audio, props, slide)',
      execute: async ({ layer }) => {
        if (!layer) return;
        try {
          await fetch(`${module.exports.baseUrl}/clear/layer/${layer}`);
        } catch(e) { console.error('[ProPresenter] ERRO:', e.message); }
      }
    },
    {
      id: 'clear_audio',
      name: 'Limpar Áudio',
      description: 'Limpa apenas a camada de áudio',
      execute: async () => { try { await fetch(`${module.exports.baseUrl}/clear/layer/audio`); } catch(e){} }
    },
    {
      id: 'clear_video',
      name: 'Limpar Vídeo',
      description: 'Limpa a camada de entrada de vídeo',
      execute: async () => { try { await fetch(`${module.exports.baseUrl}/clear/layer/video_input`); } catch(e){} }
    },
    {
      id: 'trigger_macro',
      name: 'Acionar Macro',
      description: 'Dispara um Macro específico. Payload: { "macroId": "ID_DO_MACRO" }',
      execute: async ({ macroId }) => {
        if(!macroId) return;
        try { await fetch(`${module.exports.baseUrl}/macros/${macroId}/trigger`); } catch(e){}
      }
    },
    {
      id: 'start_timer',
      name: 'Iniciar Cronômetro',
      description: 'Inicia um timer. Payload: { "timerId": "ID_DO_TIMER" }',
      execute: async ({ timerId }) => {
        if(!timerId) return;
        try { await fetch(`${module.exports.baseUrl}/timers/${timerId}/start`); } catch(e){}
      }
    },
    {
      id: 'playlist_next',
      name: 'Próximo Item da Playlist',
      description: 'Avança o foco para o próximo item da playlist atual',
      execute: async () => { try { await fetch(`${module.exports.baseUrl}/playlist/focused/next`); } catch(e){} }
    },
    {
      id: 'playlist_prev',
      name: 'Item Anterior da Playlist',
      description: 'Retrocede o foco na playlist atual',
      execute: async () => { try { await fetch(`${module.exports.baseUrl}/playlist/focused/previous`); } catch(e){} }
    }
  ]
};
