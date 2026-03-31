import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * GET /api/elementpay/config-check
 * Safe diagnostics: which ElementPay env vars are set (no secret values).
 * Use after setting Vercel env + redeploy.
 */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const apiUrl = process.env.ELEMENTPAY_API_URL || '';
  let apiUrlHost = '';
  try {
    apiUrlHost = apiUrl ? new URL(apiUrl).host : '(default sandbox)';
  } catch {
    apiUrlHost = '(invalid URL)';
  }

  return res.status(200).json({
    ok: true,
    ELEMENTPAY_API_KEY: Boolean(process.env.ELEMENTPAY_API_KEY),
    ELEMENTPAY_MBT_TOKEN_ADDRESS: Boolean(process.env.ELEMENTPAY_MBT_TOKEN_ADDRESS),
    ELEMENTPAY_WEBHOOK_SECRET: Boolean(process.env.ELEMENTPAY_WEBHOOK_SECRET),
    ELEMENTPAY_API_URL: apiUrl || null,
    apiUrlHost,
    ELEMENTPAY_QUOTE_TOKEN: process.env.ELEMENTPAY_QUOTE_TOKEN || 'USDC (default)',
    ELEMENTPAY_MBT_PRICE_USD: process.env.ELEMENTPAY_MBT_PRICE_USD || '25 (default)',
    note:
      'If any flag is false, set the var in Vercel and redeploy. Live key must use production ELEMENTPAY_API_URL.',
  });
}
