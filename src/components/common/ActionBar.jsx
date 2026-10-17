import React from 'react';
import './ActionBar.css';

/**
 * ActionBar - Barra de ações para itens selecionados
 * 
 * Props:
 *   - selectedCount: quantos itens selecionados
 *   - actions: array de { label, icon, handler, danger? }
 */

export function ActionBar({ selectedCount = 0, actions = [] }) {
  if (selectedCount === 0) return null;

  return (
    <div className="action-bar">
      <div className="action-bar__info">
        <span className="action-bar__count">
          {selectedCount} {selectedCount === 1 ? 'item' : 'itens'} selecionado(s)
        </span>
      </div>

      <div className="action-bar__actions">
        {actions.map((action, idx) => (
          <button
            key={idx}
            className={`action-bar__btn ${action.danger ? 'action-bar__btn--danger' : ''}`}
            onClick={action.handler}
            disabled={action.disabled}
            title={action.label}
            aria-label={action.label}
          >
            {action.icon && <span className="action-bar__icon">{action.icon}</span>}
            <span className="action-bar__label">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default ActionBar;
