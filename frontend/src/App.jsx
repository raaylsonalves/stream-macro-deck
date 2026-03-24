import React, { useState, useEffect } from 'react';
import Grid from './components/Grid';
import ButtonEditor from './components/ButtonEditor';
import PluginsView from './components/PluginsView';
import VariablesView from './components/VariablesView';
import SettingsView from './components/SettingsView';
import { useWebSocket } from './hooks/useWebSocket';
import { fetchPages, fetchButtons, executeButtonAction, deleteButton } from './services/api';
import { Settings, PlaySquare, Edit3, Grid3X3, Plug, Trash2, Edit2, Database, List, LayoutGrid } from 'lucide-react';

function App() {
  const [pages, setPages] = useState([]);
  const [buttons, setButtons] = useState([]);
  const [activePageId, setActivePageId] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [activeView, setActiveView] = useState('grid'); // 'grid', 'plugins', 'variables', 'settings'
  
  // Editor State
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState({ button: null, row: 0, col: 0 });
  
  // Context Menu State
  const [contextMenu, setContextMenu] = useState(null);

  const { connected, variables } = useWebSocket();

  useEffect(() => {
    loadData();
    
    // Close context menu on external click
    const closeContextMenu = () => setContextMenu(null);
    document.addEventListener('click', closeContextMenu);
    return () => document.removeEventListener('click', closeContextMenu);
  }, []);

  const loadData = async () => {
    try {
      const pgs = await fetchPages();
      setPages(pgs);
      if (pgs.length > 0) {
        setActivePageId(pgs[0].id);
        const btns = await fetchButtons(pgs[0].id);
        setButtons(btns);
      }
    } catch (e) {
      console.error('Failed to load initial data', e);
    }
  };

  const loadButtons = async (pageId) => {
    const btns = await fetchButtons(pageId);
    setButtons(btns);
  };

  const handleButtonClick = async (button, row, col) => {
    if (isEditMode || !button) {
      setEditingSlot({ button, row, col });
      setEditorOpen(true);
      return;
    }

    if (button) {
      // Execute the associated action via API.
      console.log('Action triggered on button:', button.id);
      try {
        await executeButtonAction(button.id);
      } catch (e) {
        console.error('Execution returned an error', e);
      }
    }
  };

  const handleContextMenu = (e, button, row, col) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, button, row, col });
  };

  const handleDeleteButton = async (buttonId) => {
    try {
      if (confirm('Tem certeza que deseja remover este botão?')) {
        await deleteButton(buttonId);
        loadButtons(activePageId);
      }
    } catch (e) {
      console.error('Failed to delete button', e);
    }
  };

  return (
    <div className="flex h-screen bg-black text-white p-4 gap-4 font-inter">
      {/* Sidebar */}
      <div className="w-64 bg-neutral-900 rounded-xl p-4 flex flex-col border border-white/5">
        <div className="flex items-center gap-2 mb-8">
          <PlaySquare className="text-blue-500" size={28} />
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Macro MVP</h1>
        </div>
        
        <div className="flex-1 mt-6">
          <h2 className="text-xs text-neutral-500 mb-3 uppercase font-semibold tracking-wider px-2">System</h2>
          <ul className="space-y-1 mb-6">
            <li 
              className={`p-3 rounded-lg flex items-center gap-3 cursor-pointer transition-colors text-sm font-medium ${activeView === 'grid' ? 'bg-blue-600/20 text-blue-400' : 'hover:bg-neutral-800 text-neutral-300'}`}
              onClick={() => setActiveView('grid')}
            >
              <Grid3X3 size={18} /> Actions Grid
            </li>
            <li 
              className={`p-3 rounded-lg flex items-center gap-3 cursor-pointer transition-colors text-sm font-medium ${activeView === 'plugins' ? 'bg-blue-600/20 text-blue-400' : 'hover:bg-neutral-800 text-neutral-300'}`}
              onClick={() => setActiveView('plugins')}
            >
              <Plug size={18} /> Integrations & Plugins
            </li>
            <li 
              className={`p-3 rounded-lg flex items-center gap-3 cursor-pointer transition-colors text-sm font-medium ${activeView === 'variables' ? 'bg-blue-600/20 text-blue-400' : 'hover:bg-neutral-800 text-neutral-300'}`}
              onClick={() => setActiveView('variables')}
            >
              <Database size={18} /> Dicionário de Variáveis
            </li>
            <li 
              className={`p-3 rounded-lg flex items-center gap-3 cursor-pointer transition-colors text-sm font-medium ${activeView === 'settings' ? 'bg-blue-600/20 text-blue-400' : 'hover:bg-neutral-800 text-neutral-300'}`}
              onClick={() => setActiveView('settings')}
            >
              <Settings size={18} /> Configurações
            </li>
          </ul>

          <h2 className="text-xs text-neutral-500 mb-3 uppercase font-semibold tracking-wider px-2">Pages</h2>
          <ul className="space-y-1">
            {pages.map(page => (
              <li 
                key={page.id} 
                className={`p-3 rounded-lg cursor-pointer transition-colors text-sm font-medium ${activePageId === page.id && activeView === 'grid' ? 'bg-blue-600/20 text-blue-400' : 'hover:bg-neutral-800 text-neutral-300'}`}
                onClick={async () => {
                  setActiveView('grid');
                  setActivePageId(page.id);
                  const btns = await fetchButtons(page.id);
                  setButtons(btns);
                }}
              >
                {page.name}
              </li>
            ))}
          </ul>
        </div>
        
        <div className="mt-auto flex items-center gap-2 text-sm text-neutral-400 p-2 border-t border-white/5 pt-4">
          <div className={`w-2.5 h-2.5 rounded-full ${connected ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-red-500'}`}></div>
          {connected ? 'Sync Server Active' : 'Offline'}
        </div>
      </div>

      {/* Main Content Area */}
      {activeView === 'grid' ? (
        <div className="flex-1 flex flex-col gap-4">
          <div className="flex justify-between items-center bg-neutral-900 p-4 rounded-xl border border-white/5 shadow-sm">
            <h2 className="font-semibold text-lg text-neutral-200">{pages.find(p => p.id === activePageId)?.name || 'Loading...'}</h2>
            <div className="flex gap-2">
              <button 
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors font-medium text-sm ${isEditMode ? 'bg-blue-600 text-white shadow-[0_0_12px_rgba(37,99,235,0.4)]' : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'}`}
                onClick={() => setIsEditMode(!isEditMode)}
              >
                <Edit3 size={16} />
                {isEditMode ? 'Done Editing' : 'Edit Buttons'}
              </button>
            </div>
          </div>
          
          <Grid 
            pages={pages} 
            activePageId={activePageId} 
            buttons={buttons} 
            variables={variables}
            onButtonClick={handleButtonClick}
            onContextMenu={handleContextMenu}
          />
        </div>
      ) : activeView === 'plugins' ? (
        <PluginsView />
      ) : activeView === 'variables' ? (
        <VariablesView />
      ) : activeView === 'settings' ? (
        <SettingsView />
      ) : null}

      <ButtonEditor 
        isOpen={editorOpen} 
        onClose={() => setEditorOpen(false)} 
        buttonData={editingSlot.button} 
        pageId={activePageId} 
        row={editingSlot.row} 
        col={editingSlot.col} 
        onSaveSuccess={() => loadButtons(activePageId)}
      />

      {contextMenu && (
        <div 
          className="fixed bg-neutral-800 border border-white/10 rounded-xl shadow-2xl z-[100] py-1 flex flex-col min-w-[160px] overflow-hidden"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()} // Prevent auto close when clicking inside
        >
          <button 
            onClick={() => {
              setEditingSlot({ button: contextMenu.button, row: contextMenu.row, col: contextMenu.col });
              setEditorOpen(true);
              setContextMenu(null);
            }}
            className="flex items-center gap-2 px-4 py-2 hover:bg-neutral-700 text-neutral-200 text-sm font-medium transition-colors w-full text-left"
          >
            <Edit2 size={16} className="text-blue-400" />
            Editar
          </button>
          
          {contextMenu.button && (
            <button 
              onClick={() => {
                handleDeleteButton(contextMenu.button.id);
                setContextMenu(null);
              }}
              className="flex items-center gap-2 px-4 py-2 hover:bg-red-500/20 text-red-500 hover:text-red-400 text-sm font-medium transition-colors w-full text-left"
            >
              <Trash2 size={16} />
              Excluir
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
