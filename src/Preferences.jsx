import { useEffect, useRef, useState } from 'react';
import { ThemeContext } from './lib/preferences';

export function Preferences({ children }) {
  const [mode, setMode] = useState(() => {
    try { const saved = localStorage.getItem('deubom-theme'); return ['light', 'dark'].includes(saved) ? saved : 'system'; }
    catch { return 'system'; }
  });
  const menu = useRef(null);
  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)');
    const apply = () => { document.documentElement.dataset.theme = mode === 'system' ? (media.matches ? 'dark' : 'light') : mode; };
    apply();
    try { localStorage.setItem('deubom-theme', mode); } catch { /* Preference still works for this session. */ }
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [mode]);
  return <ThemeContext.Provider value={{ mode, setMode }}>
    <div className="preferences-bar">
      <span>DEU BOM!!</span>
      <details className="theme-menu" ref={menu}>
        <summary aria-label="Alterar tema">◐ Tema</summary>
        <div role="group" aria-label="Aparência">
          {[['light', 'Claro'], ['dark', 'Escuro'], ['system', 'Sistema']].map(([value, label]) =>
            <button key={value} aria-pressed={mode === value} onClick={() => { setMode(value); menu.current.open = false; }}>{label}</button>)}
        </div>
      </details>
    </div>
    {children}
  </ThemeContext.Provider>;
}
