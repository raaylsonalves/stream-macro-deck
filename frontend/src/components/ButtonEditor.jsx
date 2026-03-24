import React, { useState, useEffect } from 'react';
import { fetchActions, saveButton } from '../services/api';
import { X } from 'lucide-react';
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
  const [selectedAction, setSelectedAction] = useState('');

  useEffect(() => {
    if (isOpen) {
      setText(buttonData?.text || '');
      setColor(buttonData?.color || '#262626');
      setIcon(buttonData?.icon || '');
      loadActions();
      
      if (buttonData?.plugin_id && buttonData?.action_id) {
        setSelectedAction(`${buttonData.plugin_id}::${buttonData.action_id}`);
      } else {
        setSelectedAction('');
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
    let pluginId = null;
    let actionId = null;
    if (selectedAction) {
      const [pid, aid] = selectedAction.split('::');
      pluginId = pid;
      actionId = aid;
    }

    const payload = {
      id: buttonData?.id,
      page_id: pageId,
      row_index: row,
      col_index: col,
      text,
      color,
      icon,
      plugin_id: pluginId,
      action_id: actionId
    };

    try {
      await saveButton(payload);
      onSaveSuccess();
      onClose();
    } catch (e) {
      console.error(e);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50">
      <div className="bg-neutral-900 border border-white/10 rounded-xl p-6 w-96 shadow-2xl flex flex-col gap-4 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-neutral-400 hover:text-white">
          <X size={20} />
        </button>
        <h2 className="text-xl font-semibold">Edit Button</h2>
        
        <div className="flex flex-col gap-1">
          <label className="text-sm text-neutral-400">Text</label>
          <input 
            className="bg-neutral-800 border border-white/10 rounded-lg p-2 text-white outline-none focus:border-blue-500"
            value={text} onChange={(e) => setText(e.target.value)} 
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm text-neutral-400">Background Color</label>
          <div className="flex gap-2">
            <input 
              type="color" 
              className="w-10 h-10 rounded cursor-pointer bg-neutral-800 border border-white/10"
              value={color.startsWith('#') ? color.slice(0, 7) : '#000000'}
              onChange={(e) => setColor(e.target.value)} 
            />
            <input 
              className="flex-1 bg-neutral-800 border border-white/10 rounded-lg p-2 text-white outline-none focus:border-blue-500 font-mono"
              value={color} onChange={(e) => setColor(e.target.value)} 
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm text-neutral-400">Icon</label>
          <input 
            className="bg-neutral-800 border border-white/10 rounded-lg p-2 text-white outline-none focus:border-blue-500 mb-2 font-mono text-sm"
            placeholder="Ex: MicOff ou %com.macro.discord.mute_icon%"
            value={icon} onChange={(e) => setIcon(e.target.value)} 
          />
          <div className="grid grid-cols-8 gap-2 max-h-32 overflow-y-auto p-1">
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
                      ? 'bg-blue-600 border-blue-400 border text-white' 
                      : 'bg-neutral-800 border border-white/5 hover:bg-neutral-700 text-neutral-300'
                  }`}
                >
                  <IconComp size={18} />
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm text-neutral-400">Action</label>
          <select 
            className="bg-neutral-800 border border-white/10 rounded-lg p-2 text-white outline-none focus:border-blue-500"
            value={selectedAction} onChange={(e) => setSelectedAction(e.target.value)}
          >
            <option value="">No Action</option>
            {availableActions.map(a => (
              <option key={`${a.pluginId}::${a.actionId}`} value={`${a.pluginId}::${a.actionId}`}>
                {a.pluginId}: {a.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 transition" onClick={onClose}>Cancel</button>
          <button className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 transition font-semibold" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
}
