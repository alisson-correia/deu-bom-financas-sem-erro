import process from 'node:process';
import { existsSync } from 'node:fs';

if (existsSync('.env.local')) process.loadEnvFile('.env.local');
const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) throw new Error('Configure VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY.');
const columns = {
  budgets: 'id,user_id,workspace_id',
  categories: 'id,user_id,workspace_id,name,icon,type',
  event_items: 'id,event_id,name,quantity,unit_price,category',
  event_participants: 'id,event_id,name,email,is_child,paid,amount_due',
  events: 'id,workspace_id,name,event_date',
  profiles: 'id,email,display_name',
  transactions: 'id,user_id,workspace_id,title,amount,type,date,category_id,status,recurrence_type,notify',
  workspace_invitations: 'id,workspace_id,email,role,expires_at',
  workspace_members: 'id,user_id,workspace_id,role,accepted_at',
  workspaces: 'id,name,owner_id',
};
let failed = false;
for (const [table, select] of Object.entries(columns)) {
  try {
    const target = new URL(`/rest/v1/${table}`, url);
    target.searchParams.set('select', select);
    target.searchParams.set('limit', '0');
    const result = await fetch(target, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(20_000),
    });
    if (!result.ok) { failed = true; console.error(`${table}: HTTP ${result.status}`); }
    else console.log(`${table}: HTTP ${result.status} — tabela/colunas disponíveis pela API`);
    await result.body.cancel();
  } catch (error) {
    failed = true;
    console.error(`${table}: falha de conexão (${error.name})`);
  }
}
console.log('Somente leitura com limit=0. Não valida RLS, funções, constraints ou operações autenticadas.');
process.exitCode = failed ? 1 : 0;
