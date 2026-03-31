import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    // Test 1: Check environment variables
    const envCheck = {
      hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      urlValue: process.env.NEXT_PUBLIC_SUPABASE_URL || 'MISSING',
    };

    // Test 2: Try to query the table
    const { data, error, count } = await supabase
      .from('payment_notifications')
      .select('*', { count: 'exact', head: true });

    return res.status(200).json({
      message: 'Supabase connection test',
      envCheck,
      tableCheck: {
        canConnect: !error,
        error: error ? { message: error.message, code: error.code, details: error.details } : null,
        recordCount: count,
      },
    });
  } catch (err: any) {
    return res.status(500).json({
      message: 'Test failed',
      error: err.message,
      stack: err.stack,
    });
  }
}

