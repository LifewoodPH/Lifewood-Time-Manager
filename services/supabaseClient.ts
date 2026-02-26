
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types';

const supabaseUrl = 'https://zbimmiyvlupzmklegvtp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpiaW1taXl2bHVwem1rbGVndnRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwNzE0MDksImV4cCI6MjA4NzY0NzQwOX0.RcwWg8vD1ZMjE48vYRH81JnnHb0n9QEXfp2-0WGX1Ys';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and Anon Key must be provided.');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
