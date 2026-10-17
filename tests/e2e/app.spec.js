import { expect, test } from '@playwright/test';

const USER = '11111111-1111-4111-8111-111111111111';
const SPACE = '22222222-2222-4222-8222-222222222222';
const CATEGORY = '33333333-3333-4333-8333-333333333333';
const localToday = () => new Intl.DateTimeFormat('en-CA').format(new Date());

async function backend(page, { viewer = false, editor = false, authFailure = false, signup = false } = {}) {
  const state = { rows: [], readFailure: false, writeFailure: false, requests: [], writes: [] };
  const session = {
    access_token: 'test-access-token', refresh_token: 'test-refresh-token', token_type: 'bearer',
    expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: { id: USER, email: 'teste@example.com', aud: 'authenticated', role: 'authenticated' },
  };
  await page.route('https://supabase.test/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    state.requests.push({ path: url.pathname, query: url.searchParams, method: request.method() });
    const reply = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (url.pathname.endsWith('/token')) return authFailure
      ? reply({ error: 'invalid_grant', error_description: 'Invalid login credentials' }, 400)
      : reply(session);
    if (url.pathname.endsWith('/signup')) return reply(signup ? { user: session.user, session: null } : session);
    if (url.pathname.endsWith('/logout')) return reply({});
    if (url.pathname.endsWith('/user')) return reply(session.user);
    if (url.pathname.endsWith('/workspace_members')) return reply(viewer || editor ? [{ workspace_id: SPACE, role: editor ? 'editor' : 'viewer' }] : []);
    if (url.pathname.endsWith('/workspaces')) return reply((viewer || editor) && url.searchParams.has('id') ? [{ id: SPACE, name: 'Compartilhado', owner_id: 'outro' }] : []);
    if (url.pathname.endsWith('/categories')) return reply([{ id: CATEGORY, name: 'Freelance', type: 'income', icon: 'FRL' }]);
    if (url.pathname.endsWith('/transactions')) {
      if (request.method() === 'GET') {
        if (state.readFailure) return reply({ message: 'denied' }, 403);
        const scope = url.searchParams.get('workspace_id');
        return reply(state.rows.filter((row) => scope === 'is.null'
          ? !row.workspace_id && (row.user_id || USER) === USER
          : `eq.${row.workspace_id}` === scope));
      }
      state.writes.push({ method: request.method(), query: url.searchParams, body: request.postDataJSON() });
      if (state.writeFailure) return reply({ code: '42501', message: 'denied' }, 403);
      if (request.method() === 'POST') {
        const row = { id: crypto.randomUUID(), ...request.postDataJSON() };
        state.rows.push(row);
        return reply({ id: row.id });
      }
      const ids = url.searchParams.get('id')?.slice(4, -1).split(',') || [];
      const changed = state.rows.filter((row) => ids.includes(row.id));
      if (request.method() === 'PATCH') changed.forEach((row) => Object.assign(row, request.postDataJSON()));
      if (request.method() === 'DELETE') state.rows = state.rows.filter((row) => !ids.includes(row.id));
      return reply(changed.map(({ id }) => ({ id })));
    }
    return reply({ message: 'Unexpected endpoint' }, 500);
  });
  return state;
}

async function login(page) {
  await page.goto('/');
  await page.getByLabel('E-mail', { exact: true }).fill('teste@example.com');
  await page.getByLabel('Senha', { exact: true }).fill('test-password');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByText('SALDO ATUAL', { exact: true })).toBeVisible();
}

async function fillTransaction(page, description = 'Pagamento teste') {
  await page.getByRole('button', { name: '+ Nova receita', exact: true }).click();
  await page.getByLabel('Descricao', { exact: true }).fill(description);
  await page.getByLabel('Valor', { exact: true }).fill('123.45');
  await page.getByRole('dialog').getByRole('button', { name: 'Receita', exact: true }).click();
  await page.getByLabel('Categoria', { exact: true }).selectOption(CATEGORY);
  await page.getByLabel('Data', { exact: true }).fill(localToday());
}

test('login, criação, recarga, categorização, exportação e exclusão persistem pela API', async ({ page }, testInfo) => {
  const state = await backend(page);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await login(page);
  await fillTransaction(page);
  await page.getByRole('button', { name: 'Salvar transacao' }).click();
  await expect(page.getByText('Pagamento teste', { exact: true })).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `/tmp/deubom-${testInfo.project.name}.png`, fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(state.writes[0].body).toMatchObject({ user_id: USER, workspace_id: null, amount: 123.45, title: 'Pagamento teste', category_id: CATEGORY });
  await page.reload();
  await expect(page.getByText('Pagamento teste', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Ver todas >' }).click();
  await page.getByLabel('Selecionar Pagamento teste', { exact: true }).check();
  await page.getByRole('button', { name: 'Categorizar', exact: true }).click();
  await page.getByLabel('Categoria', { exact: true }).selectOption('');
  await page.getByRole('button', { name: 'Aplicar categoria' }).click();
  await expect(page.getByTestId(/transaction-/).getByText('Sem categoria', { exact: true })).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar', exact: true }).click();
  expect((await downloadPromise).suggestedFilename()).toBe('deu-bom-transacoes.csv');
  await page.getByLabel('Selecionar Pagamento teste', { exact: true }).check();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Deletar', exact: true }).click();
  await expect(page.getByText('Pagamento teste', { exact: true })).toHaveCount(0);
  expect(state.rows).toHaveLength(0);
  for (const write of state.writes.filter((row) => row.method !== 'POST')) {
    expect(write.query.get('user_id')).toBe(`eq.${USER}`);
    expect(write.query.get('workspace_id')).toBe('is.null');
  }
  await page.getByRole('button', { name: 'Analise - Insights e graficos' }).click();
  await expect(page.getByRole('heading', { name: 'Analise', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Sair', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Entrar', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('não consulta dados financeiros sem autenticação e mostra falha de login', async ({ page }) => {
  const state = await backend(page, { authFailure: true });
  await page.goto('/');
  await page.getByLabel('E-mail', { exact: true }).fill('teste@example.com');
  await page.getByLabel('Senha', { exact: true }).fill('wrong-password');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Não foi possível entrar');
  expect(state.requests.some((row) => row.path.includes('/rest/v1/'))).toBe(false);
});

test('cadastro exige confirmação sem simular sessão autenticada', async ({ page }) => {
  await backend(page, { signup: true });
  await page.goto('/');
  await page.getByRole('button', { name: 'Criar uma conta' }).click();
  await page.getByLabel('E-mail', { exact: true }).fill('teste@example.com');
  await page.getByLabel('Senha', { exact: true }).fill('test-password');
  await page.getByRole('button', { name: 'Cadastrar', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Confira seu e-mail');
  await expect(page.getByText('SALDO ATUAL')).toHaveCount(0);
});

test('falha de leitura não apresenta saldo zero e permite tentar novamente', async ({ page }) => {
  const state = await backend(page);
  state.readFailure = true;
  await page.goto('/');
  await page.getByLabel('E-mail', { exact: true }).fill('teste@example.com');
  await page.getByLabel('Senha', { exact: true }).fill('test-password');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Não foi possível carregar');
  await expect(page.getByText('SALDO ATUAL')).toHaveCount(0);
  state.readFailure = false;
  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await expect(page.getByText('SALDO ATUAL')).toBeVisible();
});

test('falha de gravação preserva formulário e não cria transação local', async ({ page }) => {
  const state = await backend(page);
  await login(page);
  await fillTransaction(page);
  state.writeFailure = true;
  await page.getByRole('button', { name: 'Salvar transacao' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByLabel('Descricao', { exact: true })).toHaveValue('Pagamento teste');
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('preservados');
  expect(state.rows).toHaveLength(0);
  state.writeFailure = false;
  await page.getByRole('button', { name: 'Salvar transacao' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(state.rows).toHaveLength(1);
});

test('visualizador consulta apenas o espaço selecionado e não pode gravar', async ({ page }) => {
  const state = await backend(page, { viewer: true });
  await login(page);
  await page.getByLabel('Espaço', { exact: true }).selectOption(SPACE);
  await expect(page.getByText('Você tem acesso de leitura a este espaço.')).toBeVisible();
  await expect(page.getByRole('button', { name: '+ Nova receita', exact: true })).toBeDisabled();
  await expect(page.getByText('Carregando finanças…')).toHaveCount(0);
  const reads = state.requests.filter((row) => row.path.endsWith('/transactions'));
  expect(reads.at(-1).query.get('workspace_id')).toBe(`eq.${SPACE}`);
  expect(reads.at(-1).query.has('user_id')).toBe(false);
  expect(state.writes).toHaveLength(0);
});

test('filtro de período usa data atual e não a transação mais recente', async ({ page }) => {
  const state = await backend(page);
  state.rows = [{ id: 'old', title: 'Registro antigo', date: '2020-01-01', type: 'expense', amount: 50, category_id: null }];
  await login(page);
  await page.getByRole('button', { name: 'Ver todas >' }).click();
  await expect(page.getByText('Registro antigo', { exact: true })).toHaveCount(0);
  const toggle = page.getByRole('button', { name: 'Abrir ou fechar filtros' });
  if (await toggle.isVisible()) await toggle.click();
  await page.getByRole('button', { name: 'Todo periodo', exact: true }).click();
  await expect(page.getByText('Registro antigo', { exact: true })).toBeVisible();
});


test('editor grava no espaço selecionado e a troca de espaço separa os dados', async ({ page }) => {
  const state = await backend(page, { editor: true });
  state.rows = [
    { id: 'personal', title: 'Pessoal somente', date: localToday(), type: 'income', amount: 10, category_id: null, workspace_id: null, user_id: USER },
    { id: 'shared', title: 'Compartilhado somente', date: localToday(), type: 'income', amount: 20, category_id: null, workspace_id: SPACE, user_id: 'outro' },
  ];
  await login(page);
  await expect(page.getByText('Pessoal somente', { exact: true })).toBeVisible();
  await expect(page.getByText('Compartilhado somente', { exact: true })).toHaveCount(0);
  await page.getByLabel('Espaço', { exact: true }).selectOption(SPACE);
  await expect(page.getByText('Compartilhado somente', { exact: true })).toBeVisible();
  await expect(page.getByText('Pessoal somente', { exact: true })).toHaveCount(0);
  await fillTransaction(page, 'Receita compartilhada');
  await page.getByRole('button', { name: 'Salvar transacao' }).click();
  await expect(page.getByText('Receita compartilhada', { exact: true })).toBeVisible();
  expect(state.writes.at(-1).body).toMatchObject({ workspace_id: SPACE, user_id: USER });
  await page.getByLabel('Espaço', { exact: true }).selectOption('');
  await expect(page.getByText('Pessoal somente', { exact: true })).toBeVisible();
  await expect(page.getByText('Receita compartilhada', { exact: true })).toHaveCount(0);
});

test('gravação confirmada com falha na atualização não induz reenvio do formulário', async ({ page }) => {
  const state = await backend(page);
  await login(page);
  await fillTransaction(page);
  state.readFailure = true;
  await page.getByRole('button', { name: 'Salvar transacao' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('alert')).toContainText('desatualizados');
  expect(state.writes).toHaveLength(1);
  state.readFailure = false;
  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await expect(page.getByText('Pagamento teste', { exact: true })).toBeVisible();
  expect(state.writes).toHaveLength(1);
});


async function chooseTheme(page, name) {
  await page.getByLabel('Alterar tema', { exact: true }).click();
  await page.getByRole('group', { name: 'Aparência' }).getByRole('button', { name, exact: true }).click();
  if (name !== 'Sistema') await expect(page.locator('html')).toHaveAttribute('data-theme', name === 'Escuro' ? 'dark' : 'light');
}

test('temas claro, escuro e sistema persistem e respeitam a preferência do dispositivo', async ({ page }) => {
  await backend(page);
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  await chooseTheme(page, 'Escuro');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await chooseTheme(page, 'Claro');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await chooseTheme(page, 'Sistema');
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('receita e despesa têm aparência neutra igual e só a seleção recebe destaque', async ({ page }) => {
  await backend(page);
  await login(page);
  const expense = page.getByRole('button', { name: '− Nova despesa', exact: true });
  const income = page.getByRole('button', { name: '+ Nova receita', exact: true });
  const style = (locator) => locator.evaluate((element) => ({ bg: getComputedStyle(element).backgroundColor, color: getComputedStyle(element).color }));
  expect(await style(expense)).toEqual(await style(income));
  await expense.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('button', { name: 'Despesa', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await dialog.getByRole('button', { name: 'Receita', exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'Receita', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(dialog.getByRole('button', { name: 'Despesa', exact: true })).toHaveAttribute('aria-pressed', 'false');
  expect(await style(dialog.getByRole('button', { name: 'Receita', exact: true }))).not.toEqual(await style(dialog.getByRole('button', { name: 'Despesa', exact: true })));
});

test('voz preenche um rascunho para revisão e aceita comando de tema', async ({ page }) => {
  await page.addInitScript(() => {
    window.SpeechRecognition = class {
      start() { window.dispatchVoice = (text) => { this.onresult({ results: [[{ transcript: text }]] }); this.onend(); }; }
      stop() { this.onend(); }
      abort() {}
    };
  });
  const state = await backend(page);
  await login(page);
  await page.getByRole('button', { name: 'Falar com o app' }).click();
  await page.evaluate(() => window.dispatchVoice('gastei 35,90 reais no mercado'));
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByLabel('Valor', { exact: true })).toHaveValue('35.9');
  await expect(page.getByRole('button', { name: 'Despesa', exact: true })).toHaveAttribute('aria-pressed', 'true');
  expect(state.writes).toHaveLength(0);
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await page.getByRole('button', { name: 'Falar com o app' }).click();
  await page.evaluate(() => window.dispatchVoice('tema escuro'));
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(state.writes).toHaveLength(0);
});

test('permissão de microfone negada apresenta alternativa manual', async ({ page }) => {
  await page.addInitScript(() => {
    window.SpeechRecognition = class {
      start() { this.onerror({ error: 'not-allowed' }); this.onend(); }
      abort() {}
    };
  });
  await backend(page);
  await login(page);
  await page.getByRole('button', { name: 'Falar com o app' }).click();
  await expect(page.getByRole('alert')).toContainText('microfone foi negado');
  await page.getByRole('button', { name: '+ Nova receita', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
});

test('aviso de atualização preserva formulário e exige confirmação para recarregar', async ({ page }) => {
  let update = false;
  await page.route('**/version.json*', (route) => update ? route.fulfill({ json: { version: 'new-release-test' } }) : route.continue());
  await backend(page);
  await login(page);
  await fillTransaction(page, 'Não perder este rascunho');
  update = true;
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.getByText('Uma nova versão está disponível')).toBeAttached();
  await expect(page.getByLabel('Descricao', { exact: true })).toHaveValue('Não perder este rascunho');
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  page.once('dialog', (dialog) => dialog.dismiss());
  await page.getByRole('button', { name: 'Atualizar app', exact: true }).click();
  await expect(page.getByText('Uma nova versão está disponível')).toBeVisible();
  await page.getByRole('button', { name: 'Depois', exact: true }).click();
  await expect(page.getByText('Uma nova versão está disponível')).toHaveCount(0);
});

test('layout cabe na tela, mantém alvos de toque e formulário utilizável nos dois temas', async ({ page }, testInfo) => {
  await backend(page);
  await login(page);
  for (const theme of ['Claro', 'Escuro']) {
    await chooseTheme(page, theme);
    await expect(page.getByRole('heading', { name: 'Visão geral', exact: true })).toBeVisible();
    const contrast = await page.locator('.balance-primary .amount').evaluate((element) => {
      const rgb = (color) => color.match(/[\d.]+/g).map(Number);
      const foreground = rgb(getComputedStyle(element).color);
      const background = rgb(getComputedStyle(element.closest('.balance-card')).backgroundColor);
      const base = rgb(getComputedStyle(document.documentElement).backgroundColor);
      const alpha = background[3] ?? 1;
      const composite = background.slice(0, 3).map((value, index) => alpha * value + (1 - alpha) * base[index]);
      const luminance = (color) => color.slice(0, 3).map((value) => value / 255).map((v) => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
      const a = luminance(foreground); const b = luminance(composite);
      return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
    });
    expect(contrast).toBeGreaterThanOrEqual(4.5);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    for (const name of ['− Nova despesa', '+ Nova receita', 'Falar com o app']) {
      const bounds = await page.getByRole('button', { name, exact: true }).boundingBox();
      expect(bounds.height).toBeGreaterThanOrEqual(44);
    }
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: `/tmp/deubom-${testInfo.project.name}-${theme}.png`, fullPage: true });
    await fillTransaction(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  }
});


test('movimentos e análises cabem na tela clara e escura', async ({ page }) => {
  const state = await backend(page);
  state.rows = [
    { id: 'expense-mobile', title: 'Despesa mobile', date: localToday(), type: 'expense', amount: 123.45, category_id: null, workspace_id: null },
    { id: 'income-mobile', title: 'Receita mobile', date: localToday(), type: 'income', amount: 500, category_id: CATEGORY, workspace_id: null },
  ];
  await login(page);
  for (const theme of ['Claro', 'Escuro']) {
    await chooseTheme(page, theme);
    for (const name of ['Transacoes - Gestao de movimentos', 'Analise - Insights e graficos']) {
      await page.getByRole('button', { name, exact: true }).click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  }
});
