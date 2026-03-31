import type { NextApiRequest, NextApiResponse } from 'next';

interface ElementPayPaymentRequest {
  phoneNumber: string;
  amountKES: number;      // Amount in Kenyan Shillings
  mbtAmount: string;      // MBT amount (human units) user should receive
  walletAddress: string;  // User's on-chain wallet address (ElementPay user_address)
}

interface ElementPayPaymentResponse {
  success: boolean;
  txHash?: string;
  orderStatus?: string;
  message?: string;
  error?: string;
}

/**
 * Initiate an ElementPay on-ramp order (M-Pesa → MBT)
 * Uses ElementPay's `/orders/create` as per docs:
 * https://devs.elementpay.net/ (Element Pay — Developer Docs)
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ElementPayPaymentResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      message: 'Method not allowed' 
    });
  }

  try {
    const { phoneNumber, amountKES, mbtAmount, walletAddress }: ElementPayPaymentRequest = req.body;

    // Validate required fields
    if (!phoneNumber || !amountKES || !mbtAmount || !walletAddress) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: phoneNumber, amountKES, mbtAmount, walletAddress' 
      });
    }

    // Validate amount
    if (amountKES <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Amount must be greater than 0' 
      });
    }

    // Normalize to Kenyan format 2547XXXXXXXX (no +) for all numbers we send.
    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    // Get ElementPay API credentials
    const elementPayApiKey = process.env.ELEMENTPAY_API_KEY;
    // Base URL should be the full API root, e.g.:
    // Sandbox: https://sandbox.elementpay.net/api/v1
    // Prod:    https://api.elementpay.net/api/v1
    const elementPayApiUrl = process.env.ELEMENTPAY_API_URL || 'https://sandbox.elementpay.net/api/v1';
    const mbtTokenAddress = process.env.ELEMENTPAY_MBT_TOKEN_ADDRESS;

    if (!elementPayApiKey) {
      console.error('ElementPay API key not configured');
      return res.status(500).json({
        success: false,
        message: 'Payment service not configured. Please contact support.'
      });
    }

    if (!mbtTokenAddress) {
      console.error('ELEMENTPAY_MBT_TOKEN_ADDRESS is not configured');
      return res.status(500).json({
        success: false,
        message: 'MBT token not configured for ElementPay on-ramp. Please contact support.'
      });
    }

    // Build payload for logging + request
    const payload = {
        user_address: walletAddress,
        token: mbtTokenAddress,
        order_type: 0, // on-ramp (fiat -> crypto)
        fiat_payload: {
          amount_fiat: amountKES,
          cashout_type: 'PHONE',
          phone_number: normalizedPhone,
          currency: 'KES',
          narrative: `MBT top-up for Project Mocha`,
          client_ref: `MOCHA-${Date.now()}`
        }
    };

    // Log exactly what we're sending to ElementPay (no secrets)
    console.log('ElementPay /orders/create payload:', {
      endpoint: `${elementPayApiUrl}/orders/create`,
      user_address: payload.user_address,
      token: payload.token,
      fiat_payload: payload.fiat_payload,
    });

    // Create ElementPay on-ramp order (M-Pesa → MBT) as per docs:
    // POST {ELEMENTPAY_API_URL}/orders/create
    const paymentResponse = await fetch(`${elementPayApiUrl}/orders/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': elementPayApiKey,
      },
      body: JSON.stringify(payload),
    });

    const data = await paymentResponse.json().catch(() => null);

    if (!paymentResponse.ok) {
      console.error('ElementPay order error:', data);
      return res.status(paymentResponse.status).json({
        success: false,
        message: data?.message || 'Failed to initiate M-PESA payment',
        error: data?.error || 'Payment initiation failed',
      });
    }

    // Expected success shape from docs:
    // {
    //   "status": "success",
    //   "message": "Order submitted",
    //   "data": {
    //     "tx_hash": "0xabc123...",
    //     "status": "submitted",
    //     ...
    //   }
    // }
    const txHash = data?.data?.tx_hash;
    const orderStatus = data?.data?.status;

    return res.status(200).json({
      success: true,
      txHash,
      orderStatus,
      message: data?.message || 'M-PESA order created. Please check your phone to complete the payment.',
    });

  } catch (error: any) {
    console.error('Error initiating ElementPay payment:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
}

/**
 * Normalize Kenyan phone number to international format
 */
function normalizePhoneNumber(phone: string): string {
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');

  // Already in 2547XXXXXXXX format
  if (cleaned.startsWith('254') && cleaned.length === 12) {
    return cleaned;
  }

  // Local 07XXXXXXXX -> 2547XXXXXXXX
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    return '254' + cleaned.substring(1);
  }

  // +2547XXXXXXXX -> 2547XXXXXXXX
  if (cleaned.startsWith('+254') && cleaned.length === 13) {
    return '254' + cleaned.substring(4);
  }

  // 7XXXXXXXX -> 2547XXXXXXXX
  if (cleaned.startsWith('7') && cleaned.length === 9) {
    return '254' + cleaned;
  }

  // Fallback: if it doesn't look Kenyan, still force 254 prefix and let PSP validate
  if (!cleaned.startsWith('254')) {
    return '254' + cleaned.replace(/^0+/, '');
  }

  return cleaned;
}
