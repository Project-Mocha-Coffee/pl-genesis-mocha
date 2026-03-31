import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import { supabase } from '@/lib/supabase';

type ChainrailsIntentEvent = {
  id: string;
  type: string;
  data: {
    intent_id: number;
    sender: string;
    recipient: string;
    amount: string;
    destination_chain: string;
    metadata?: Record<string, any>;
  };
};

function verifySignature(rawBody: string, timestamp: string, signature: string, secret: string) {
  // Reject if timestamp is older than 5 minutes
  const eventTime = parseInt(timestamp, 10) * 1000;
  if (Number.isNaN(eventTime) || Math.abs(Date.now() - eventTime) > 5 * 60 * 1000) {
    console.error('[Chainrails] webhook timestamp too old');
    return false;
  }

  const signedPayload = `${timestamp}.${rawBody}`;
  const expected = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secret = process.env.CHAINRAILS_WEBHOOK_SECRET;
  const rawBody = JSON.stringify(req.body);

  // Signature verification is best-effort:
  // - If secret and signature headers are present, verify and ignore on failure.
  // - If missing (e.g. initial webhook creation), accept but log a warning.
  const signature = req.headers['x-chainrails-signature'] as string | undefined;
  const timestamp = req.headers['x-chainrails-timestamp'] as string | undefined;

  if (secret && signature && timestamp) {
    try {
      const ok = verifySignature(rawBody, timestamp, signature, secret);
      if (!ok) {
        console.error('[Chainrails] Invalid webhook signature, ignoring payload');
        return res.status(200).json({ received: true, ignored: true });
      }
    } catch (err) {
      console.error('[Chainrails] Error verifying signature, ignoring payload', err);
      return res.status(200).json({ received: true, ignored: true });
    }
  } else {
    console.warn('[Chainrails] Missing secret or signature; accepting webhook without verification');
  }

  const event = req.body as ChainrailsIntentEvent;

  if (event.type === 'intent.completed') {
    try {
      await handleIntentCompleted(event);
    } catch (err) {
      console.error('[Chainrails] Error handling intent.completed', err);
      // Still acknowledge to avoid infinite retries; we can reconcile from logs/DB.
    }
  }

  return res.status(200).json({ received: true });
}

async function handleIntentCompleted(event: ChainrailsIntentEvent) {
  const { sender, amount, destination_chain, metadata } = event.data;

  // TODO: reconcile USD/USDC received → MBT at ICO price, then call minter / ICO fulfilment
  // for `sender` (or wallet in metadata), same path as on-chain swap success.

  console.log('[Chainrails] intent.completed', {
    sender,
    amount,
    destination_chain,
    metadata,
  });

  // Optional: record in Supabase for later MBT minting / reconciliation
  try {
    const { error } = await supabase.from('chainrails_payments').insert({
      sender_address: sender,
      amount_raw: amount,
      destination_chain,
      metadata,
      status: 'completed',
    });

    if (error) {
      console.error('[Chainrails] Supabase insert error', error.message);
    }
  } catch (err) {
    console.error('[Chainrails] Error inserting chainrails_payments', err);
  }
}

