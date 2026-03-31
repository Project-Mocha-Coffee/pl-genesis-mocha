import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';

interface ElementPayWebhookPayload {
  transactionId: string;
  status: 'success' | 'failed' | 'pending' | 'cancelled';
  phoneNumber: string;
  amount: number;
  currency: string;
  metadata?: {
    mbtAmount?: string;
    walletAddress?: string;
    source?: string;
  };
  timestamp: string;
}

/**
 * Webhook endpoint to receive payment status updates from ElementPay
 * This endpoint is called by ElementPay when payment status changes
 * 
 * Flow:
 * 1. ElementPay processes M-PESA payment
 * 2. On success, ElementPay credits MBTs from liquidity pool
 * 3. ElementPay calls this webhook with payment status
 * 4. We update our database and notify the user
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify webhook signature (if ElementPay provides one)
    const webhookSecret = process.env.ELEMENTPAY_WEBHOOK_SECRET;
    const signature = req.headers['x-elementpay-signature'] as string || 
                     req.headers['x-signature'] as string ||
                     req.headers['authorization'] as string;

    if (webhookSecret && signature) {
      // Verify signature (implement based on ElementPay's signature algorithm)
      // Common implementations use HMAC-SHA256
      const isValid = verifyWebhookSignature(JSON.stringify(req.body), signature, webhookSecret);
      if (!isValid) {
        console.error('Invalid webhook signature');
        return res.status(401).json({ error: 'Invalid signature' });
      }
    } else if (webhookSecret && !signature) {
      // In production, require signature if secret is configured
      console.warn('Webhook secret configured but no signature provided');
      // Uncomment in production:
      // return res.status(401).json({ error: 'Missing signature' });
    }

    const payload: ElementPayWebhookPayload = req.body;

    // Validate payload
    if (!payload.transactionId || !payload.status) {
      return res.status(400).json({ error: 'Invalid payload' });
    }

    console.log('ElementPay webhook received:', {
      transactionId: payload.transactionId,
      status: payload.status,
      phoneNumber: payload.phoneNumber,
      amount: payload.amount,
      metadata: payload.metadata,
    });

    // Handle different payment statuses
    switch (payload.status) {
      case 'success':
        // Payment successful - ElementPay has already credited MBTs
        // Update our database to track the transaction
        await handleSuccessfulPayment(payload);
        break;

      case 'failed':
      case 'cancelled':
        // Payment failed or was cancelled
        await handleFailedPayment(payload);
        break;

      case 'pending':
        // Payment is still pending (user hasn't completed STK Push)
        // No action needed, just log
        console.log('Payment pending:', payload.transactionId);
        break;

      default:
        console.warn('Unknown payment status:', payload.status);
    }

    // Always return 200 to acknowledge receipt
    return res.status(200).json({ received: true });

  } catch (error: any) {
    console.error('Error processing ElementPay webhook:', error);
    // Still return 200 to prevent ElementPay from retrying
    return res.status(200).json({ error: 'Webhook processed with errors' });
  }
}

/**
 * Handle successful payment
 * At this point, ElementPay has already:
 * 1. Credited MBTs from liquidity pool to user's wallet
 * 2. Settled USDT to Project Mocha Treasury
 */
async function handleSuccessfulPayment(payload: ElementPayWebhookPayload) {
  try {
    const { transactionId, metadata, phoneNumber, amount } = payload;

    // TODO: Store transaction in database
    // This should include:
    // - transactionId
    // - phoneNumber
    // - walletAddress (from metadata)
    // - mbtAmount (from metadata)
    // - kesAmount (from amount)
    // - status: 'completed'
    // - timestamp
    // - source: 'elementpay-mpesa'

    console.log('Payment successful:', {
      transactionId,
      walletAddress: metadata?.walletAddress,
      mbtAmount: metadata?.mbtAmount,
      kesAmount: amount,
    });

    // TODO: Send notification to user (email, SMS, or in-app)
    // TODO: Update user's investment balance
    // TODO: Trigger any post-payment workflows

  } catch (error) {
    console.error('Error handling successful payment:', error);
    throw error;
  }
}

/**
 * Handle failed payment
 */
async function handleFailedPayment(payload: ElementPayWebhookPayload) {
  try {
    const { transactionId, phoneNumber } = payload;

    console.log('Payment failed:', {
      transactionId,
      phoneNumber,
      status: payload.status,
    });

    // TODO: Store failed transaction in database
    // TODO: Notify user of failure
    // TODO: Refund or handle as needed

  } catch (error) {
    console.error('Error handling failed payment:', error);
    throw error;
  }
}

/**
 * Verify webhook signature using HMAC-SHA256
 * Adjust this based on ElementPay's actual signature algorithm
 */
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    // Common webhook signature verification using HMAC-SHA256
    // ElementPay may use a different algorithm - adjust accordingly
    
    // If signature includes "Bearer " prefix, remove it
    const cleanSignature = signature.replace(/^Bearer\s+/i, '');
    
    // If ElementPay uses a different format, adjust here
    // For example, some services send: "sha256=hash" or just the hash
    const signatureHash = cleanSignature.includes('=') 
      ? cleanSignature.split('=')[1] 
      : cleanSignature;
    
    // Create expected signature using HMAC-SHA256
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    
    // Compare signatures (use timing-safe comparison for security)
    return crypto.timingSafeEqual(
      Buffer.from(signatureHash),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    return false;
  }
}
