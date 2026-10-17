export function scopeQuery(query, userId, workspaceId) {
  // Never OR personal ownership with workspace membership: keep scopes separate.
  return workspaceId
    ? query.eq('workspace_id', workspaceId)
    : query.eq('user_id', userId).is('workspace_id', null);
}

async function allRows(makeQuery) {
  const result = [];
  const size = 500;
  for (let start = 0; ; start += size) {
    const { data, error } = await makeQuery().range(start, start + size - 1)
      .abortSignal(AbortSignal.timeout(15_000)).retry(false);
    if (error) throw error;
    result.push(...data);
    if (data.length < size) return result;
  }
}

export async function loadWorkspaces(client, userId) {
  const memberships = await allRows(() => client.from('workspace_members')
    .select('workspace_id,role').eq('user_id', userId)
    .not('accepted_at', 'is', null).order('id'));
  const owned = await allRows(() => client.from('workspaces')
    .select('id,name,owner_id').eq('owner_id', userId).order('id'));
  const ids = [...new Set(memberships.map((row) => row.workspace_id))];
  const shared = [];
  // Keep URLs bounded for accounts belonging to many workspaces.
  for (let i = 0; i < ids.length; i += 100) {
    shared.push(...await allRows(() => client.from('workspaces')
      .select('id,name,owner_id').in('id', ids.slice(i, i + 100)).order('id')));
  }
  return [...new Map([...owned, ...shared].map((row) => [row.id, {
    ...row,
    role: row.owner_id === userId ? 'owner'
      : memberships.find((member) => member.workspace_id === row.id)?.role,
  }])).values()];
}

export async function loadFinance(client, userId, workspaceId) {
  const [categories, rows] = await Promise.all([
    allRows(() => scopeQuery(client.from('categories')
      .select('id,name,icon,type'), userId, workspaceId).order('id')),
    allRows(() => scopeQuery(client.from('transactions')
      .select('id,title,amount,type,date,category_id'), userId, workspaceId)
      .order('date', { ascending: false }).order('id')),
  ]);
  const transactions = rows.map((row) => {
    const category = categories.find((item) => item.id === row.category_id);
    return {
      id: row.id,
      description: row.title,
      amount: (row.type === 'expense' ? -1 : 1) * Math.abs(Number(row.amount)),
      type: row.type,
      date: row.date,
      categoryId: row.category_id,
      category: category?.name || 'Sem categoria',
      categoryIcon: category?.icon || '•',
    };
  });
  return { categories, transactions };
}

function validateIds(ids) {
  if (!ids.length || ids.length > 100) {
    throw new Error('Selecione entre 1 e 100 transações por operação.');
  }
}

export async function addTransaction(client, userId, workspaceId, input) {
  const amount = Number(input.amount);
  const cents = Math.round(amount * 100);
  if (!input.description.trim() || !Number.isSafeInteger(cents) || cents <= 0
    || !['income', 'expense'].includes(input.type)
    || !/^\d{4}-\d{2}-\d{2}$/.test(input.date)
    || Number.isNaN(Date.parse(input.date))
    || localDate(new Date(`${input.date}T12:00:00`)) !== input.date) {
    throw new Error('Confira descrição, valor, tipo e data da transação.');
  }
  const { data, error } = await client.from('transactions').insert({
    user_id: userId,
    workspace_id: workspaceId || null,
    title: input.description.trim(),
    amount: cents / 100,
    type: input.type,
    status: 'pending',
    recurrence_type: 'none',
    notify: false,
    date: input.date,
    category_id: input.category || null,
  }).select('id').single();
  if (error) throw error;
  return data;
}

export async function changeTransactions(client, userId, workspaceId, ids, categoryId) {
  validateIds(ids);
  const table = client.from('transactions');
  const mutation = categoryId === undefined
    ? table.delete()
    : table.update({ category_id: categoryId || null });
  const { data, error } = await scopeQuery(mutation, userId, workspaceId)
    .in('id', ids).select('id');
  if (error) throw error;
  if (data.length !== ids.length) {
    throw new Error('Algumas transações não foram alteradas. Confira suas permissões e atualize os dados.');
  }
}

export function csvContent(items) {
  const cell = (value) => {
    if (typeof value === 'number') return `"${value.toFixed(2)}"`;
    const text = String(value);
    // Spreadsheet apps may evaluate text cells as formulas.
    const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
    return `"${safe.replaceAll('"', '""')}"`;
  };
  const rows = [['data', 'descricao', 'tipo', 'categoria', 'valor'],
    ...items.map((item) => [item.date, item.description, item.type, item.category, item.amount])];
  return '\uFEFF' + rows.map((row) => row.map(cell).join(',')).join('\r\n');
}

export function downloadCsv(items, filename = 'deu-bom-transacoes.csv') {
  const url = URL.createObjectURL(new Blob([csvContent(items)], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function filterTransactions(transactions, filter, today = localDate()) {
  const now = new Date(`${today}T12:00:00`);
  const start30 = new Date(now);
  start30.setDate(start30.getDate() - 29);
  const startWeek = new Date(now);
  startWeek.setDate(startWeek.getDate() - ((startWeek.getDay() + 6) % 7));
  return transactions.filter((item) => {
    if (filter.categories?.length && !filter.categories.includes(item.category)) return false;
    if (filter.search && !item.description.toLocaleLowerCase('pt-BR').includes(filter.search.toLocaleLowerCase('pt-BR'))) return false;
    if (filter.period === 'Ultimos 30d') return item.date >= localDate(start30) && item.date <= today;
    if (filter.period === 'Esta semana') return item.date >= localDate(startWeek) && item.date <= today;
    if (filter.period === 'Este mes') return item.date.slice(0, 7) === today.slice(0, 7);
    if (filter.period === 'Este ano') return item.date.slice(0, 4) === today.slice(0, 4);
    return true;
  });
}
