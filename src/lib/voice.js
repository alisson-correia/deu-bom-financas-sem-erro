// Deliberately conservative: review the draft before committing anything.
export function parseVoice(text) {
  const normalized = text.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (/\b(tema|modo|aparencia)\b/.test(normalized)) {
    if (/\b(escuro|escura)\b/.test(normalized)) return { theme: 'dark' };
    if (/\b(claro|clara)\b/.test(normalized)) return { theme: 'light' };
    if (/\b(sistema|automatico|automatica)\b/.test(normalized)) return { theme: 'system' };
  }
  const amount = normalized.match(/\b(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[,.]\d{1,2})?)\s*(?:reais|real|r\$)?\b/);
  return {
    description: text.trim(),
    type: /\b(receita|recebi|recebido|salario|ganhei)\b/.test(normalized) ? 'income' : 'expense',
    amount: amount ? String(Number(amount[1].includes(',') || /\.\d{3}(?:\.|$)/.test(amount[1]) ? amount[1].replaceAll('.', '').replace(',', '.') : amount[1])) : '',
  };
}
