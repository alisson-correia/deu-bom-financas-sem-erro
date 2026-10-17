import React, { useCallback, useState } from 'react';
import './TransactionList.css';

function TransactionItem({
  transaction,
  selectable = false,
  isSelected = false,
  onSelect = null,
  editable = false,
  onEdit = null,
  onDelete = null,
  compact = false,
}) {
  const { id, date, description, categoryIcon, category, amount, type } = transaction;

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateStr) => {
    const parsed = new Date(`${dateStr}T12:00:00`);
    return parsed.toLocaleString('pt-BR', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div
      className={`transaction-item transaction-${type} ${isSelected ? 'selected' : ''} ${
        compact ? 'compact' : ''
      }`}
      role="row"
      data-testid={`transaction-${id}`}
    >
      {selectable && (
        <div className="checkbox-wrapper">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onSelect?.(id)}
            aria-label={`Selecionar ${description}`}
          />
        </div>
      )}

      <div className="category-icon">{categoryIcon}</div>

      <div className="info">
        <div className="description">{description}</div>
        {!compact && <div className="category-label">{category}</div>}
        {!compact && <div className="date">{formatDate(date)}</div>}
      </div>

      <div className={`amount amount-${type}`}>
        {type === 'income' ? '+' : '-'} {formatCurrency(Math.abs(amount))}
      </div>

      {editable && (
        <div className="actions">
          {onEdit && (
            <button
              className="action-btn edit"
              onClick={() => onEdit(transaction)}
              title="Editar"
              aria-label={`Editar ${description}`}
            >
              Editar
            </button>
          )}
          {onDelete && (
            <button
              className="action-btn delete"
              onClick={() => onDelete(id)}
              title="Deletar"
              aria-label={`Deletar ${description}`}
            >
              Deletar
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function TransactionList({
  transactions = [],
  limit = null,
  compact = false,
  selectable = false,
  editable = false,
  grouped = false,
  groupBy = 'date',
  onDelete = null,
  onEdit = null,
  onSelectionChange = null,
  loading = false,
  emptyText = 'Nenhuma transacao especificada',
  className = '',
}) {
  const [selectedIds, setSelectedIds] = useState(new Set());

  const handleSelect = useCallback(
    (id, multi = false) => {
      const newSelected = new Set(selectedIds);

      if (multi) {
        if (newSelected.has(id)) {
          newSelected.delete(id);
        } else {
          newSelected.add(id);
        }
      } else {
        newSelected.has(id) ? newSelected.delete(id) : newSelected.add(id);
      }

      setSelectedIds(newSelected);
      onSelectionChange && onSelectionChange(Array.from(newSelected));
    },
    [selectedIds, onSelectionChange]
  );

  let items = transactions;
  if (limit && limit > 0) {
    items = items.slice(0, limit);
  }

  let groupedItems = null;
  if (grouped) {
    groupedItems = items.reduce((acc, transaction) => {
      let key;

      if (groupBy === 'date') {
        key = new Date(`${transaction.date}T12:00:00`).toLocaleDateString('pt-BR');
      } else if (groupBy === 'category') {
        key = transaction.category;
      } else if (groupBy === 'type') {
        key = transaction.type === 'income' ? 'Receitas' : 'Gastos';
      }

      if (!acc[key]) {
        acc[key] = [];
      }

      acc[key].push(transaction);
      return acc;
    }, {});
  }

  if (!loading && items.length === 0) {
    return (
      <div className={`transaction-list empty ${className}`}>
        <div className="empty-state">
          <div className="empty-icon">Lista</div>
          <div className="empty-text">{emptyText}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`transaction-list ${className}`}>
      {loading ? (
        <div className="loading" aria-label="Carregando transacoes">
          <div className="spinner">Carregando</div>
          <span>Carregando...</span>
        </div>
      ) : grouped ? (
        <div className="grouped-transactions">
          {Object.entries(groupedItems || {}).map(([groupKey, groupTransactions]) => (
            <div key={groupKey} className="transaction-group">
              <div className="group-header">{groupKey}</div>
              <div className="group-items">
                {groupTransactions.map((transaction) => (
                  <TransactionItem
                    key={transaction.id}
                    transaction={transaction}
                    selectable={selectable}
                    isSelected={selectedIds.has(transaction.id)}
                    onSelect={selectable ? handleSelect : null}
                    editable={editable}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    compact={compact}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="simple-list">
          {items.map((transaction) => (
            <TransactionItem
              key={transaction.id}
              transaction={transaction}
              selectable={selectable}
              isSelected={selectedIds.has(transaction.id)}
              onSelect={selectable ? handleSelect : null}
              editable={editable}
              onEdit={onEdit}
              onDelete={onDelete}
              compact={compact}
            />
          ))}
        </div>
      )}

      {selectable && selectedIds.size > 0 && (
        <div className="selection-footer">
          <span>{selectedIds.size} selecionado(s)</span>
        </div>
      )}
    </div>
  );
}

export default TransactionList;
