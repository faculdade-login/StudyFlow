import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.108.2';
import { config } from './config.js';

export const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey);
