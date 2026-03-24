import React from 'react';
import Button from './Button';

export default function Grid({ pages, activePageId, buttons, variables, onButtonClick, onContextMenu }) {
  const activePage = pages.find(p => p.id === activePageId);
  const rows = activePage?.grid_rows || 3;
  const cols = activePage?.grid_cols || 5;

  return (
    <div className="flex-1 p-6 bg-neutral-900 rounded-xl overflow-hidden flex flex-col justify-center items-center h-full">
      <div 
        className="grid gap-4 w-full h-full max-h-[800px]"
        style={{ 
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`
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
