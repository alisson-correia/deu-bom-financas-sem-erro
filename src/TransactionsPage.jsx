import React, { useMemo, useState } from 'react';
import { FilterBar } from '@/components/common/FilterBar';
import { TransactionList } from '@/components/financial/TransactionList';
import { ActionBar } from '@/components/common/ActionBar';
import { BottomNav } from '@/components/common/BottomNav';
import './TransactionsPage.css';
import { filterTransactions } from './lib/finance';

export function TransactionsPage({
  transactions = [],
  categories = [],
  canWrite = true,
  busy = false,
  onNavigate = () => {},
  onDeleteTransactions = () => {},
  onCategorizeTransactions = () => {},
  onExportTransactions = () => {},
}) {
  const [filter, setFilter] = useState({ period: 'Ultimos 30d', categories: [], search: '' });
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectionResetKey, setSelectionResetKey] = useState(0);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');

  const [error, setError] = useState('');
  const categoryNames = [...new Set([...categories.map((item) => item.name), 'Sem categoria'])];
  const filteredTransactions = useMemo(() => filterTransactions(transactions, filter), [transactions, filter]);
  const changeFilter = (next) => {
    setFilter(next);
    setSelectedIds([]);
    setSelectionResetKey((value) => value + 1);
  };

  const handleSelectionChange = (ids) => {
    setSelectedIds(ids);
  };

  const handleDeleteSelected = async () => {
    if (!window.confirm(`Excluir ${selectedIds.length} transação(ões)? Essa ação não pode ser desfeita.`)) return;
    setError('');
    try { await onDeleteTransactions(selectedIds); }
    catch (error) { setError(error.message); return; }
    setSelectedIds([]);
    setSelectionResetKey((current) => current + 1);
  };

  const handleCategorizeSelected = () => {
    setSelectedCategory('');
    setShowCategoryModal(true);
  };

  const handleApplyCategory = async () => {
    setError('');
    try { await onCategorizeTransactions(selectedIds, selectedCategory); }
    catch (error) { setError(error.message); return; }
    setSelectedIds([]);
    setSelectionResetKey((current) => current + 1);
    setShowCategoryModal(false);
  };

  const handleExport = () => {
    onExportTransactions(filteredTransactions);
  };

  return (
    <div className="transactions-page">
      <header className="transactions-page__header">
        <h1>Transacoes</h1>

      </header>

      <FilterBar
        periods={['Ultimos 30d', 'Este mes', 'Este ano', 'Todo periodo']}
        categories={categoryNames}
        onFilter={changeFilter}
        initialPeriod="Ultimos 30d"
        showSearch
      />

      {error && <p role="alert">{error}</p>}
      <main className="transactions-page__main">
        <div className="transactions-page__status">
          <span>{filteredTransactions.length} transacoes encontradas</span>
          {selectedIds.length > 0 && (
            <span className="transactions-page__selected">
              {selectedIds.length} selecionadas
            </span>
          )}
          {selectedIds.length === 0 && (
            <button className="transactions-page__cta-export" onClick={handleExport}>
              Exportar
            </button>
          )}
        </div>

        {filteredTransactions.length > 0 ? (
          <TransactionList
            key={selectionResetKey}
            transactions={filteredTransactions}
            limit={null}
            grouped={false}
            selectable={canWrite}
            editable={false}
            onSelectionChange={handleSelectionChange}
          />
        ) : (
          <div className="transactions-page__empty">
            <p>Nenhuma transacao encontrada</p>
            <small>Tente ajustar os filtros</small>
          </div>
        )}
      </main>

      {canWrite && selectedIds.length > 0 && (
        <ActionBar
          selectedCount={selectedIds.length}
          actions={[
            { disabled: busy, label: 'Deletar', icon: 'DEL', handler: handleDeleteSelected, danger: true },
            { disabled: busy, label: 'Categorizar', icon: 'TAG', handler: handleCategorizeSelected },
          ]}
        />
      )}

      {showCategoryModal && (
        <div
          className="transactions-page__modal-overlay"
          onClick={() => { if (!busy) setShowCategoryModal(false); }}
        >
          <div
            className="transactions-page__modal"
            onClick={(event) => event.stopPropagation()}
          >
            <h2>Categorizar transacoes</h2>
            <p>
              Aplicar a categoria abaixo para {selectedIds.length}{' '}
              {selectedIds.length === 1 ? 'transacao selecionada' : 'transacoes selecionadas'}.
            </p>

            <label className="transactions-page__modal-field">
              <span>Categoria</span>
              <select
                aria-label="Categoria"
                value={selectedCategory}
                onChange={(event) => setSelectedCategory(event.target.value)}
              >
                <option value="">Sem categoria</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="transactions-page__modal-actions">
              <button
                type="button"
                className="transactions-page__modal-btn transactions-page__modal-btn--secondary"
                onClick={() => { if (!busy) setShowCategoryModal(false); }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="transactions-page__modal-btn"
                disabled={busy}
                onClick={handleApplyCategory}
              >
                Aplicar categoria
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav active="transactions" onNavigate={onNavigate} />
    </div>
  );
}

export default TransactionsPage;
