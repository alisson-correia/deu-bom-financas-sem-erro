import { useEffect, useRef, useState } from 'react';
import { HomePage } from './HomePage';
import { TransactionsPage } from './TransactionsPage';
import { AnalyticsPage } from './AnalyticsPage';
import { AuthScreen } from './AuthScreen';
import { supabase } from './lib/supabase';
import { addTransaction, changeTransactions, downloadCsv, loadFinance, loadWorkspaces } from './lib/finance';
import './App.css';

function App() {
  const [session, setSession] = useState(undefined);
  const [authError, setAuthError] = useState('');
  useEffect(() => {
    if (!supabase) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setAuthError('');
    });
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) setAuthError('Não foi possível recuperar a sessão. Recarregue a página para tentar novamente.');
      else setSession(data.session);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (!supabase) return <main className="account-card"><h1>DEU BOM!!</h1><h2>Configuração necessária</h2>
    <p>Configure VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY com a URL e a chave pública do projeto.</p></main>;
  if (authError) return <main className="account-card" role="alert">{authError}</main>;
  if (session === undefined) return <p role="status">Verificando sessão…</p>;
  if (!session) return <AuthScreen client={supabase} />;
  return <Account key={session.user.id} user={session.user} />;
}

function Account({ user }) {
  const [workspaces, setWorkspaces] = useState([]);
  const [workspaceId, setWorkspaceId] = useState('');
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    loadWorkspaces(supabase, user.id).then((rows) => {
      if (active) { setWorkspaces(rows); setError(''); setReady(true); }
    }).catch(() => {
      if (active) setError('Não foi possível carregar seus espaços. Tente novamente.');
    });
    return () => { active = false; };
  }, [user.id, attempt]);
  const signOut = async () => {
    setBusy(true);
    const { error } = await supabase.auth.signOut();
    if (error) { setError('Não foi possível sair. Tente novamente.'); setBusy(false); }
  };
  const canWrite = !workspaceId || ['owner', 'editor'].includes(workspaces.find((row) => row.id === workspaceId)?.role);
  return <div className="app">
    <header className="account-toolbar">
      <label>Espaço<select aria-label="Espaço" value={workspaceId} disabled={!ready || busy} onChange={(e) => setWorkspaceId(e.target.value)}>
        <option value="">Pessoal</option>
        {workspaces.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
      </select></label>
      <button disabled={busy} onClick={signOut}>Sair</button>
    </header>
    {error && <div className="account-message" role="alert">{error} <button onClick={() => setAttempt((value) => value + 1)}>Tentar novamente</button></div>}
    {!ready ? <p role="status">Carregando espaços…</p> : <Finance key={workspaceId} userId={user.id} workspaceId={workspaceId} canWrite={canWrite} />}
  </div>;
}

function Finance({ userId, workspaceId, canWrite }) {
  const [page, setPage] = useState('home');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const alive = useRef(false);
  useEffect(() => {
    alive.current = true;
    let active = true;
    loadFinance(supabase, userId, workspaceId).then((rows) => {
      if (active) { setData(rows); setLoading(false); }
    }).catch(() => {
      if (active) { setError('Não foi possível carregar suas finanças.'); setLoading(false); }
    });
    return () => { active = false; alive.current = false; };
  }, [userId, workspaceId]);

  const refresh = async () => {
    setLoading(true);
    setError('');
    try { const next = await loadFinance(supabase, userId, workspaceId); if (alive.current) setData(next); }
    catch { if (alive.current) setError('Não foi possível atualizar suas finanças. Os dados exibidos podem estar desatualizados.'); }
    finally { if (alive.current) setLoading(false); }
  };

  const mutate = async (operation) => {
    if (!canWrite || lock.current) throw new Error('Operação indisponível.');
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      await operation();
      // A successful write stays successful even if the subsequent read fails.
      await refresh();
    } catch {
      if (alive.current) setError('Não foi possível salvar a alteração. Confira sua conexão e suas permissões antes de tentar novamente.');
      throw new Error('Não foi possível salvar. Seus dados do formulário foram preservados.');
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  };
  const categories = data?.categories || [];
  const transactions = data?.transactions || [];
  const categoryNames = [...new Set([...categories.map((row) => row.name), 'Sem categoria'])];
  const income = transactions.filter((row) => row.amount > 0).reduce((sum, row) => sum + Math.round(row.amount * 100), 0) / 100;
  const expenses = transactions.filter((row) => row.amount < 0).reduce((sum, row) => sum + Math.round(-row.amount * 100), 0) / 100;

  return <>
    {!canWrite && <p className="account-message">Você tem acesso de leitura a este espaço.</p>}
    {error && <div className="account-message" role="alert">{error} <button disabled={loading || busy} onClick={refresh}>Tentar novamente</button></div>}
    {loading && <p role="status">Carregando finanças…</p>}
    {data && <fieldset className="finance-content" disabled={loading || busy} aria-busy={loading || busy}>
      <button className="refresh-button" onClick={refresh}>Atualizar dados</button>
      {page === 'transactions' ? <TransactionsPage
        transactions={transactions} categories={categories} onNavigate={setPage} canWrite={canWrite} busy={busy}
        onDeleteTransactions={(ids) => mutate(() => changeTransactions(supabase, userId, workspaceId, ids))}
        onCategorizeTransactions={(ids, category) => mutate(() => changeTransactions(supabase, userId, workspaceId, ids, category))}
        onExportTransactions={downloadCsv}
      /> : page === 'analytics' ? <AnalyticsPage transactions={transactions} categories={categoryNames} onNavigate={setPage} />
        : <HomePage transactions={transactions} categories={categories} balance={Math.round((income - expenses) * 100) / 100} income={income} expenses={expenses}
          onNavigate={setPage} canWrite={canWrite} busy={busy}
          onAddTransaction={(input) => mutate(() => addTransaction(supabase, userId, workspaceId, input))} />}
    </fieldset>}
  </>;
}

export default App;
