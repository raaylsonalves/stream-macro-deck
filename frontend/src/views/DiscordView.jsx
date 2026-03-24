import React, { useState, useEffect } from 'react';
import { executeAction } from '../services/api';
import { Volume2, VolumeX, Users, Server, Mic, MicOff, Headphones, LogOut } from 'lucide-react';

const DiscordView = ({ variables }) => {
  const [channelInfo, setChannelInfo] = useState(null);

  useEffect(() => {
    const debugStr = variables['com.macro.discord.channel_debug'];
    if (debugStr) {
      try {
        setChannelInfo(JSON.parse(debugStr));
      } catch (e) {
        setChannelInfo(null);
      }
    }
  }, [variables]);

  const handleVolumeChange = async (userId, volumePercent) => {
    // Send arbitrary execution payload to discord plugin
    await executeAction('com.macro.discord', 'set_user_volume', { userId, volume: parseInt(volumePercent) });
  };

  if (!channelInfo || !channelInfo.voice_states) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-neutral-500 gap-4 bg-neutral-900/40 rounded-xl border border-white/5">
        <Server size={48} className="opacity-20" />
        <p className="font-medium text-lg">Você não está em um canal de voz do Discord.</p>
      </div>
    );
  }

  const localUserId = variables['com.macro.discord.user_id'];

  // Filter out local user and sort by name
  const sortedUsers = [...channelInfo.voice_states]
    .filter(state => state.user?.id !== localUserId)
    .sort((a, b) => {
      const aName = a.nick || a.user?.global_name || a.user?.username || '';
      const bName = b.nick || b.user?.global_name || b.user?.username || '';
      return aName.localeCompare(bName);
    });

  const isMuted = variables['com.macro.discord.mute'] === 'Mutado';
  const isDeaf = variables['com.macro.discord.deaf'] === 'Ensurdecido';

  return (
    <div className="flex flex-col h-full bg-neutral-900/40 rounded-xl border border-white/5 p-4 overflow-hidden">
      <div className="flex items-center gap-4 mb-6 pb-4 border-b border-white/10 shrink-0">
        <div className="w-14 h-14 rounded-xl bg-[#5865F2] flex items-center justify-center shadow-lg shadow-[#5865F2]/20">
          <Users size={28} className="text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">{channelInfo.name || 'Canal Desconhecido'}</h2>
          <p className="text-sm text-[#5865F2] font-semibold mt-0.5 uppercase tracking-wide">
            {channelInfo.voice_states.length} Participantes Ativos
          </p>
        </div>
        
        <div className="flex-1" />
        
        <div className="flex gap-2">
          <button 
            onClick={() => executeAction('com.macro.discord', 'toggle_mute')}
            title="Mutar Microfone"
            className={`p-3 rounded-xl border flex items-center justify-center transition-colors shadow-sm ${isMuted ? 'bg-red-500/20 border-red-500/50 text-red-500 hover:bg-red-500/30' : 'bg-neutral-800 border-white/5 text-neutral-300 hover:bg-neutral-700'}`}
          >
            {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
          </button>
          <button 
            onClick={() => executeAction('com.macro.discord', 'toggle_deafen')}
            title="Ensurdecer Áudio"
            className={`p-3 rounded-xl border flex items-center justify-center transition-colors shadow-sm ${isDeaf ? 'bg-red-500/20 border-red-500/50 text-red-500 hover:bg-red-500/30' : 'bg-neutral-800 border-white/5 text-neutral-300 hover:bg-neutral-700'}`}
          >
            <Headphones size={22} className={isDeaf ? 'opacity-50' : ''} />
          </button>
          <button 
            onClick={() => executeAction('com.macro.discord', 'leave_channel')}
            title="Desconectar do Canal"
            className="p-3 bg-red-600 hover:bg-red-500 text-white rounded-xl border border-red-500/50 flex items-center justify-center transition-colors shadow-sm ml-2"
          >
            <LogOut size={22} className="mr-1 hidden md:block" />
            <span className="font-bold text-sm hidden md:block">Sair</span>
            <LogOut size={22} className="md:hidden" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-3 pb-20 md:pb-0">
        {sortedUsers.map((state) => {
          const user = state.user;
          const nick = state.nick || user.global_name || user.username;
          const avatarUrl = user.avatar 
            ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`
            : `https://cdn.discordapp.com/embed/avatars/${parseInt(user.discriminator || '0', 10) % 5}.png`;
            
          return (
            <div key={user.id} className="flex flex-col md:flex-row md:items-center gap-4 bg-neutral-800/80 p-4 rounded-xl border border-white/5 hover:border-[#5865F2]/30 transition-colors shadow-sm">
              <div className="flex items-center gap-4">
                <div className="relative shrink-0">
                  <img src={avatarUrl} alt={nick} className="w-14 h-14 rounded-full border-2 border-[#5865F2]/50 object-cover bg-neutral-900 shadow-md" />
                  {(state.voice_state?.self_mute || state.mute) && (
                    <div className="absolute -bottom-1 -right-1 bg-red-500 rounded-full p-1.5 border-2 border-neutral-800 shadow-sm z-10">
                      <VolumeX size={12} className="text-white" />
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-[150px]">
                  <h3 className="text-lg font-bold text-neutral-200 truncate">{nick}</h3>
                  <span className="text-xs font-bold text-[#5865F2] uppercase tracking-wider">
                    Volume: {Math.round(state.volume)}%
                  </span>
                </div>
              </div>
              
              <div className="flex-1 flex items-center gap-4 px-2 w-full mt-2 md:mt-0">
                <Volume2 size={20} className={`shrink-0 ${state.volume > 0 ? 'text-neutral-400' : 'text-neutral-600'}`} />
                <input 
                  type="range" 
                  min="0" 
                  max="200" 
                  defaultValue={Math.round(state.volume)}
                  onMouseUp={(e) => handleVolumeChange(user.id, e.target.value)}
                  onTouchEnd={(e) => handleVolumeChange(user.id, e.target.value)}
                  className="flex-1 h-3 bg-neutral-700/50 hover:bg-neutral-600 rounded-lg appearance-none cursor-pointer accent-[#5865F2] shadow-inner transition-colors outline-none"
                />
                <Volume2 size={20} className={`shrink-0 ${state.volume > 100 ? 'text-[#5865F2]' : 'text-neutral-600'}`} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DiscordView;
