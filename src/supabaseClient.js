import { createClient } from '@supabase/supabase-js';

// Publishable key: it is safe for browser use because every data request is
// protected by Row Level Security in Supabase. Never add a secret/service key here.
const supabaseUrl = 'https://sqgbegzlzegrmmaewtrk.supabase.co';
const supabasePublishableKey = 'sb_publishable_YYxDUKtRIlUhKbmVP4dRcQ_FZMSo2v-';

export const supabase = createClient(supabaseUrl, supabasePublishableKey);
