import { useState } from 'react';

export function AuthScreen({ client }) {
  const [signup, setSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const { data, error } = signup
        ? await client.auth.signUp({ email: email.trim(), password })
        : await client.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      if (signup && !data.session) setMessage('Confira seu e-mail para confirmar o cadastro e depois entre.');
    } catch {
      setError(signup
        ? 'Não foi possível criar a conta. Confira os dados ou tente novamente mais tarde.'
        : 'Não foi possível entrar. Confira e-mail e senha, a confirmação da conta e sua conexão.');
    } finally {
      setBusy(false);
    }
  };

  return <main className="account-card">
    <h1>DEU BOM!!</h1>
    <h2>{signup ? 'Criar conta' : 'Entrar'}</h2>
    <p>Acesse suas finanças com sua conta.</p>
    <form onSubmit={submit}>
      <label>E-mail<input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
      <label>Senha<input type="password" autoComplete={signup ? 'new-password' : 'current-password'} minLength={signup ? 8 : undefined} required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      <button disabled={busy}>{busy ? 'Aguarde…' : signup ? 'Cadastrar' : 'Entrar'}</button>
    </form>
    <button disabled={busy} onClick={() => { setSignup(!signup); setError(''); setMessage(''); }}>
      {signup ? 'Já tenho uma conta' : 'Criar uma conta'}
    </button>
  </main>;
}
