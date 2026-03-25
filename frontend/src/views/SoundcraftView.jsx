import React from 'react';
import { executeAction } from '../services/api';
import { Sliders, VolumeX, Volume2 } from 'lucide-react';

const FaderStrip = ({ label, colorFrom, colorTo, mixValue, isMuted, onChange, onDragStart, onDragEnd, onMuteToggle }) => {
  const formatValue = (mixVal) => {
    return Math.round(mixVal * 100) + '%';
  };

  return (
    <div className="flex flex-col items-center bg-neutral-800/80 p-6 rounded-2xl border border-white/5 hover:border-white/10 transition-colors shadow-xl w-full max-w-[200px]">
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-white tracking-widest">{label}</h3>
        <p className={`text-sm font-bold mt-1 px-3 py-0.5 rounded-full inline-block ${isMuted ? 'bg-red-500/20 text-red-500' : 'bg-neutral-900 text-neutral-400'}`}>
          {isMuted ? 'MUTADO' : formatValue(mixValue)}
        </p>
      </div>

      <div className="relative h-64 w-12 flex justify-center mb-6">
        <input
          type="range"
          min="0"
          max="1"
          step="0.001"
          value={mixValue}
          onChange={onChange}
          onMouseDown={onDragStart}
          onMouseUp={onDragEnd}
          onTouchStart={onDragStart}
          onTouchEnd={onDragEnd}
          className="absolute h-64 w-12 appearance-none cursor-pointer rounded-xl bg-neutral-900 shadow-inner outline-none z-10 opacity-0"
          style={{ appearance: 'slider-vertical', WebkitAppearance: 'slider-vertical' }}
        />
        
        {/* Track Custom Visual */}
        <div className="absolute inset-0 w-8 mx-auto bg-neutral-900 rounded-full shadow-inner overflow-hidden flex flex-col justify-end">
          {/* Fill */}
          <div 
            className={`w-full transition-all duration-75 ease-out ${isMuted ? 'bg-neutral-700' : `bg-gradient-to-t ${colorFrom} ${colorTo}`}`}
            style={{ height: `${mixValue * 100}%` }}
          />
        </div>

        {/* Thumb Visual */}
        <div 
          className="absolute w-14 h-6 bg-neutral-200 border-2 border-neutral-400 rounded shadow-[0_4px_16px_rgba(0,0,0,0.5)] z-0 pointer-events-none transition-all duration-75 ease-out flex items-center justify-center"
          style={{ bottom: `calc(${mixValue * 100}% - 12px)` }}
        >
          <div className="w-full h-0.5 bg-neutral-400 mx-2" />
        </div>
        
        {/* 76.5% Marker (0dB on SC Ui) */}
        <div className="absolute w-12 h-0.5 bg-white/20 pointer-events-none z-0" style={{ bottom: '76.5%' }} />
        <span className="absolute -left-6 text-[10px] text-neutral-500 font-bold pointer-events-none" style={{ bottom: '74.5%' }}>0dB</span>
      </div>

      <button
        onClick={onMuteToggle}
        className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all shadow-lg border-2 ${
          isMuted 
            ? 'bg-red-500/10 border-red-500/50 text-red-500 shadow-red-500/20 scale-95' 
            : 'bg-neutral-900 border-white/5 text-neutral-400 hover:text-white hover:bg-neutral-800'
        }`}
      >
        {isMuted ? <VolumeX size={28} /> : <Volume2 size={28} />}
      </button>
    </div>
  );
};

const SoundcraftView = ({ variables }) => {
  // Helpers
  const parseVal = (name, def = '0') => {
    const val = variables[`com.macro.soundcraft.${name}`];
    return val !== undefined ? parseFloat(val) : parseFloat(def);
  };

  // Como é stereo link, usamos o L como "mestre" visual da leitura do painel
  const lineMix = parseVal('line_l_mix', '0');
  const lineMute = parseVal('line_l_mute', '0') === 1;

  const [localMix, setLocalMix] = React.useState(lineMix);
  const [localMute, setLocalMute] = React.useState(lineMute);
  const [isDragging, setIsDragging] = React.useState(false);

  React.useEffect(() => {
    if (!isDragging) {
      setLocalMix(lineMix);
    }
  }, [lineMix, isDragging]);

  React.useEffect(() => {
    if (!isDragging) {
      setLocalMute(lineMute);
    }
  }, [lineMute, isDragging]);

  // Ao alterar qualquer um dos lados, enviamos o comando para AMBOS OS LADOS (L e R)
  // pois a API nativa da Soundcraft requer que o cliente gerencie as duas faders no WebSocket mesmo com Stereo Link ativo.
  const setFaderMaster = async (val) => {
    const parsedVal = parseFloat(val).toFixed(4);
    await executeAction('com.macro.soundcraft', 'set_fader', { channel: 'l.0', val: parsedVal });
    await executeAction('com.macro.soundcraft', 'set_fader', { channel: 'l.1', val: parsedVal });
  };

  const toggleMuteMaster = async (currentState) => {
    const newState = currentState ? 0 : 1;
    await executeAction('com.macro.soundcraft', 'set_mute', { channel: 'l.0', state: newState });
    await executeAction('com.macro.soundcraft', 'set_mute', { channel: 'l.1', state: newState });
  };

  const handleChange = (e) => {
    const val = e.target.value;
    setLocalMix(val);
    setFaderMaster(val);
  };

  const handleMuteToggle = () => {
    const newState = !localMute;
    setLocalMute(newState);
    toggleMuteMaster(localMute);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full bg-neutral-900/40 rounded-xl border border-white/5 p-6 overflow-hidden">
      <div className="flex items-center gap-4 mb-10 w-full border-b border-white/10 pb-6">
        <div className="w-14 h-14 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
          <Sliders size={28} className="text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Soundcraft Ui</h2>
          <p className="text-sm text-blue-400 font-semibold mt-0.5 uppercase tracking-wide">
            Controle Estéreo de Line In (L/R)
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center gap-8 w-full">
        <FaderStrip 
          label="LINE L" 
          colorFrom="from-blue-600"
          colorTo="to-cyan-400"
          mixValue={localMix}
          isMuted={localMute}
          onChange={handleChange}
          onDragStart={() => setIsDragging(true)}
          onDragEnd={() => setIsDragging(false)}
          onMuteToggle={handleMuteToggle}
        />
        <FaderStrip 
          label="LINE R" 
          colorFrom="from-purple-600"
          colorTo="to-pink-400"
          mixValue={localMix}
          isMuted={localMute}
          onChange={handleChange}
          onDragStart={() => setIsDragging(true)}
          onDragEnd={() => setIsDragging(false)}
          onMuteToggle={handleMuteToggle}
        />
      </div>
    </div>
  );
};

export default SoundcraftView;
