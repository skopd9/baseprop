import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

// Initialize Supabase Admin client (server-side only, has elevated permissions)
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Service role key for admin operations
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

// Default sender email
const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev';

/**
 * Netlify serverless function to send magic link emails via Resend
 * This bypasses Supabase's email rate limits by using Supabase Admin API
 * to generate the link and Resend to send the email
 */
export const handler: Handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { email, redirectTo } = JSON.parse(event.body || '{}');

    // Validate input
    if (!email) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Email is required' })
      };
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid email format' })
      };
    }

    console.log('[Magic Link] Generating magic link for:', email);

    // Generate magic link using Supabase Admin API
    // This creates a secure token without triggering Supabase's email system
    const { data, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
      options: {
        redirectTo: redirectTo || process.env.VITE_APP_URL || 'http://localhost:5173'
      }
    });

    if (linkError || !data) {
      console.error('[Magic Link] Error generating link:', linkError);
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          error: 'Failed to generate magic link',
          details: linkError?.message 
        })
      };
    }

    const magicLink = data.properties?.action_link;
    
    if (!magicLink) {
      console.error('[Magic Link] No magic link in response');
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to generate magic link URL' })
      };
    }

    console.log('[Magic Link] Link generated successfully, sending email via Resend');

    // Create beautiful HTML email
    const htmlContent = createMagicLinkHtml(email, magicLink);

    // Send email via Resend (bypasses Supabase email system entirely)
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [email],
      subject: '🔐 Sign in to Base Prop - Magic Link',
      html: htmlContent
    });

    if (emailError) {
      console.error('[Magic Link] Resend error:', emailError);
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          error: 'Failed to send email',
          details: emailError.message 
        })
      };
    }

    console.log('[Magic Link] Email sent successfully via Resend:', emailData);

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true,
        message: 'Magic link sent successfully',
        emailId: emailData?.id
      })
    };

  } catch (error: any) {
    console.error('[Magic Link] Unexpected error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      })
    };
  }
};

/**
 * Create beautiful HTML email template for magic link
 */
function createMagicLinkHtml(email: string, magicLink: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f5f5f5;">
        <div style="background-color: white; margin: 20px; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          
          <!-- Green Header -->
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 40px 30px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px; font-weight: 600;">🔐 Sign In to Base Prop</h1>
          </div>
          
          <!-- Content -->
          <div style="padding: 40px 30px;">
            <p style="font-size: 16px; margin-bottom: 20px; color: #374151;">Hello,</p>
            
            <p style="font-size: 16px; margin-bottom: 30px; color: #374151;">
              Click the button below to securely sign in to your Base Prop account at <strong>${email}</strong>.
            </p>
            
            <!-- CTA Button -->
            <div style="text-align: center; margin: 40px 0;">
              <a href="${magicLink}" 
                 style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 16px 48px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.3);">
                Sign In to Base Prop
              </a>
            </div>
            
            <!-- Security Notice -->
            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 30px 0; border-radius: 4px;">
              <p style="margin: 0; font-size: 14px; color: #92400e;">
                <strong>⏰ Security Notice:</strong> This link will expire in 1 hour for your security.
              </p>
            </div>
            
            <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
              If the button doesn't work, copy and paste this link into your browser:
            </p>
            <p style="font-size: 12px; color: #3b82f6; word-break: break-all; background-color: #f3f4f6; padding: 12px; border-radius: 6px; font-family: monospace;">
              ${magicLink}
            </p>
            
            <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
              If you didn't request this email, you can safely ignore it.
            </p>
          </div>
          
          <!-- Footer -->
          <div style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0 0 10px 0; font-size: 14px; color: #6b7280;">
              <strong style="color: #10b981;">Base Prop</strong> - Simplifying Property Management
            </p>
            <p style="margin: 0; font-size: 12px; color: #9ca3af;">
              © ${new Date().getFullYear()} Base Prop. All rights reserved.
            </p>
          </div>
          
        </div>
        
        <!-- Legal Footer -->
        <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
          <p style="margin: 0;">This is an automated message. Please do not reply to this email.</p>
        </div>
      </body>
    </html>
  `;
}

