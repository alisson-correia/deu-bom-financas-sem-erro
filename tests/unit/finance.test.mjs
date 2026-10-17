import { test } from 'node:test';
import assert from 'node:assert/strict';
import { csvContent, filterTransactions, addTransaction } from '../../src/lib/finance.js';

test('CSV preserva vírgulas, aspas, quebras de linha e neutraliza fórmulas', () => {
  const csv = csvContent([{ date: '2026-10-17', description: '=SUM(1,2)\n"teste"', type: 'income', category: 'A,B', amount: 0.3 }]);
  assert.ok(csv.startsWith('\uFEFF'));
  assert.ok(csv.includes('"\'=SUM(1,2)\n""teste"""'));
  assert.ok(csv.includes('"A,B"'));
  assert.ok(csv.includes('"0.30"'));
});

test('períodos respeitam o calendário atual, a virada do mês e buscas', () => {
  const rows = [
    { description: 'Salário', category: 'Renda', date: '2026-09-30' },
    { description: 'Mercado', category: 'Comida', date: '2026-10-01' },
    { description: 'Futuro', category: 'Renda', date: '2026-10-20' },
    { description: 'Antigo', category: 'Renda', date: '2026-08-31' },
  ];
  assert.deepEqual(filterTransactions(rows, { period: 'Ultimos 30d' }, '2026-10-01').map((r) => r.description), ['Salário', 'Mercado']);
  assert.deepEqual(filterTransactions(rows, { period: 'Este mes', search: 'MERC', categories: ['Comida'] }, '2026-10-01').map((r) => r.description), ['Mercado']);
  assert.equal(filterTransactions(rows, { period: 'Esta semana' }, '2026-10-01').length, 2);
  assert.equal(filterTransactions(rows, { period: 'Todo periodo' }, '2026-10-01').length, 4);
});

test('valores inválidos são rejeitados antes de acessar a API', async () => {
  for (const amount of [Infinity, NaN, -1, 0, 0.001, Number.MAX_SAFE_INTEGER]) {
    await assert.rejects(addTransaction(null, 'user', '', { description: 'Teste', amount, type: 'income', date: '2026-10-17' }));
  }
});
