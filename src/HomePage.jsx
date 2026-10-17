import React, { useState } from 'react';
import { BalanceCard } from '@/components/financial/BalanceCard';
import { TransactionList } from '@/components/financial/TransactionList';
import { BottomNav } from '@/components/common/BottomNav';
import './HomePage.css';
import { localDate } from './lib/finance';
import { VoiceEntry } from './VoiceEntry';
import { useEffect, useRef } from 'react';

const defaultForm = {
  description: '',
  amount: '',
  type: 'expense',
  category: '',
  date: '',
};

export function HomePage({
  transactions = [],
  balance = 0,
  expenses = 0,
  income = 0,
  onNavigate = () => {},
  onAddTransaction = () => {},
  categories = [],
  canWrite = true,
  busy = false,
}) {
  const [showNewTransaction, setShowNewTransaction] = useState(false);
  const [formData, setFormData] = useState({
    ...defaultForm,
    category: '',
    date: localDate(),
  });
  const [formError, setFormError] = useState('');
  const dialog = useRef(null);
  useEffect(() => {
    if (!showNewTransaction) return;
    const previous = document.activeElement;
    const node = dialog.current;
    node.querySelector('input')?.focus();
    const keydown = (event) => {
      if (event.key === 'Escape' && !busy) setShowNewTransaction(false);
      if (event.key !== 'Tab') return;
      const controls = [...node.querySelectorAll('input, select, button')].filter((element) => !element.disabled);
      const first = controls[0]; const last = controls.at(-1);
      if (!first) { event.preventDefault(); return; }
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    node.addEventListener('keydown', keydown);
    return () => { node.removeEventListener('keydown', keydown); previous?.focus(); };
  }, [showNewTransaction, busy]);

  const openNewTransactionModal = (type = 'expense', draft = {}) => {
    setFormData({
      ...defaultForm,
      category: '',
      date: localDate(),
      type,
      ...draft,
    });
    setFormError('');
    setShowNewTransaction(true);
  };

  const closeNewTransactionModal = () => {
    if (busy) return;
    setShowNewTransaction(false);
    setFormError('');
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.description.trim()) {
      setFormError('Informe uma descricao para a transacao.');
      return;
    }

    if (!Number.isFinite(Number(formData.amount)) || Number(formData.amount) <= 0) {
      setFormError('Informe um valor maior que zero.');
      return;
    }

    if (!formData.date) {
      setFormError('Informe a data da transacao.');
      return;
    }

    try {
      await onAddTransaction(formData);
      setShowNewTransaction(false);
      setFormError('');
    } catch (error) {
      setFormError(error.message);
    }
  };

  return (
    <div className="home-page">
      <header className="home-page__header">
        <h1 className="home-page__title">Visão geral</h1>

      </header>

      <main className="home-page__main">
        <section className="home-page__section home-page__section--hero">
          <BalanceCard
            amount={balance}
            label="SALDO ATUAL"
            variant="primary"
            size="large"
            subtext="Atualizado agora"
          />
        </section>

        <section className="quick-entry" aria-label="Novo lançamento">
          <button className="transaction-choice" data-type="expense" aria-pressed={showNewTransaction && formData.type === 'expense'} disabled={!canWrite || busy} onClick={() => openNewTransactionModal('expense')}>− Nova despesa</button>
          <button className="transaction-choice" data-type="income" aria-pressed={showNewTransaction && formData.type === 'income'} disabled={!canWrite || busy} onClick={() => openNewTransactionModal('income')}>+ Nova receita</button>
        </section>
        <VoiceEntry disabled={!canWrite || busy} onDraft={(draft) => openNewTransactionModal(draft.type, draft)} />

        <section className="home-page__section">
          <div className="home-page__summary-grid">
            <BalanceCard
              amount={expenses}
              label="Gasto total"
              variant="expense"
              size="medium"
              subtext="Este mes"
            />
            <BalanceCard
              amount={income}
              label="Receita total"
              variant="income"
              size="medium"
              subtext="Este mes"
            />
          </div>
        </section>

        <section className="home-page__section">
          <div className="home-page__section-header">
            <h2 className="home-page__section-title">Ultimas Transacoes</h2>
          </div>

          <TransactionList
            transactions={transactions.slice(0, 3)}
            limit={3}
            grouped={false}
            selectable={false}
            editable={false}
            emptyText="Nenhuma transacao ainda"
          />

          <button
            className="home-page__cta-secondary"
            onClick={() => onNavigate('transactions')}
          >
            Ver todas {'>'}
          </button>
        </section>


      </main>

      {showNewTransaction && (
        <div className="home-page__modal-overlay" onClick={closeNewTransactionModal}>
          <div ref={dialog} className="home-page__modal" role="dialog" aria-modal="true" aria-labelledby="transaction-title" onClick={(event) => event.stopPropagation()}>
            <h3 id="transaction-title">Nova Transacao</h3>
            <form className="home-page__form" onSubmit={handleSubmit}>
              <label className="home-page__field">
                <span>Descricao</span>
                <input
                  name="description"
                  type="text"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Ex: Mercado, salario, Uber"
                />
              </label>

              <div className="home-page__field-row">
                <fieldset className="type-options"><legend>Tipo</legend>
                  <button type="button" className="transaction-choice" data-type="expense" aria-pressed={formData.type === 'expense'} onClick={() => setFormData((current) => ({ ...current, type: 'expense' }))}>Despesa</button>
                  <button type="button" className="transaction-choice" data-type="income" aria-pressed={formData.type === 'income'} onClick={() => setFormData((current) => ({ ...current, type: 'income' }))}>Receita</button>
                </fieldset>

                <label className="home-page__field">
                  <span>Valor</span>
                  <input
                    name="amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={formData.amount}
                    onChange={handleChange}
                    placeholder="0.00"
                  />
                </label>
              </div>

              <div className="home-page__field-row">
                <label className="home-page__field">
                  <span>Categoria</span>
                  <select name="category" aria-label="Categoria" value={formData.category} onChange={handleChange}>
                    <option value="">Sem categoria</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="home-page__field">
                  <span>Data</span>
                  <input
                    name="date"
                    type="date"
                    value={formData.date}
                    onChange={handleChange}
                  />
                </label>
              </div>

              {formError && <p role="alert" className="home-page__form-error">{formError}</p>}

              <div className="home-page__form-actions">
                <button type="button" className="home-page__cta-secondary" onClick={closeNewTransactionModal}>
                  Cancelar
                </button>
                <button type="submit" disabled={busy} className="home-page__cta-primary">
                  Salvar transacao
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <BottomNav active="home" onNavigate={onNavigate} />
    </div>
  );
}

export default HomePage;
