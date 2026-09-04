const { createClient } = require('@supabase/supabase-js');

const url = String(process.env.SUPABASE_URL || '').trim();
const key = String(process.env.SUPABASE_PUBLISHABLE_KEY || '').trim();

const enabled = Boolean(url && key);
const supabase = enabled ? createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
}) : null;

async function getSection(userId, section, fallback) {
  if (!supabase) return fallback;
  const { data, error } = await supabase.from('user_data')
    .select('data').eq('user_id', userId).eq('section', section).maybeSingle();
  if (error) throw error;
  return data?.data ?? fallback;
}

async function setSection(userId, section, value) {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.from('user_data')
    .upsert({ user_id: userId, section, data: value }, { onConflict: 'user_id,section' })
    .select('data').single();
  if (error) throw error;
  return data.data;
}

async function publicByUsername(username) {
  if (!supabase) return null;
  const { data, error } = await supabase.from('public_profiles')
    .select('user_id,data,updated_at').ilike('data->>username', username).maybeSingle();
  if (error) throw error;
  return data || null;
}

module.exports = { enabled, supabase, getSection, setSection, publicByUsername };
