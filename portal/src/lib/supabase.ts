import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

console.log('Supabase config check:', {
  urlExists: !!supabaseUrl,
  urlValue: supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'missing',
  keyExists: !!supabaseAnonKey,
  keyPrefix: supabaseAnonKey ? supabaseAnonKey.substring(0, 20) + '...' : 'missing'
});

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase credentials not found. Email notifications will not be saved to database.');
  console.error('URL:', supabaseUrl || 'MISSING');
  console.error('Key:', supabaseAnonKey ? 'EXISTS' : 'MISSING');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Type definitions for our tables
export interface PaymentNotification {
  id?: number;
  email: string;
  payment_method: 'card' | 'mpesa';
  wallet_address?: string;
  created_at?: string;
  notified?: boolean;
}

