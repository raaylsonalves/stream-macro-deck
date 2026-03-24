const OBSWebSocket = require('obs-websocket-js').default;

let obs = null;
let pluginContext = null;

module.exports = {
    id: 'com.macro.obs',
    name: 'OBS Studio',
    description: 'Integração nativa com OBS Studio via WebSocket v5',
    version: '1.0.0',
    author: 'Raylson',

    configSchema: [
        {
            key: 'url',
            label: 'Endereço do WebSocket',
            type: 'text',
            required: true,
            default: 'ws://127.0.0.1:4455'
        },
        {
            key: 'port',
            label: 'Porta do WebSocket',
            type: 'text',
            required: true,
            default: 'ws://127.0.0.1:4455'
        },
        {
            key: 'password',
            label: 'Senha do WebSocket',
            type: 'password',
            required: false,
            default: ''
        }
    ],

    hooks: {
        onLoad: async (config, context) => {
            pluginContext = context;
            obs = new OBSWebSocket();

            const connectObs = async () => {
                if (!obs) return; // Prevent race conditions on hot-reload
                try {
                    // Determine variables
                    let url = config.url || 'ws://127.0.0.1:4455';
                    if (config.port && config.url && !config.url.includes(config.port)) {
                        url = `${config.url.startsWith('ws') ? '' : 'ws://'}${config.url}:${config.port}`;
                    }
                    const password = config.password || undefined;

                    context.setVariable('status', 'Conectando... ⏳');
                    await obs.connect(url, password);

                    context.setVariable('status', 'Conectado 🟢');

                    // Fetch initial states
                    const sceneList = await obs.call('GetSceneList');
                    context.setVariable('current_scene', sceneList.currentProgramSceneName);

                    const recordStatus = await obs.call('GetRecordStatus');
                    context.setVariable('is_recording', recordStatus.outputActive ? 'Sim' : 'Não');

                    const streamStatus = await obs.call('GetStreamStatus');
                    context.setVariable('is_streaming', streamStatus.outputActive ? 'Sim' : 'Não');
                } catch (e) {
                    if (!obs) return;
                    console.error('[OBS] Connection failed:', e.message);
                    context.setVariable('status', 'Desconectado 🔴');

                    // Retry connection every 5 seconds if failed
                    setTimeout(connectObs, 5000);
                }
            };

            // Events
            obs.on('CurrentProgramSceneChanged', data => {
                if(context) context.setVariable('current_scene', data.sceneName);
            });

            obs.on('RecordStateChanged', data => {
                if(context) context.setVariable('is_recording', data.outputActive ? 'Sim' : 'Não');
            });

            obs.on('StreamStateChanged', data => {
                if(context) context.setVariable('is_streaming', data.outputActive ? 'Sim' : 'Não');
            });

            obs.on('ConnectionClosed', () => {
                if (!obs) return;
                context.setVariable('status', 'Desconectado 🔴');
                setTimeout(connectObs, 5000);
            });

            connectObs();
        },

        onUnload: () => {
            if (obs) {
                obs.disconnect().catch(() => { });
                obs = null;
            }
            pluginContext = null;
        }
    },

    actions: [
        {
            id: 'set_scene',
            name: 'Mudar de Cena',
            description: 'Muda a cena atual do OBS. Payload: { "sceneName": "NOME" }',
            execute: async ({ sceneName }) => {
                if (!obs || !sceneName) return;
                try {
                    await obs.call('SetCurrentProgramScene', { sceneName: sceneName });
                } catch (e) {
                    console.error('[OBS] Erro ao trocar de cena:', e.message);
                }
            }
        },
        {
            id: 'toggle_record',
            name: 'Alternar Gravação',
            description: 'Inicia ou para a gravação',
            execute: async () => {
                if (!obs) return;
                try {
                    await obs.call('ToggleRecord');
                } catch (e) { }
            }
        },
        {
            id: 'toggle_stream',
            name: 'Alternar Transmissão',
            description: 'Inicia ou para a transmissão (Stream)',
            execute: async () => {
                if (!obs) return;
                try {
                    await obs.call('ToggleStream');
                } catch (e) { }
            }
        },
        {
            id: 'toggle_mute',
            name: 'Mutar/Desmutar Fonte de Áudio',
            description: 'Alterna o mute de uma fonte. Payload: { "sourceName": "Mic" }',
            execute: async ({ sourceName }) => {
                if (!obs || !sourceName) return;
                try {
                    await obs.call('ToggleInputMute', { inputName: sourceName });
                } catch (e) {
                    console.error('[OBS] Erro ao mutar:', e.message);
                }
            }
        }
    ]
};