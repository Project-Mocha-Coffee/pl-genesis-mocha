import type { NextApiRequest, NextApiResponse } from 'next';

interface ElementPayVerifyRequest {
  phoneNumber: string;
}

interface ElementPayVerifyResponse {
  exists: boolean;
  walletAddress?: string;
  message?: string;
}

/**
 * Verify if a user exists in ElementPay database
 * This endpoint checks if the phone number is registered with ElementPay
 * and returns the associated wallet address if found
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ElementPayVerifyResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ exists: false, message: 'Method not allowed' });
  }

  try {
    const { phoneNumber }: ElementPayVerifyRequest = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ 
        exists: false, 
        message: 'Phone number is required' 
      });
    }

    // Validate phone number format (Kenyan format: +254XXXXXXXXX or 0XXXXXXXXX)
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    if (!normalizedPhone) {
      return res.status(400).json({ 
        exists: false, 
        message: 'Invalid phone number format. Please use Kenyan format (+254XXXXXXXXX or 0XXXXXXXXX)' 
      });
    }

    // Get ElementPay API credentials from environment variables
    const elementPayApiKey = process.env.ELEMENTPAY_API_KEY;
    const elementPayApiUrl = process.env.ELEMENTPAY_API_URL || 'https://api.elementpay.io';

    if (!elementPayApiKey) {
      console.error('ElementPay API key not configured');
      return res.status(500).json({ 
        exists: false, 
        message: 'Payment service not configured. Please contact support.' 
      });
    }

    // Call ElementPay API to verify user
    const verifyResponse = await fetch(`${elementPayApiUrl}/api/v1/users/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${elementPayApiKey}`,
        'X-API-Key': elementPayApiKey,
      },
      body: JSON.stringify({
        phoneNumber: normalizedPhone,
      }),
    });

    if (!verifyResponse.ok) {
      const errorData = await verifyResponse.json().catch(() => ({ message: 'Unknown error' }));
      
      if (verifyResponse.status === 404) {
        // User not found in ElementPay database
        return res.status(200).json({ 
          exists: false, 
          message: 'Phone number not registered with ElementPay. Please register first.' 
        });
      }

      console.error('ElementPay verification error:', errorData);
      return res.status(verifyResponse.status).json({ 
        exists: false, 
        message: errorData.message || 'Failed to verify user with ElementPay' 
      });
    }

    const data = await verifyResponse.json();

    // ElementPay returns user data if exists
    if (data.exists && data.walletAddress) {
      return res.status(200).json({
        exists: true,
        walletAddress: data.walletAddress,
        message: 'User verified successfully',
      });
    }

    return res.status(200).json({
      exists: false,
      message: 'User not found in ElementPay database',
    });

  } catch (error: any) {
    console.error('Error verifying user with ElementPay:', error);
    return res.status(500).json({
      exists: false,
      message: error.message || 'Internal server error',
    });
  }
}

/**
 * Normalize Kenyan phone number to international format
 * Converts: 0712345678 -> +254712345678
 * Converts: +254712345678 -> +254712345678 (already normalized)
 */
function normalizePhoneNumber(phone: string): string | null {
  // Remove all whitespace and special characters except +
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');

  // If already in international format
  if (cleaned.startsWith('+254')) {
    if (cleaned.length === 13) {
      return cleaned;
    }
    return null;
  }

  // If starts with 0 (local format)
  if (cleaned.startsWith('0')) {
    if (cleaned.length === 10) {
      return '+254' + cleaned.substring(1);
    }
    return null;
  }

  // If starts with 254 (without +)
  if (cleaned.startsWith('254')) {
    if (cleaned.length === 12) {
      return '+' + cleaned;
    }
    return null;
  }

  return null;
}
