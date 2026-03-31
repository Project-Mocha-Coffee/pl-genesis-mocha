import type { NextApiRequest, NextApiResponse } from 'next';

interface ElementPayStatusResponse {
  success: boolean;
  status?: string;
  data?: any;
  message?: string;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ElementPayStatusResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
    });
  }

  const { txHash } = req.query;

  if (!txHash || typeof txHash !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'Missing txHash query parameter',
    });
  }

  try {
    const elementPayApiKey = process.env.ELEMENTPAY_API_KEY;
    const elementPayApiUrl = process.env.ELEMENTPAY_API_URL || 'https://sandbox.elementpay.net/api/v1';

    if (!elementPayApiKey) {
      console.error('ElementPay API key not configured');
      return res.status(500).json({
        success: false,
        message: 'Payment service not configured. Please contact support.',
      });
    }

    const resp = await fetch(`${elementPayApiUrl}/orders/tx/${txHash}`, {
      method: 'GET',
      headers: {
        'X-API-Key': elementPayApiKey,
      },
    });

    const data = await resp.json().catch(() => null);

    if (!resp.ok) {
      console.error('ElementPay /orders/tx error:', data);
      return res.status(resp.status).json({
        success: false,
        message: data?.message || 'Failed to fetch order status',
        error: data?.error,
      });
    }

    return res.status(200).json({
      success: true,
      status: data?.data?.status || data?.status,
      data: data?.data ?? data,
    });
  } catch (error: any) {
    console.error('Error fetching ElementPay order status:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
}

