import React, { useState, useEffect } from 'react';
import { fetchActions, saveButton } from '../services/api';
import { X, Trash2, Plus, Zap } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

const POPULAR_ICONS = [
  'Mic', 'MicOff', 'Headphones', 'Volume2', 'VolumeX', 
  'Monitor', 'Play', 'Pause', 'SkipForward', 'SkipBack', 
  'Settings', 'Power', 'Camera', 'Video', 'VideoOff', 'Tv',
  'Gamepad2', 'MessageSquare', 'Hash', 'Globe', 'Terminal', 'Zap'
];

export default function ButtonEditor({ isOpen, onClose, buttonData, pageId, row, col, onSaveSuccess }) {
  const [text, setText] = useState('');
  const [color, setColor] = useState('#262626');
  const [icon, setIcon] = useState('');
  const [availableActions, setAvailableActions] = useState([]);
  
  // List of actions for macro chaining
  const [actionsList, setActionsList] = useState([]);

  useEffect(() => {
    if (isOpen) {
      setText(buttonData?.text || '');
      setColor(buttonData?.color || '#262626');
      setIcon(buttonData?.icon || '');
      loadActions();
      
      if (buttonData?.actions && Array.isArray(buttonData.actions)) {
        setActionsList(buttonData.actions.map(a => ({ 
          ...a, 
          listId: Math.random().toString(36).substr(2, 9) 
        })));
      } else {
        setActionsList([]);
      }
    }
  }, [isOpen, buttonData]);

  const loadActions = async () => {
    try {
      const actions = await fetchActions();
      setAvailableActions(actions);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async () => {
    // Strip frontend-only listId
    const cleanActions = actionsList
      .filter(a => a.plugin_id && a.action_id)
      .map(a => ({
        plugin_id: a.plugin_id,
        action_id: a.action_id,
        payload: a.payload || {}
      }));

    const payload = {
      id: buttonData?.id,
      page_id: pageId,
      row_index: row,
      col_index: col,
      text,
      color,
      icon,
      actions: cleanActions
    };

    try {
      await saveButton(payload);
      onSaveSuccess();
      onClose();
    } catch (e) {
      console.error(e);
    }
  };

  const addAction = () => {
    setActionsList([...actionsList, { 
      listId: Math.random().toString(36).substr(2,9), 
      plugin_id: '', 
      action_id: '', 
      payload: {} 
    }]);
  };

  const removeAction = (listId) => {
    setActionsList(actionsList.filter(a => a.listId !== listId));
  };

  const updateActionPayload = (listId, paramKey, paramValue) => {
    setActionsList(actionsList.map(a => {
      if(a.listId === listId) {
        return { ...a, payload: { ...(a.payload || {}), [paramKey]: paramValue } };
      }
      return a;
    }));
  };

  // Removed early return to allow CSS transition
  // if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
        onClick={onClose}
      />

      {/* Drawer */}
      <div 
        className={`absolute top-0 right-0 h-full w-[460px] bg-neutral-900 border-l border-white/10 shadow-2xl flex flex-col transform transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/5 flex justify-between items-center shrink-0 bg-neutral-900/50 backdrop-blur">
          <h2 className="text-xl font-bold tracking-tight text-white">Editar Botão</h2>
          <button onClick={onClose} className="p-2 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 custom-scrollbar">
          
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-neutral-300">Texto Exibido</label>
            <input 
              className="bg-black/40 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-blue-500 transition-colors"
              value={text} onChange={(e) => setText(e.target.value)} 
              placeholder="Ex: Main Cam"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-neutral-300">Cor de Fundo</label>
            <div className="flex gap-3 items-center">
              <input 
                type="color" 
                className="w-12 h-12 rounded cursor-pointer bg-neutral-800 border-2 border-white/10 shrink-0"
                value={color.startsWith('#') ? color.slice(0, 7) : '#000000'}
                onChange={(e) => setColor(e.target.value)} 
              />
              <input 
                className="flex-1 bg-black/40 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-blue-500 font-mono text-sm transition-colors"
                value={color} onChange={(e) => setColor(e.target.value)} 
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-neutral-300">Ícone</label>
            <input 
              className="bg-black/40 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-blue-500 font-mono text-sm transition-colors"
              placeholder="Ex: MicOff ou %com.macro.discord.mute_icon%"
              value={icon} onChange={(e) => setIcon(e.target.value)} 
            />
            <div className="grid grid-cols-7 gap-2 mt-2 bg-black/20 p-3 rounded-xl border border-white/5">
              {POPULAR_ICONS.map(iconName => {
                const IconComp = LucideIcons[iconName];
                if (!IconComp) return null;
                return (
                  <button
                    key={iconName}
                    onClick={() => setIcon(iconName)}
                    title={iconName}
                    className={`p-2 rounded-lg flex justify-center items-center transition-all ${
                      icon === iconName 
                        ? 'bg-blue-600 border-blue-400 border text-white shadow-lg shadow-blue-500/20' 
                        : 'bg-neutral-800/80 border border-white/5 hover:bg-neutral-700 text-neutral-300'
                    }`}
                  >
                    <IconComp size={18} />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col mt-2 pt-6 border-t border-white/5">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-base font-bold text-neutral-200">Ações (Macros)</h3>
                <p className="text-xs text-neutral-500 mt-0.5">Executadas em sequência no clique</p>
              </div>
              <button 
                onClick={addAction} 
                className="text-sm bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 px-4 py-2 rounded-lg font-bold flex items-center gap-1.5 transition-colors border border-blue-500/20"
              >
                <Plus size={16} /> Adicionar
              </button>
            </div>
            
            <div className="flex flex-col gap-4">
              {actionsList.map((act, idx) => {
                const selectedDef = availableActions.find(a => a.pluginId === act.plugin_id && a.actionId === act.action_id);
                
                return (
                  <div key={act.listId} className="bg-black/30 p-4 rounded-xl border border-white/5 relative flex flex-col gap-4 group">
                    <div className="flex gap-3 items-center">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-neutral-800 border border-white/10 text-xs font-bold text-neutral-400 shrink-0">
                        {idx + 1}
                      </div>
                      <select 
                        className="flex-1 bg-neutral-800 border border-white/10 rounded-lg p-2.5 text-white text-sm outline-none focus:border-blue-500 font-medium transition-colors cursor-pointer"
                        value={act.plugin_id && act.action_id ? `${act.plugin_id}::${act.action_id}` : ''}
                        onChange={e => {
                          const val = e.target.value;
                          if (!val) {
                            setActionsList(actionsList.map(a => a.listId === act.listId ? { ...a, plugin_id: '', action_id: '', payload: {} } : a));
                            return;
                          }
                          const [pid, aid] = val.split('::');
                          
                          const schema = availableActions.find(a => a.pluginId === pid && a.actionId === aid);
                          const initialPayload = {};
                          if (schema && schema.fields) {
                            schema.fields.forEach(f => {
                              if(f.default !== undefined) initialPayload[f.id] = f.default;
                            });
                          }
                          
                          setActionsList(actionsList.map(a => {
                            if(a.listId === act.listId) {
                              return { ...a, plugin_id: pid, action_id: aid, payload: initialPayload };
                            }
                            return a;
                          }));
                        }}
                      >
                        <option value="">-- Selecione uma Ação --</option>
                        {availableActions.map(a => (
                          <option key={`${a.pluginId}::${a.actionId}`} value={`${a.pluginId}::${a.actionId}`}>
                            {a.pluginId}: {a.name}
                          </option>
                        ))}
                      </select>
                      <button 
                        onClick={() => removeAction(act.listId)} 
                        className="text-red-400/50 hover:text-red-400 hover:bg-red-500/20 p-2.5 rounded-lg transition-colors border border-transparent hover:border-red-500/20"
                        title="Remover Ação"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                    
                    {selectedDef && selectedDef.fields && selectedDef.fields.length > 0 && (
                      <div className="ml-9 flex flex-col gap-3 pt-3 border-t border-white/5">
                        {selectedDef.fields.map(field => (
                          <div key={field.id} className="flex flex-col gap-1.5">
                            <label className="text-xs text-neutral-400 font-semibold uppercase tracking-wider">{field.label || field.id}</label>
                            {field.type === 'string' ? (
                              <input 
                                type="text"
                                className="bg-neutral-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-blue-500 transition-colors"
                                value={(act.payload || {})[field.id] || ''}
                                onChange={e => updateActionPayload(act.listId, field.id, e.target.value)}
                                placeholder={field.default || ''}
                              />
                            ) : field.type === 'dropdown' ? (
                              <select 
                                className="bg-neutral-900 border border-white/10 rounded-lg px-2.5 py-2 text-sm text-white outline-none focus:border-blue-500 transition-colors"
                                value={(act.payload || {})[field.id] || ''}
                                onChange={e => updateActionPayload(act.listId, field.id, e.target.value)}
                              >
                                {field.options?.map(opt => (
                                  <option key={opt.value || opt} value={opt.value || opt}>
                                    {opt.label || opt}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <input 
                                type="text"
                                className="bg-neutral-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-blue-500 transition-colors"
                                value={(act.payload || {})[field.id] || ''}
                                onChange={e => updateActionPayload(act.listId, field.id, e.target.value)}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              
              {actionsList.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 px-4 border-2 border-dashed border-white/5 rounded-2xl bg-black/10 text-center">
                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
                    <Zap size={20} className="text-neutral-500" />
                  </div>
                  <h4 className="text-sm font-bold text-neutral-300">Nenhuma Macro</h4>
                  <p className="text-xs text-neutral-500 mt-1 max-w-[200px]">Adicione ações para transformar este botão num atalho poderoso.</p>
                </div>
              )}
            </div>
          </div>
          
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/5 bg-neutral-900/50 backdrop-blur shrink-0 flex justify-end gap-3 rounded-bl-xl">
          <button className="px-5 py-2.5 rounded-xl font-bold text-sm bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors" onClick={onClose}>
            Cancelar
          </button>
          <button className="px-6 py-2.5 rounded-xl font-bold text-sm bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-500/20 text-white transition-all transform hover:scale-105" onClick={handleSave}>
            Salvar Alterações
          </button>
        </div>
      </div>
    </div>
  );
}
