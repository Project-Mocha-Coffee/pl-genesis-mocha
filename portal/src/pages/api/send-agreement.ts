import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, address, timestamp, agreementVersion, agreementText } = req.body;

  // Validate inputs
  if (!email || !address) {
    console.error('❌ Missing required fields:', { email: !!email, address: !!address });
    return res.status(400).json({ error: 'Missing required fields: email and address are required' });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    console.error('❌ Invalid email format:', email);
    return res.status(400).json({ error: 'Invalid email format' });
  }

  // Check for Resend API key
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    console.error('❌ RESEND_API_KEY is not set in environment variables');
    return res.status(500).json({ 
      error: 'Email service not configured',
      details: 'RESEND_API_KEY environment variable is missing. Please configure it in Vercel settings.'
    });
  }

  try {
    console.log('📧 Attempting to send agreement email:', {
      to: email,
      address: address.substring(0, 10) + '...',
      hasApiKey: !!resendApiKey,
      apiKeyPrefix: resendApiKey.substring(0, 8) + '...'
    });

    // === Resend Email Service ===
    const { Resend } = require('resend');
    const resend = new Resend(resendApiKey);
    
    // Use verified domain for from address (projectmocha.com is verified in Resend)
    const fromAddress = process.env.RESEND_FROM || 'Mocha Coffee <noreply@projectmocha.com>';
    
    // Check if using test domain (should not happen in production)
    const isTestDomain = fromAddress.includes('@resend.dev');
    
    if (isTestDomain) {
      console.warn('⚠️ WARNING: Using Resend test domain. Set RESEND_FROM in Vercel to use verified domain.');
    } else {
      console.log('✅ Using verified domain for email sending:', fromAddress);
    }
    
    // Send copy to Project Mocha team email (configurable, falls back to info@)
    const teamEmail = process.env.AGREEMENTS_TEAM_EMAIL || 'info@projectmocha.com';

    // Optional attachment: full agreement text (sent from frontend)
    const agreementAttachment =
      typeof agreementText === 'string' && agreementText.trim().length > 0
        ? [
            {
              filename: `Mocha_Investment_Agreement_${address.substring(0, 10)}.txt`,
              content: Buffer.from(agreementText, 'utf8').toString('base64'),
              contentType: 'text/plain',
            },
          ]
        : undefined;
    
    // Create email HTML content
    const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #522912; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">☕ Mocha Coffee</h1>
          </div>
          
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
            <h2 style="color: #522912; margin-top: 0;">Investment Agreement Confirmed</h2>
            
            <p style="color: #333; line-height: 1.6;">
              Thank you for signing the Mocha Coffee Investment Agreement. Your agreement has been recorded and a copy has been downloaded to your device.
            </p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #522912;">
              <p style="margin: 5px 0; color: #666;"><strong>Wallet Address:</strong> ${address}</p>
              <p style="margin: 5px 0; color: #666;"><strong>Date:</strong> ${new Date(timestamp).toLocaleString()}</p>
              <p style="margin: 5px 0; color: #666;"><strong>Agreement Version:</strong> ${agreementVersion || '1.0'}</p>
            </div>
            
            <p style="color: #333; line-height: 1.6;">
              You can now proceed with:
            </p>
            <ul style="color: #333; line-height: 1.8;">
              <li>Swapping crypto for MBT tokens</li>
              <li>Investing in Coffee Tree NFTs</li>
              <li>Tracking your investment returns</li>
            </ul>
            
            <p style="color: #333; line-height: 1.6; margin-top: 30px;">
              If you have any questions, please contact us at 
              <a href="mailto:legal@mochacoffee.com" style="color: #522912;">legal@mochacoffee.com</a>
            </p>
            
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;" />
            
            <p style="color: #999; font-size: 12px; text-align: center;">
              Mocha Coffee - Asset-Backed Coffee Investments<br/>
              This email confirms your legally binding investment agreement.
            </p>
          </div>
        </div>
      `;

    // Team email HTML (includes note that this is a copy)
    const teamEmailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #522912; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">☕ Mocha Coffee - Team Copy</h1>
          </div>
          
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
            <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin-bottom: 20px;">
              <p style="margin: 0; color: #856404; font-weight: bold;">📋 Team Copy - Investment Agreement Signed</p>
            </div>
            
            <h2 style="color: #522912; margin-top: 0;">Investment Agreement Confirmed</h2>
            
            <p style="color: #333; line-height: 1.6;">
              A user has signed the Mocha Coffee Investment Agreement. This is a copy for your records.
            </p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #522912;">
              <p style="margin: 5px 0; color: #666;"><strong>User Email:</strong> ${email}</p>
              <p style="margin: 5px 0; color: #666;"><strong>Wallet Address:</strong> ${address}</p>
              <p style="margin: 5px 0; color: #666;"><strong>Date:</strong> ${new Date(timestamp).toLocaleString()}</p>
              <p style="margin: 5px 0; color: #666;"><strong>Agreement Version:</strong> ${agreementVersion || '1.0'}</p>
            </div>
            
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;" />
            
            <p style="color: #999; font-size: 12px; text-align: center;">
              Mocha Coffee - Asset-Backed Coffee Investments<br/>
              This is an automated copy of the signed investment agreement.
            </p>
          </div>
        </div>
      `;

    // Send email to user
    console.log('📧 Sending user email with from address:', fromAddress);
    const emailResult = await resend.emails.send({
      from: fromAddress,
      to: email,
      subject: 'Mocha Investment Agreement - Confirmation',
      html: emailHtml,
      // Add reply-to for better deliverability
      reply_to: 'info@projectmocha.com',
      attachments: agreementAttachment,
    });

    // Send separate email to team (more reliable than BCC)
    let teamEmailResult = null;
    let teamEmailError = null;
    try {
      console.log('📧 Attempting to send team email:', {
        to: teamEmail,
        from: fromAddress,
      });
      
      teamEmailResult = await resend.emails.send({
        from: fromAddress,
        to: teamEmail,
        subject: `[Team Copy] Investment Agreement Signed - ${address.substring(0, 10)}...`,
        html: teamEmailHtml,
        // Add reply-to for better deliverability
        reply_to: email, // Reply to the user who signed
        attachments: agreementAttachment,
      });
      
      // Check for Resend API errors (Resend returns errors in result.error, not thrown)
      if (teamEmailResult.error) {
        teamEmailError = teamEmailResult.error;
        console.error('❌ Team email Resend API error:', {
          message: teamEmailResult.error.message,
          name: teamEmailResult.error.name,
          statusCode: teamEmailResult.error.statusCode,
          fullError: JSON.stringify(teamEmailResult.error, null, 2)
        });
      } else if (teamEmailResult.data?.id) {
        console.log('✅ Team email sent successfully:', {
          to: teamEmail,
          emailId: teamEmailResult.data.id,
        });
      } else {
        console.error('❌ Team email: Unexpected response format:', teamEmailResult);
        teamEmailError = { message: 'Unexpected response format' };
      }
    } catch (teamErr: any) {
      teamEmailError = teamErr;
      console.error('❌ Team email exception:', {
        error: teamErr.message,
        stack: teamErr.stack,
        teamEmail,
      });
      // Don't fail the whole request if team email fails, but log it
    }

    // Log full response for debugging
    console.log('📧 Resend API response:', {
      hasError: !!emailResult.error,
      hasData: !!emailResult.data,
      error: emailResult.error,
      data: emailResult.data
    });

    // Check for Resend API errors (Resend returns errors in result.error, not thrown)
    if (emailResult.error) {
      console.error('❌ Resend API error:', {
        message: emailResult.error.message,
        name: emailResult.error.name,
        statusCode: emailResult.error.statusCode,
        fullError: JSON.stringify(emailResult.error, null, 2)
      });
      
      // Provide helpful error messages based on error type
      let errorMessage = 'Failed to send email';
      if (emailResult.error.message) {
        errorMessage = emailResult.error.message;
      } else if (emailResult.error.name === 'validation_error') {
        errorMessage = 'Invalid email configuration. Please check RESEND_FROM address.';
      } else if (emailResult.error.statusCode === 401) {
        errorMessage = 'Invalid API key. Please verify RESEND_API_KEY in Vercel settings.';
      } else if (emailResult.error.statusCode === 403) {
        errorMessage = 'API key does not have permission to send emails.';
      }
      
      return res.status(500).json({ 
        error: 'Failed to send email',
        details: errorMessage,
        resendError: {
          message: emailResult.error.message,
          name: emailResult.error.name,
          statusCode: emailResult.error.statusCode
        }
      });
    }

    // Check if data exists (successful send)
    if (!emailResult.data || !emailResult.data.id) {
      console.error('❌ Unexpected Resend response format:', emailResult);
      return res.status(500).json({ 
        error: 'Unexpected response from email service',
        details: 'Email service returned an unexpected response format'
      });
    }

      // Success
      const teamEmailSuccess = !teamEmailError && !!teamEmailResult?.data?.id;
      
      console.log('✅ User email sent successfully:', {
      to: email,
      emailId: emailResult.data.id,
      from: fromAddress,
      teamEmailSent: teamEmailSuccess,
      teamEmailId: teamEmailResult?.data?.id,
      teamEmailError: teamEmailError ? {
        message: teamEmailError.message || 'Unknown error',
        name: teamEmailError.name,
        statusCode: teamEmailError.statusCode
      } : null
    });

    // Build response object - don't include warnings or errors to avoid frontend confusion
    const responseData: any = {
      success: true, 
      message: 'Agreement recorded and email sent successfully',
      emailId: emailResult.data.id,
      from: fromAddress,
      teamEmailSent: teamEmailSuccess,
      teamEmailId: teamEmailResult?.data?.id || null,
    };
    
    // Only include teamEmailError if it's a real error (not test domain restriction)
    // Suppress test domain errors since they're expected and don't affect production
    if (teamEmailError && !isTestDomain) {
      responseData.teamEmailError = {
        message: teamEmailError.message || 'Unknown error',
        details: 'Team email failed but user email was sent successfully'
      };
    }

    return res.status(200).json(responseData);

  } catch (error: any) {
    console.error('❌ Email sending exception:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return res.status(500).json({ 
      error: 'Failed to send email',
      details: error.message || 'Unknown error occurred',
      type: error.name || 'Exception'
    });
  }
}

