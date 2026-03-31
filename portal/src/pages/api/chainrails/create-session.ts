import type { NextApiRequest, NextApiResponse } from 'next';
import { Chainrails, crapi } from '@chainrails/sdk';

/** Body from @chainrails/react usePaymentSession (POST) */
interface ChainrailsPostBody {
  destinationChain?: string;
  token?: string;
  amount?: string | number;
  recipient?: string;
}

const ALLOWED_DESTINATION_CHAINS = new Set([
  'BASE',
  'ARBITRUM',
  'ARBITRUM_TESTNET',
  'AVALANCHE',
  'AVALANCHE_TESTNET',
  'BASE_TESTNET',
  'BSC',
  'ETHEREUM',
  'ETHEREUM_TESTNET',
  'STARKNET',
]);

type DestinationChain = Parameters<typeof crapi.auth.getSessionToken>[0]['destinationChain'];

function normalizeDestinationChain(input: string | undefined, fallback: string): DestinationChain {
  if (!input || typeof input !== 'string') {
    return fallback as DestinationChain;
  }
  const raw = input.trim().toUpperCase();
  if (ALLOWED_DESTINATION_CHAINS.has(raw)) {
    return raw as DestinationChain;
  }
  const noMainnet = raw.replace(/_MAINNET$/i, '');
  if (ALLOWED_DESTINATION_CHAINS.has(noMainnet)) {
    return noMainnet as DestinationChain;
  }
  return fallback as DestinationChain;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.CHAINRAILS_API_KEY;
  const recipient = process.env.CHAINRAILS_RECIPIENT_ADDRESS;

  if (!apiKey || !recipient) {
    return res.status(503).json({
      error: 'Chainrails is not configured',
      detail: !apiKey ? 'Missing CHAINRAILS_API_KEY' : 'Missing CHAINRAILS_RECIPIENT_ADDRESS',
    });
  }

  try {
    Chainrails.config({ api_key: apiKey });

    let maybeAmount = '';
    let chainHint: string | undefined;

    if (req.method === 'GET') {
      const { amount, chain } = req.query;
      maybeAmount = typeof amount === 'string' ? amount : '';
      chainHint = typeof chain === 'string' ? chain : undefined;
    } else {
      const body = (req.body || {}) as ChainrailsPostBody;
      if (body.amount !== undefined && body.amount !== null && String(body.amount) !== '') {
        maybeAmount = String(body.amount);
      }
      chainHint = body.destinationChain;
    }

    const fallbackChain = process.env.CHAINRAILS_DESTINATION_CHAIN ?? 'BASE';
    const destinationChain = normalizeDestinationChain(chainHint, fallbackChain);

    const token = (process.env.CHAINRAILS_TOKEN ?? 'USDC') as 'USDC';

    const parsed = maybeAmount ? parseFloat(maybeAmount) : 0;
    const amountForSession = parsed > 0 ? maybeAmount : '1';

    const session = await crapi.auth.getSessionToken({
      amount: amountForSession,
      recipient,
      destinationChain,
      token,
    });

    const sessionToken = (session as { sessionToken?: string }).sessionToken;
    if (!sessionToken) {
      console.error('[Chainrails] No sessionToken in response', session);
      return res.status(500).json({ error: 'Invalid session response' });
    }

    /** @chainrails/react 0.4+ usePaymentSession reads `amount` from this JSON; iframe URL is built client-side as /pay/{cents}. */
    return res.status(200).json({
      ...session,
      amount: amountForSession,
      destination_chain: destinationChain,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[Chainrails] create-session error:', msg);
    return res.status(500).json({ error: 'Failed to create payment session', detail: msg });
  }
}
