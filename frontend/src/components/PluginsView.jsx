import React, { useState, useEffect } from 'react';
import { fetchPlugins, fetchAvailablePlugins, savePluginConfig, addPlugin, removePlugin } from '../services/api';
import { useWebSocket } from '../hooks/useWebSocket';

export default function PluginsView() {
  const [plugins, setPlugins] = useState([]);
  const [availablePlugins, setAvailablePlugins] = useState([]);
  const [selectedPlugin, setSelectedPlugin] = useState(null);
  const [selectedType, setSelectedType] = useState('enabled'); // 'enabled' or 'available'
  const [formData, setFormData] = useState({});
  const [saveStatus, setSaveStatus] = useState('');
  
  const { variables } = useWebSocket();

  useEffect(() => {
    loadPlugins();
  }, []);

  const loadPlugins = async () => {
    try {
      const enabledData = await fetchPlugins();
      const availableData = await fetchAvailablePlugins();
      
      // Filter out already enabled plugins from the available list
      const enabledIds = enabledData.map(p => p.id);
      const filteredAvailable = availableData.filter(p => !enabledIds.includes(p.id));

      setPlugins(enabledData);
      setAvailablePlugins(filteredAvailable);
    } catch (e) {
      console.error(e);
    }
  };

  const selectPlugin = (plugin, type) => {
    setSelectedPlugin(plugin);
    setSelectedType(type);
    setFormData(plugin.config || {});
    setSaveStatus('');
  };

  const handleSave = async () => {
    try {
      setSaveStatus('Salvando...');
      const cleanedData = {};
      Object.keys(formData).forEach(k => {
        cleanedData[k] = typeof formData[k] === 'string' ? formData[k].trim() : formData[k];
      });

      await savePluginConfig(selectedPlugin.id, cleanedData);
      setSaveStatus('Salvo com sucesso! A conexão foi reiniciada.');
      loadPlugins(); 
    } catch (e) {
      console.error(e);
      setSaveStatus('Falha ao salvar configuração.');
    }
  };

  const handleAdd = async (pluginId) => {
    try {
      setSaveStatus('Instalando...');
      await addPlugin(pluginId);
      await loadPlugins();
      
      // Select the newly added plugin from the enabled list
      const enabledData = await fetchPlugins();
      const newPlugin = enabledData.find(p => p.id === pluginId);
      if (newPlugin) selectPlugin(newPlugin, 'enabled');
    } catch(e) { console.error(e); }
  };

  const handleRemove = async (pluginId) => {
    if (!window.confirm("Certeza que deseja remover esta conexão? Ela parará de funcionar em todos os botões.")) return;
    try {
      await removePlugin(pluginId);
      setSelectedPlugin(null);
      loadPlugins();
    } catch(e) { console.error(e); }
  };

  return (
    <div className="flex-1 p-6 bg-neutral-900 rounded-xl overflow-hidden flex font-inter h-full border border-white/5">
      <div className="w-1/3 border-r border-white/10 pr-6 mr-6 overflow-y-auto">
        <h2 className="text-xl font-bold mb-4 text-green-400">Minhas Conexões</h2>
        <div className="space-y-2 mb-8">
          {plugins.map(plugin => (
            <div 
              key={plugin.id} 
              onClick={() => selectPlugin(plugin, 'enabled')}
              className={`p-4 rounded-xl cursor-pointer transition-colors border ${selectedPlugin?.id === plugin.id && selectedType === 'enabled' ? 'border-green-500 bg-green-500/10' : 'border-white/5 bg-neutral-800 hover:bg-neutral-700'}`}
            >
              <div className="flex justify-between items-center mb-1">
                <h3 className="font-semibold text-lg text-white">{plugin.name}</h3>
                <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
              </div>
              <p className="text-sm text-neutral-400 line-clamp-2">{plugin.description}</p>
            </div>
          ))}
          {plugins.length === 0 && <p className="text-neutral-500 text-sm italic">Nenhuma conexão ativa.</p>}
        </div>

        <h2 className="text-xl font-bold mb-4 text-blue-400 mt-8">Catálogo (Disponíveis)</h2>
        <div className="space-y-2">
          {availablePlugins.map(plugin => (
            <div 
              key={plugin.id} 
              onClick={() => selectPlugin(plugin, 'available')}
              className={`p-4 rounded-xl cursor-pointer transition-colors border ${selectedPlugin?.id === plugin.id && selectedType === 'available' ? 'border-blue-500 bg-blue-500/10' : 'border-white/5 bg-neutral-800 hover:bg-neutral-700'}`}
            >
              <h3 className="font-semibold text-lg text-white">{plugin.name}</h3>
              <p className="text-sm text-neutral-400 mt-1 line-clamp-2">{plugin.description}</p>
            </div>
          ))}
          {availablePlugins.length === 0 && <p className="text-neutral-500 text-sm italic">Todos os plugins do seu HD já foram instalados!</p>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {selectedPlugin ? (
          <div className="flex flex-col gap-6 pr-2">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-white">{selectedPlugin.name}</h2>
                {selectedType === 'enabled' && variables && variables[`${selectedPlugin.id}.status`] && (
                  <span className="px-3 py-1 bg-neutral-800 border border-white/10 rounded-full text-xs font-semibold text-neutral-300">
                    {variables[`${selectedPlugin.id}.status`]}
                  </span>
                )}
              </div>
              <p className="text-neutral-400 mt-2 text-lg">{selectedPlugin.description}</p>
            </div>

            {selectedType === 'available' ? (
              <div className="bg-blue-900/20 border border-blue-500/30 p-8 rounded-xl flex flex-col items-center justify-center gap-4 text-center mt-8">
                <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mb-2">
                   <span className="text-3xl">🚀</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Instalar Conexão</h3>
                  <p className="text-blue-200 mt-2 max-w-sm">
                    Este driver está disponível nos seus arquivos locais, mas ainda não foi indexado nem carregado na memória.
                  </p>
                </div>
                <button 
                  onClick={() => handleAdd(selectedPlugin.id)}
                  className="mt-4 px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-all shadow-lg hover:shadow-blue-500/20"
                >
                  Adicionar Conexão
                </button>
              </div>
            ) : (
              <div className="bg-neutral-800 border border-white/5 p-6 rounded-xl flex flex-col gap-4">
                <div className="flex justify-between items-center border-b border-white/10 pb-4">
                  <h3 className="text-lg font-semibold text-white">Configuração da API</h3>
                  <button 
                    onClick={() => handleRemove(selectedPlugin.id)}
                    className="px-4 py-1.5 bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white rounded-lg text-sm font-medium transition-colors border border-red-500/20"
                  >
                    Remover Driver
                  </button>
                </div>
                
                {selectedPlugin.configSchema?.length > 0 ? (
                  <div className="space-y-4 pt-2">
                    {selectedPlugin.configSchema.map(field => {
                      const fieldKey = field.key || field.name;
                      return (
                        <div key={fieldKey} className="flex flex-col gap-1.5">
                          <label className="text-sm font-medium text-neutral-300">{field.label}</label>
                          <input 
                            type={field.type === 'password' ? 'password' : 'text'}
                            className="bg-neutral-900 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-green-500 transition-colors w-full"
                            value={formData[fieldKey] || ''}
                            placeholder={field.description || ''}
                            onChange={(e) => setFormData({ ...formData, [fieldKey]: e.target.value })}
                          />
                          {field.description && <span className="text-xs text-neutral-500">{field.description}</span>}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-8 text-center text-neutral-400">
                    <p>Este plugin não exige nenhuma configuração secreta de API e já está injetado nativamente.</p>
                  </div>
                )}

                <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
                  <span className={`text-sm ${saveStatus.includes('sucesso') ? 'text-green-400' : 'text-neutral-400'}`}>
                    {saveStatus}
                  </span>
                  <button 
                    onClick={handleSave}
                    className="px-6 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium transition-colors"
                  >
                    Salvar e Reiniciar Instância
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-neutral-500">
            <span className="text-6xl mb-4">⚙️</span>
            <p className="text-lg">Selecione uma Conexão na lista ao lado.</p>
          </div>
        )}
      </div>
    </div>
  );
}
