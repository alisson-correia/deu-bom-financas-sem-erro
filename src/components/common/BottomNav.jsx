import React from 'react';
import './BottomNav.css';

export function BottomNav({ active = 'home', onNavigate = () => {} }) {
  const tabs = [
    {
      id: 'home',
      label: 'Início',
      icon: 'M3 10 12 3l9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z',
      ariaLabel: 'Home - Visao geral',
    },
    {
      id: 'transactions',
      label: 'Movimentos',
      icon: 'M4 7h16m-4-4 4 4-4 4M20 17H4m4-4-4 4 4 4',
      ariaLabel: 'Transacoes - Gestao de movimentos',
    },
    {
      id: 'analytics',
      label: 'Análise',
      icon: 'M4 20h16M7 16V9m5 7V4m5 12v-5',
      ariaLabel: 'Analise - Insights e graficos',
    },
  ];

  return (
    <nav className="bottom-nav" role="navigation" aria-label="Navegacao principal">
      <div className="bottom-nav__container">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`bottom-nav__tab ${active === tab.id ? 'bottom-nav__tab--active' : ''}`}
            onClick={() => onNavigate(tab.id)}
            aria-label={tab.ariaLabel}
            aria-current={active === tab.id ? 'page' : undefined}
            title={tab.label}
          >
            <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={tab.icon} /></svg>
            <span className="bottom-nav__label">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="bottom-nav__spacer" />
    </nav>
  );
}

export default BottomNav;
