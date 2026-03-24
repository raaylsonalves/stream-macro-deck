import React, { useState, useEffect } from 'react';
import { fetchVariables, fetchPlugins } from '../services/api';
import { Database, Copy, CheckCircle2 } from 'lucide-react';
import { useWebSocket } from '../hooks/useWebSocket';

export default function VariablesView() {
  const [plugins, setPlugins] = useState([]);
  const [copiedKey, setCopiedKey] = useState(null);
  const [activeGroupId, setActiveGroupId] = useState(null);
  
  // Real-time variables via WebSocket hook
  const { variables } = useWebSocket();

  useEffect(() => {
    loadPlugins();
  }, []);

  const loadPlugins = async () => {
    try {
      const ps = await fetchPlugins();
      setPlugins(ps);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCopy = (key) => {
    navigator.clipboard.writeText(`%${key}%`);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Group variables by plugin
  const groupedVariables = {};
  
  // Create groups based on known plugins
  plugins.forEach(p => {
    groupedVariables[p.id] = { name: p.name, vars: {} };
  });

  // Assign variables to their respective plugin groups
  Object.keys(variables).forEach(fullKey => {
    // Attempt to parse out the plugin Id. The format is pluginId.variableKey
    // Since pluginId can contain dots (e.g. com.macro.discord), we check against known plugins
    const matchingPlugin = plugins.find(p => fullKey.startsWith(p.id + '.'));
    
    if (matchingPlugin) {
      groupedVariables[matchingPlugin.id].vars[fullKey] = variables[fullKey];
    } else {
      // Fallback for system variables or unknown plugins
      if (!groupedVariables['system']) groupedVariables['system'] = { name: 'Sistema e Outros', vars: {} };
      groupedVariables['system'].vars[fullKey] = variables[fullKey];
    }
  });

  // Automatically select the first group if none is selected
  const availableGroupIds = Object.keys(groupedVariables).filter(id => Object.keys(groupedVariables[id].vars).length > 0);
  useEffect(() => {
    if (availableGroupIds.length > 0 && (!activeGroupId || !groupedVariables[activeGroupId]?.vars)) {
      setActiveGroupId(availableGroupIds[0]);
    }
  }, [availableGroupIds, activeGroupId, groupedVariables]);

  const activeGroup = activeGroupId ? groupedVariables[activeGroupId] : null;

  return (
    <div className="flex-1 flex flex-col gap-6 relative">
      <div className="bg-neutral-900 border border-white/5 rounded-xl p-6 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Database className="text-blue-400" /> Dicionário de Variáveis
          </h2>
          <p className="text-sm text-neutral-400 mt-1">
            Lista de variáveis globais geradas pelos plugins em tempo real. Copie a tag e cole no nome ou contexto do botão.
          </p>
        </div>
      </div>

      <div className="flex gap-6 flex-1 overflow-hidden">
        {/* Subpages Sidebar Tabs */}
        {availableGroupIds.length > 0 && (
          <div className="w-56 bg-neutral-900 border border-white/5 rounded-xl flex flex-col p-3 gap-1 overflow-y-auto">
            {availableGroupIds.map(groupId => {
              const group = groupedVariables[groupId];
              const isActive = activeGroupId === groupId;
              return (
                <button
                  key={groupId}
                  onClick={() => setActiveGroupId(groupId)}
                  className={`text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    isActive 
                      ? 'bg-blue-600/20 text-blue-400' 
                      : 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200'
                  }`}
                >
                  {group.name}
                  <div className="text-xs font-normal opacity-60 mt-0.5">{Object.keys(group.vars).length} variáveis</div>
                </button>
              );
            })}
          </div>
        )}

        {/* Tab Content Table */}
        <div className="flex-1 overflow-auto">
          {activeGroup ? (
            <div className="bg-neutral-900 border border-white/5 rounded-xl shadow-sm overflow-hidden h-full flex flex-col">
              <div className="bg-neutral-800/50 px-6 py-4 border-b border-white/5 flex items-center justify-between">
                <h3 className="font-semibold text-neutral-200">{activeGroup.name}</h3>
                <span className="text-xs text-neutral-500 font-mono">{activeGroupId}</span>
              </div>
              
              <div className="p-2 overflow-auto flex-1">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-neutral-500 border-b border-white/5">
                      <th className="py-3 px-4 font-medium w-1/3">Tag da Variável</th>
                      <th className="py-3 px-4 font-medium w-1/3">Valor Atual</th>
                      <th className="py-3 px-4 font-medium text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(activeGroup.vars).map(([fullKey, value]) => (
                      <tr key={fullKey} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-4">
                          <code className="bg-neutral-800 px-2 py-1 rounded text-blue-300 font-mono text-xs">
                            %{fullKey}%
                          </code>
                        </td>
                        <td className="py-3 px-4">
                          <div className="bg-neutral-800 px-3 py-1.5 rounded-lg text-neutral-300 inline-block">
                            {value?.toString() || 'Vazio'}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button 
                            onClick={() => handleCopy(fullKey)}
                            className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 p-2 rounded-lg transition-colors inline-flex justify-center items-center w-9 h-9"
                            title="Copiar Variável"
                          >
                            {copiedKey === fullKey ? <CheckCircle2 size={16} className="text-green-400" /> : <Copy size={16} />}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center flex items-center justify-center text-neutral-500 h-full bg-neutral-900 border border-white/5 rounded-xl">
              Nenhuma variável ativa no momento. (Verifique se as integrações estão conectadas).
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
