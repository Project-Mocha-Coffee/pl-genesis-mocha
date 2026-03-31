import type { NextApiRequest, NextApiResponse } from 'next';

// Test endpoint to verify Resend is working
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  // Check for Resend API key
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    return res.status(500).json({ 
      error: 'RESEND_API_KEY is not set',
      details: 'Please configure RESEND_API_KEY in Vercel environment variables'
    });
  }

  try {
    console.log('🧪 Testing Resend API:', {
      hasApiKey: !!resendApiKey,
      apiKeyPrefix: resendApiKey.substring(0, 8) + '...',
      to: email
    });

    const { Resend } = require('resend');
    const resend = new Resend(resendApiKey);
    
    const fromAddress = process.env.RESEND_FROM || 'Mocha Coffee <onboarding@resend.dev>';
    
    const emailResult = await resend.emails.send({
      from: fromAddress,
      to: email,
      subject: 'Test Email from Mocha Portal',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #522912;">🧪 Test Email</h1>
          <p>This is a test email from the Mocha Investor Portal.</p>
          <p>If you received this, Resend is working correctly!</p>
          <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        </div>
      `,
    });

    console.log('📧 Resend test response:', {
      hasError: !!emailResult.error,
      hasData: !!emailResult.data,
      error: emailResult.error,
      data: emailResult.data
    });

    if (emailResult.error) {
      return res.status(500).json({ 
        error: 'Resend API error',
        details: emailResult.error.message || JSON.stringify(emailResult.error),
        resendError: emailResult.error
      });
    }

    if (!emailResult.data || !emailResult.data.id) {
      return res.status(500).json({ 
        error: 'Unexpected response format',
        response: emailResult
      });
    }

    return res.status(200).json({ 
      success: true,
      message: 'Test email sent successfully',
      emailId: emailResult.data.id,
      from: fromAddress,
      to: email
    });

  } catch (error: any) {
    console.error('❌ Test email exception:', error);
    return res.status(500).json({ 
      error: 'Failed to send test email',
      details: error.message,
      stack: error.stack
    });
  }
}

