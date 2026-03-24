import React, { useRef } from 'react';
import { Download, Upload, Settings } from 'lucide-react';
const API_URL = 'http://localhost:3001/api';

const SettingsView = () => {
  const fileInputRef = useRef(null);

  const handleExport = async () => {
    try {
      const response = await fetch(`${API_URL}/export`);
      const data = await response.json();
      const dataStr = JSON.stringify(data, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `macrostudio-backup-${new Date().getTime()}.mvp`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert('Erro ao exportar backup: ' + err.message);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target.result);
        
        // Confirm before wiping
        if (!window.confirm("Atenção! Importar um backup irá apagar todos os seus botões e configurações de plugins atuais. Deseja continuar?")) {
          return;
        }

        await fetch(`${API_URL}/import`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(json)
        });
        alert('Backup restaurado com sucesso! A página será recarregada.');
        window.location.reload();
      } catch (err) {
        alert('Falha ao importar, arquivo inválido ou corrompido: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = null; // reset input
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Settings className="w-8 h-8 text-blue-500" />
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
          Configurações
        </h1>
      </div>

      <div className="bg-gray-800 rounded-xl p-8 border border-gray-700 shadow-xl space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-white mb-2">Backups e Migração</h2>
          <p className="text-gray-400 mb-6">
            Você pode exportar o perfil atual desta máquina para um arquivo .mvp. Ele guarda o layout de todas as suas páginas, botões e tokens de plugins.
            Ao importar esse arquivo em outro computador, o MacroStudio ficará idêntico!
          </p>
        </div>

        <div className="flex gap-4">
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors font-medium"
          >
            <Download className="w-5 h-5" />
            Exportar Perfil (.mvp)
          </button>

          <button 
            onClick={handleImportClick}
            className="flex items-center gap-2 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors border border-gray-600 font-medium"
          >
            <Upload className="w-5 h-5" />
            Importar Perfil (.mvp)
          </button>
          
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept=".mvp,.json"
            className="hidden" 
          />
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
