import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Only publishable/anon keys belong in a browser bundle. RLS remains mandatory.
function isPublicKey(value) {
  if (value?.startsWith('sb_publishable_')) return true;
  try {
    const payload = value.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(payload)).role === 'anon';
  } catch {
    return false;
  }
}

function configuredClient() {
  if (!url || !isPublicKey(key)) return null;
  try {
    return createClient(url, key);
  } catch {
    return null;
  }
}

export const supabase = configuredClient();
