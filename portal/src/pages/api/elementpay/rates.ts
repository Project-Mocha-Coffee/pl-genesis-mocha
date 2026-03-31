import type { NextApiRequest, NextApiResponse } from 'next';

interface ElementPayRatesResponse {
  success: boolean;
  mbtRateKes?: number; // KES per 1 MBT
  quoteRateKesPerToken?: number; // KES per quote token (e.g. USDC)
  quoteToken?: string;
  isFallbackRate?: boolean;
  message?: string;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ElementPayRatesResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
    });
  }

  try {
    const elementPayApiKey = process.env.ELEMENTPAY_API_KEY;
    const elementPayApiUrl =
      process.env.ELEMENTPAY_API_URL || 'https://sandbox.elementpay.net/api/v1';
    const fallbackMbtRateKes = Number(process.env.ELEMENTPAY_FALLBACK_MBT_RATE_KES || '149.8');

    if (!elementPayApiKey) {
      // Allow front-end testing of the M-PESA modal even when backend credentials are absent.
      return res.status(200).json({
        success: true,
        mbtRateKes:
          Number.isFinite(fallbackMbtRateKes) && fallbackMbtRateKes > 0
            ? fallbackMbtRateKes
            : 149.8,
        quoteToken: 'FALLBACK',
        isFallbackRate: true,
        message:
          'Using fallback MBT/KES rate for testing because ElementPay API key is not configured.',
      });
    }

    // Quote token to use for FX (ElementPay supports USDC/USDT/WXM etc).
    // We treat 1 quote token ≈ 1 USD and then derive MBT KES using MBT price in USD.
    const quoteToken = process.env.ELEMENTPAY_QUOTE_TOKEN || 'USDC';
    const mbtUsdStr = process.env.ELEMENTPAY_MBT_PRICE_USD || '25';
    const mbtUsd = Number(mbtUsdStr);

    if (!Number.isFinite(mbtUsd) || mbtUsd <= 0) {
      console.warn(
        'ELEMENTPAY_MBT_PRICE_USD not set or invalid; defaulting to 25 USD per MBT.'
      );
    }

    // Use ElementPay's /quote endpoint as per docs to get rate for the quote token.
    // GET /quote?amount_fiat=100&token=USDC&order_type=OnRamp
    const quoteUrl = new URL(`${elementPayApiUrl}/quote`);
    quoteUrl.searchParams.set('amount_fiat', '100'); // arbitrary positive KES amount
    quoteUrl.searchParams.set('token', quoteToken);
    quoteUrl.searchParams.set('order_type', 'OnRamp');

    const resp = await fetch(quoteUrl.toString(), {
      method: 'GET',
      headers: {
        'X-API-Key': elementPayApiKey,
      },
    });

    const data = await resp.json().catch(() => null);

    if (!resp.ok) {
      console.error('ElementPay /quote error:', data);
      return res.status(resp.status).json({
        success: false,
        message: data?.message || 'Failed to fetch ElementPay quote',
        error: data?.error,
      });
    }

    const rateKesPerToken = Number(data?.data?.rate);
    const fiatPaid = Number(data?.data?.fiat_paid);

    if (!Number.isFinite(rateKesPerToken) || rateKesPerToken <= 0) {
      return res.status(200).json({
        success: false,
        message: 'Invalid rate field in ElementPay /quote response',
      });
    }

    // According to docs, rate is KES per token after markup.
    // We treat 1 token ≈ 1 USD, so 1 MBT (mbtUsd USD) costs:
    const usdPerMbt = Number.isFinite(mbtUsd) && mbtUsd > 0 ? mbtUsd : 25;
    const mbtRateKes = rateKesPerToken * usdPerMbt;

    return res.status(200).json({
      success: true,
      mbtRateKes,
      quoteRateKesPerToken: rateKesPerToken,
      quoteToken,
      message: `Derived MBT KES rate from ElementPay /quote using ${quoteToken} and MBT price ${usdPerMbt} USD.`,
    });
  } catch (error: any) {
    console.error('Error fetching ElementPay rates:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
}

