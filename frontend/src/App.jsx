import React, { useState, useEffect } from 'react';
import Grid from './components/Grid';
import ButtonEditor from './components/ButtonEditor';
import PluginsView from './components/PluginsView';
import VariablesView from './components/VariablesView';
import SettingsView from './components/SettingsView';
import DiscordView from './views/DiscordView';
import { useWebSocket } from './hooks/useWebSocket';
import { fetchPages, fetchButtons, executeButtonAction, deleteButton, updatePage } from './services/api';
import { Settings, PlaySquare, Edit3, Grid3X3, Plug, Trash2, Edit2, Database, List, LayoutGrid } from 'lucide-react';

function App() {
  const isSurfaceMode = window.location.pathname === '/surface';

  const [pages, setPages] = useState([]);
  const [buttons, setButtons] = useState([]);
  const [activePageId, setActivePageId] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [activeView, setActiveView] = useState('grid'); // 'grid', 'plugins', 'variables', 'settings'
  
  // Surface UI State
  const [isSurfaceHeaderVisible, setIsSurfaceHeaderVisible] = useState(true);
  const [showSurfaceSettings, setShowSurfaceSettings] = useState(false);
  
  // Editor State
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState({ button: null, row: 0, col: 0 });
  
  // Context Menu State
  const [contextMenu, setContextMenu] = useState(null);

  const { connected, variables, reloadTrigger } = useWebSocket();

  useEffect(() => {
    if (reloadTrigger > 0) {
      loadData(activePageId);
    }
  }, [reloadTrigger]);

  useEffect(() => {
    loadData();
    
    // Close context menu on external click
    const closeContextMenu = () => setContextMenu(null);
    document.addEventListener('click', closeContextMenu);
    return () => document.removeEventListener('click', closeContextMenu);
  }, []);

  const loadData = async (preservePageId = null) => {
    try {
      const pgs = await fetchPages();
      setPages(pgs);
      if (pgs.length > 0) {
        const targetId = preservePageId || activePageId || pgs[0].id;
        setActivePageId(targetId);
        const btns = await fetchButtons(targetId);
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

  if (isSurfaceMode) {
    const activePageIndex = pages.findIndex(p => p.id === activePageId);
    
    return (
      <div className="flex flex-col h-screen w-screen bg-black text-white p-2 font-inter overflow-hidden relative">
        {!isSurfaceHeaderVisible && (
          <button 
            onClick={() => setIsSurfaceHeaderVisible(true)}
            className="absolute top-4 right-4 z-50 p-4 bg-neutral-900/40 backdrop-blur-md border border-white/10 rounded-full text-white/50 hover:text-white transition-colors shadow-2xl"
          >
            <Settings size={28} />
          </button>
        )}

        <div className={`transition-all duration-300 ease-in-out origin-top flex flex-col gap-2 shrink-0 ${isSurfaceHeaderVisible ? 'opacity-100 scale-100 mb-2' : 'opacity-0 scale-95 h-0 overflow-hidden mb-0 pointer-events-none'}`}>
          <div className="flex justify-between items-center bg-neutral-900 p-3 rounded-xl border border-white/5 shadow-sm">
            <button 
              disabled={activePageIndex <= 0}
              onClick={() => {
                 const prevPage = pages[activePageIndex - 1];
                 if (prevPage) {
                   setActivePageId(prevPage.id);
                   loadButtons(prevPage.id);
                 }
              }}
              className="px-5 py-4 bg-neutral-800 disabled:opacity-50 rounded-lg text-sm font-bold text-neutral-300 active:bg-neutral-700 transition-colors"
            >
              &lt; Anterior
            </button>
            
            <div className="flex flex-col items-center">
              <h2 className="font-semibold text-lg text-neutral-200">
                {pages[activePageIndex]?.name || 'Carregando...'}
              </h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                 <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-red-500'}`}></div>
                 <span className="text-[10px] text-neutral-500 uppercase font-bold">{connected ? 'Online' : 'Offline'}</span>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => setShowSurfaceSettings(!showSurfaceSettings)}
                className={`p-4 rounded-lg transition-colors flex items-center justify-center ${showSurfaceSettings ? 'bg-blue-600/30 text-blue-400' : 'bg-neutral-800 text-neutral-300 active:bg-neutral-700'}`}
              >
                <Settings size={20} />
              </button>
              <button 
                disabled={activePageIndex >= pages.length - 1}
                onClick={() => {
                   const nextPage = pages[activePageIndex + 1];
                   if (nextPage) {
                     setActivePageId(nextPage.id);
                     loadButtons(nextPage.id);
                   }
                }}
                className="px-5 py-4 bg-neutral-800 disabled:opacity-50 rounded-lg text-sm font-bold text-neutral-300 active:bg-neutral-700 transition-colors"
              >
                Próximo &gt;
              </button>
              <button
                onClick={() => setIsSurfaceHeaderVisible(false)}
                className="px-5 font-bold text-lg bg-neutral-800 rounded-lg text-neutral-400 active:bg-red-500/50 hover:text-white transition-colors"
                title="Ocultar Cabeçalho (Tela Cheia)"
              >
                X
              </button>
            </div>
          </div>

          {showSurfaceSettings && pages.find(p => p.id === activePageId) && (
             <div className="flex items-center justify-center gap-4 bg-neutral-900 p-4 rounded-xl border border-white/5 shadow-sm">
                <span className="text-sm text-neutral-400 font-semibold uppercase tracking-wider">Grade:</span>
                <div className="flex items-center gap-2 text-base">
                  <span className="text-neutral-500 font-medium">Colunas</span>
                  <div className="flex items-center bg-neutral-800 rounded-lg overflow-hidden border border-neutral-700">
                    <button 
                      className="px-4 py-2 hover:bg-neutral-700 active:bg-neutral-600 text-neutral-300 font-bold"
                      onClick={() => updatePage(activePageId, { grid_cols: Math.max(1, (pages.find(p => p.id === activePageId).grid_cols || 5) - 1) })}
                    >-</button>
                    <div className="w-8 text-center font-bold text-white">{pages.find(p => p.id === activePageId).grid_cols || 5}</div>
                    <button 
                      className="px-4 py-2 hover:bg-neutral-700 active:bg-neutral-600 text-neutral-300 font-bold"
                      onClick={() => updatePage(activePageId, { grid_cols: Math.min(20, (pages.find(p => p.id === activePageId).grid_cols || 5) + 1) })}
                    >+</button>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-base ml-2">
                  <span className="text-neutral-500 font-medium">Linhas</span>
                  <div className="flex items-center bg-neutral-800 rounded-lg overflow-hidden border border-neutral-700">
                    <button 
                      className="px-4 py-2 hover:bg-neutral-700 active:bg-neutral-600 text-neutral-300 font-bold"
                      onClick={() => updatePage(activePageId, { grid_rows: Math.max(1, (pages.find(p => p.id === activePageId).grid_rows || 3) - 1) })}
                    >-</button>
                    <div className="w-8 text-center font-bold text-white">{pages.find(p => p.id === activePageId).grid_rows || 3}</div>
                    <button 
                      className="px-4 py-2 hover:bg-neutral-700 active:bg-neutral-600 text-neutral-300 font-bold"
                      onClick={() => updatePage(activePageId, { grid_rows: Math.min(20, (pages.find(p => p.id === activePageId).grid_rows || 3) + 1) })}
                    >+</button>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-base border-l border-white/10 pl-4 ml-2">
                  <span className="text-neutral-500 font-medium">Layout</span>
                  <select
                    className="bg-neutral-800 text-white rounded border border-neutral-700 py-2 px-2 cursor-pointer outline-none text-sm font-bold"
                    value={pages.find(p => p.id === activePageId).type || 'grid'}
                    onChange={async (e) => {
                       await updatePage(activePageId, { type: e.target.value });
                    }}
                  >
                    <option value="grid">Grade (Botões)</option>
                    <option value="discord">Mixer Discord</option>
                  </select>
                </div>
             </div>
          )}
        </div>
        
        <div className="flex-1 overflow-auto rounded-xl border border-white/5 bg-neutral-900/50 p-2 relative mt-0 z-0">
          {pages[activePageIndex]?.type === 'discord' ? (
            <DiscordView variables={variables} />
          ) : (
            <Grid 
              pages={pages} 
              activePageId={activePageId} 
              buttons={buttons} 
              variables={variables}
              onButtonClick={handleButtonClick}
              onContextMenu={(e) => e.preventDefault()}
            />
          )}
        </div>
      </div>
    );
  }

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
            <div className="flex items-center gap-4">
              <h2 className="font-semibold text-lg text-neutral-200">{pages.find(p => p.id === activePageId)?.name || 'Loading...'}</h2>
              
              {isEditMode && pages.find(p => p.id === activePageId) && (
                <div className="flex items-center gap-3 bg-black/40 px-3 py-1.5 rounded-lg border border-white/10">
                  <span className="text-xs text-neutral-400 font-semibold uppercase tracking-wider">Tamanho da Grid:</span>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-neutral-500">Colunas</span>
                    <div className="flex items-center bg-neutral-800 rounded-lg overflow-hidden border border-neutral-700">
                      <button 
                        className="px-2 py-0.5 hover:bg-neutral-700 active:bg-neutral-600 text-neutral-300 font-bold"
                        onClick={() => updatePage(activePageId, { grid_cols: Math.max(1, (pages.find(p => p.id === activePageId).grid_cols || 5) - 1) })}
                      >-</button>
                      <div className="w-6 text-center text-white text-sm">{pages.find(p => p.id === activePageId).grid_cols || 5}</div>
                      <button 
                        className="px-2 py-0.5 hover:bg-neutral-700 active:bg-neutral-600 text-neutral-300 font-bold"
                        onClick={() => updatePage(activePageId, { grid_cols: Math.min(20, (pages.find(p => p.id === activePageId).grid_cols || 5) + 1) })}
                      >+</button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm ml-2">
                    <span className="text-neutral-500">Linhas</span>
                    <div className="flex items-center bg-neutral-800 rounded-lg overflow-hidden border border-neutral-700">
                      <button 
                        className="px-2 py-0.5 hover:bg-neutral-700 active:bg-neutral-600 text-neutral-300 font-bold"
                        onClick={() => updatePage(activePageId, { grid_rows: Math.max(1, (pages.find(p => p.id === activePageId).grid_rows || 3) - 1) })}
                      >-</button>
                      <div className="w-6 text-center text-white text-sm">{pages.find(p => p.id === activePageId).grid_rows || 3}</div>
                      <button 
                        className="px-2 py-0.5 hover:bg-neutral-700 active:bg-neutral-600 text-neutral-300 font-bold"
                        onClick={() => updatePage(activePageId, { grid_rows: Math.min(20, (pages.find(p => p.id === activePageId).grid_rows || 3) + 1) })}
                      >+</button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm border-l border-white/10 pl-3 ml-1">
                    <span className="text-neutral-500 font-medium">Layout</span>
                    <select
                      className="bg-neutral-800 text-white rounded border border-neutral-700 py-1 cursor-pointer outline-none text-xs font-semibold"
                      value={pages.find(p => p.id === activePageId).type || 'grid'}
                      onChange={async (e) => {
                         await updatePage(activePageId, { type: e.target.value });
                      }}
                    >
                      <option value="grid">Grade de Botões</option>
                      <option value="discord">Mixer do Discord</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
            
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
          
          {pages.find(p => p.id === activePageId)?.type === 'discord' ? (
            <div className="flex-1 overflow-hidden">
              <DiscordView variables={variables} />
            </div>
          ) : (
            <Grid 
              pages={pages} 
              activePageId={activePageId} 
              buttons={buttons} 
              variables={variables}
              onButtonClick={handleButtonClick}
              onContextMenu={handleContextMenu}
            />
          )}
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
