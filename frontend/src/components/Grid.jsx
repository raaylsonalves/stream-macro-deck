import React from 'react';
import Button from './Button';

export default function Grid({ pages, activePageId, buttons, variables, onButtonClick, onContextMenu }) {
  const activePage = pages.find(p => p.id === activePageId);
  const rows = activePage?.grid_rows || 3;
  const cols = activePage?.grid_cols || 5;

  return (
    <div className="flex-1 p-4 bg-neutral-900 rounded-xl overflow-y-auto w-full flex flex-col items-center">
      <div 
        className="grid gap-3 w-full max-w-[1200px]"
        style={{ 
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`
        }}
      >
        {Array.from({ length: rows * cols }).map((_, i) => {
          const row = Math.floor(i / cols);
          const col = i % cols;
          const btn = buttons.find(b => b.row_index === row && b.col_index === col);
          
          return (
            <Button 
              key={i} 
              button={btn} 
              variables={variables}
              onClick={() => onButtonClick(btn, row, col)} 
              onContextMenu={(e) => onContextMenu ? onContextMenu(e, btn, row, col) : null}
            />
          );
        })}
      </div>
    </div>
  );
}
