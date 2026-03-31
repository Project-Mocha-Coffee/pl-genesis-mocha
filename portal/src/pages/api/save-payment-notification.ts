import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { email, paymentMethod, walletAddress } = req.body;

  if (!email || !paymentMethod) {
    return res.status(400).json({ message: 'Email and payment method are required' });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: 'Invalid email format' });
  }

  // Validate payment method
  if (paymentMethod !== 'card' && paymentMethod !== 'mpesa') {
    return res.status(400).json({ message: 'Payment method must be "card" or "mpesa"' });
  }

  try {
    console.log('API: Attempting to save notification:', { email, paymentMethod, walletAddress });
    
    // Check if email already exists for this payment method
    const { data: existing, error: checkError } = await supabase
      .from('payment_notifications')
      .select('*')
      .eq('email', email)
      .eq('payment_method', paymentMethod)
      .single();

    console.log('API: Check existing result:', { existing, checkError });

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 is "no rows returned" which is fine
      console.error('Error checking existing notification:', checkError);
      throw checkError;
    }

    if (existing) {
      // Email already registered for this payment method
      return res.status(200).json({ 
        message: 'Email already registered for notifications',
        alreadyExists: true 
      });
    }

    // Insert new notification request
    const { data, error } = await supabase
      .from('payment_notifications')
      .insert([
        {
          email: email,
          payment_method: paymentMethod,
          wallet_address: walletAddress || null,
          notified: false,
        }
      ])
      .select();

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    console.log(`Payment notification saved: ${email} for ${paymentMethod}`);
    return res.status(200).json({ 
      message: 'Email saved successfully!',
      data: data 
    });

  } catch (err: any) {
    console.error('API error saving payment notification:', err);
    console.error('Error details:', {
      message: err.message,
      code: err.code,
      details: err.details,
      hint: err.hint,
      stack: err.stack
    });
    
    return res.status(500).json({ 
      message: 'Failed to save email notification',
      error: err.message,
      details: err.details || 'No additional details',
      hint: err.hint || 'Check server logs for more information'
    });
  }
}

