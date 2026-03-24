import React from 'react';
import * as LucideIcons from 'lucide-react';

export default function Button({ button, variables, onClick, onContextMenu }) {
  // button: { text, color, icon, row_index, col_index }
  
  let bg = button?.color || '#262626'; // tailwind neutral-800
  if (variables && bg.includes('%')) {
    bg = bg.replace(/%([^%]+)%/g, (match, key) => {
      return variables[key] !== undefined ? variables[key] : match;
    });
  }

  let displayText = button?.text || '';
  if (variables && displayText.includes('%')) {
    displayText = displayText.replace(/%([^%]+)%/g, (match, key) => {
      return variables[key] !== undefined ? variables[key] : match;
    });
  }

  let targetIcon = button?.icon || '';
  if (variables && targetIcon.includes('%')) {
    targetIcon = targetIcon.replace(/%([^%]+)%/g, (match, key) => {
      return variables[key] !== undefined ? variables[key] : match;
    });
  }

  const IconComponent = targetIcon && LucideIcons[targetIcon] ? LucideIcons[targetIcon] : null;

  return (
    <div 
      onClick={onClick}
      onContextMenu={onContextMenu}
      className="flex flex-col items-center justify-center rounded-xl shadow-lg cursor-pointer transition-all hover:brightness-110 active:scale-95 border border-white/5 aspect-square"
      style={{ backgroundColor: bg, width: '100%' }}
    >
      {IconComponent && <IconComponent size={28} className={displayText ? 'mb-2 text-white' : 'text-white'} />}
      {displayText && (
        <span className="text-white font-semibold text-center select-none px-2 leading-tight">
          {displayText}
        </span>
      )}
    </div>
  );
}
