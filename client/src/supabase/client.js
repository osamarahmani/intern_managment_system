import { createClient } from '@supabase/supabase-js';

// Resolve credentials from either React App style (process.env) or Vite style (import.meta.env)
const SUPABASE_URL = (typeof process !== 'undefined' && process.env?.REACT_APP_SUPABASE_URL) || import.meta.env?.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = (typeof process !== 'undefined' && process.env?.REACT_APP_SUPABASE_ANON_KEY) || import.meta.env?.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
