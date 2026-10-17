import React, { useState } from 'react';
import { BalanceCard } from '@/components/financial/BalanceCard';
import { TransactionList } from '@/components/financial/TransactionList';
import { BottomNav } from '@/components/common/BottomNav';
import './HomePage.css';
import { localDate } from './lib/finance';

const defaultForm = {
  description: '',
  amount: '',
  type: 'expense',
  category: '',
  date: '',
};

export function HomePage({
  transactions = [],
  balance = 1500,
  expenses = 500,
  income = 2000,
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

  const openNewTransactionModal = () => {
    setFormData({
      ...defaultForm,
      category: '',
      date: localDate(),
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
        <h1 className="home-page__title">DEU BOM!!</h1>

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

        <section className="home-page__section home-page__section--actions">
          <button className="home-page__cta-primary" disabled={!canWrite || busy} onClick={openNewTransactionModal}>
            + Nova Transacao
          </button>
          <button
            className="home-page__cta-secondary"
            onClick={() => onNavigate('analytics')}
          >
            Ver Analises
          </button>
        </section>
      </main>

      {showNewTransaction && (
        <div className="home-page__modal-overlay" onClick={closeNewTransactionModal}>
          <div className="home-page__modal" role="dialog" aria-modal="true" aria-labelledby="transaction-title" onClick={(event) => event.stopPropagation()}>
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
                <label className="home-page__field">
                  <span>Tipo</span>
                  <select name="type" aria-label="Tipo" value={formData.type} onChange={handleChange}>
                    <option value="expense">Gasto</option>
                    <option value="income">Receita</option>
                  </select>
                </label>

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
