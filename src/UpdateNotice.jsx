import { useEffect, useState } from 'react';

export function UpdateNotice() {
  const [available, setAvailable] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    let active = true;
    let running = false;
    const check = async () => {
      if (running || document.visibilityState === 'hidden') return;
      running = true;
      try {
        const response = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store', signal: AbortSignal.timeout(5000) });
        if (!response.ok) return;
        const version = await response.json();
        if (active && typeof version.version === 'string' && version.version !== __APP_VERSION__) setAvailable(true);
      } catch { /* Offline: keep the current app and any unsaved form. */ }
      finally { running = false; }
    };
    check();
    const timer = setInterval(check, 60_000);
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', check);
    return () => { active = false; clearInterval(timer); window.removeEventListener('focus', check); document.removeEventListener('visibilitychange', check); };
  }, []);
  if (!available || dismissed) return null;
  return <aside className="update-notice" role="status">
    <div><strong>Uma nova versão está disponível</strong><p>Salve suas alterações antes de atualizar.</p></div>
    <button onClick={() => { if (window.confirm('Atualizar o app? Alterações de formulários ainda não salvas serão perdidas.')) window.location.reload(); }}>Atualizar app</button>
    <button onClick={() => setDismissed(true)}>Depois</button>
  </aside>;
}
