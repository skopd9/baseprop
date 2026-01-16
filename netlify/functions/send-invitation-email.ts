import { Handler } from '@netlify/functions';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev';

interface InvitationEmailRequest {
  invitedEmail: string;
  organizationName: string;
  inviterName: string;
  role: 'owner' | 'member';
  invitationToken: string;
  baseUrl: string;
}

// Email HTML template
function createInvitationEmailHtml(
  invitedEmail: string,
  organizationName: string,
  inviterName: string,
  role: 'owner' | 'member',
  acceptLink: string,
  expiresIn: string = '7 days'
): string {
  const roleDescription = role === 'owner' 
    ? 'full administrative access to manage properties, tenants, and team members'
    : 'access to view and manage properties and tenants';

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4;">
        <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="background-color: #6366f1; color: white; padding: 20px; border-radius: 8px 8px 0 0; margin: -30px -30px 20px -30px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">🎉 You've Been Invited!</h1>
          </div>
          
          <p style="font-size: 16px; margin-bottom: 20px;">Hello!</p>
          
          <p style="margin-bottom: 20px;"><strong>${inviterName}</strong> has invited you to join their organization on <strong>Base Prop</strong>.</p>
          
          <div style="background-color: #dbeafe; border: 2px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 8px;">
            <p style="margin: 0; color: #1e40af; font-weight: 600;">📍 Please log in to Base Prop to view and accept this invitation.</p>
          </div>
          
          <div style="background-color: #f0f9ff; border-left: 4px solid #6366f1; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <h2 style="margin-top: 0; color: #6366f1; font-size: 18px;">Organization Details</h2>
            <ul style="list-style: none; padding: 0; margin: 10px 0;">
              <li style="margin-bottom: 8px;"><strong>🏢 Organization:</strong> ${organizationName}</li>
              <li style="margin-bottom: 8px;"><strong>👤 Your Role:</strong> ${role.charAt(0).toUpperCase() + role.slice(1)}</li>
              <li style="margin-bottom: 8px;"><strong>📧 Invited Email:</strong> ${invitedEmail}</li>
            </ul>
          </div>
          
          <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; font-size: 14px; color: #92400e;">
              💡 <strong>What you'll be able to do:</strong><br>
              As a <strong>${role}</strong>, you'll have ${roleDescription}.
            </p>
          </div>
          
          <div style="text-align: center; margin: 35px 0;">
            <a href="${acceptLink}" style="display: inline-block; background-color: #6366f1; color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(99, 102, 241, 0.25);">
              Log In to Accept Invitation
            </a>
          </div>
          
          <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 25px 0; border-radius: 4px;">
            <p style="margin: 0; font-size: 14px; color: #7f1d1d;">
              ⏰ <strong>This invitation will expire in ${expiresIn}.</strong> Make sure to accept it before then!
            </p>
          </div>
          
          <h3 style="color: #6366f1; font-size: 16px; margin-top: 25px;">What is Base Prop?</h3>
          <p style="font-size: 14px; color: #64748b; margin-bottom: 10px;">
            Base Prop is a comprehensive property management platform that helps landlords and property managers streamline their operations, manage tenants, track repairs, handle compliance, and much more.
          </p>
          
          <h3 style="color: #6366f1; font-size: 16px; margin-top: 25px;">Next Steps</h3>
          <ol style="padding-left: 20px; font-size: 14px; color: #64748b;">
            <li style="margin-bottom: 8px;">Click the button above to visit Base Prop</li>
            <li style="margin-bottom: 8px;">Log in to your account (or create one if you're new)</li>
            <li style="margin-bottom: 8px;">Your invitation will appear in your notifications</li>
            <li style="margin-bottom: 8px;">Accept the invitation and start collaborating!</li>
          </ol>
          
          <h3 style="color: #6366f1; font-size: 16px; margin-top: 25px;">Having trouble?</h3>
          <p style="font-size: 14px; color: #64748b; margin-bottom: 10px;">If the button doesn't work, copy and paste this link into your browser:</p>
          <div style="background-color: #f8fafc; padding: 12px; border-radius: 4px; word-break: break-all; font-size: 12px; color: #475569; border: 1px solid #e2e8f0;">
            ${acceptLink}
          </div>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          
          <p style="font-size: 12px; color: #6b7280; text-align: center; margin: 0;">
            You received this invitation because <strong>${inviterName}</strong> invited <strong>${invitedEmail}</strong> to join <strong>${organizationName}</strong> on Base Prop.
            <br><br>
            If you weren't expecting this invitation or have concerns, you can safely ignore this email or contact the sender directly.
            <br><br>
            © ${new Date().getFullYear()} Base Prop. All rights reserved.
          </p>
        </div>
      </body>
    </html>
  `;
}

export const handler: Handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Parse request body
    const body: InvitationEmailRequest = JSON.parse(event.body || '{}');
    const { invitedEmail, organizationName, inviterName, role, invitationToken, baseUrl } = body;

    // Validate required fields
    if (!invitedEmail || !organizationName || !inviterName || !role || !invitationToken || !baseUrl) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: 'Missing required fields',
          required: ['invitedEmail', 'organizationName', 'inviterName', 'role', 'invitationToken', 'baseUrl']
        })
      };
    }

    // Construct accept link - just link to home page, invitation will show in notifications
    const acceptLink = baseUrl;

    // Create HTML email
    const html = createInvitationEmailHtml(
      invitedEmail,
      organizationName,
      inviterName,
      role,
      acceptLink,
      '7 days'
    );

    // Create plain text version
    const text = `
Hello!

${inviterName} has invited you to join their organization on Base Prop.

📍 Please log in to Base Prop to view and accept this invitation.

Organization Details:
• Organization: ${organizationName}
• Your Role: ${role.charAt(0).toUpperCase() + role.slice(1)}
• Invited Email: ${invitedEmail}

What you'll be able to do:
As a ${role}, you'll have ${role === 'owner' ? 'full administrative access to manage properties, tenants, and team members' : 'access to view and manage properties and tenants'}.

Log In to Accept Your Invitation:
Click here: ${acceptLink}

⏰ This invitation will expire in 7 days. Make sure to accept it before then!

Next Steps:
1. Click the link above to visit Base Prop
2. Log in to your account (or create one if you're new)
3. Your invitation will appear in your notifications
4. Accept the invitation and start collaborating!

---
You received this invitation because ${inviterName} invited ${invitedEmail} to join ${organizationName} on Base Prop.

If you weren't expecting this invitation or have concerns, you can safely ignore this email or contact the sender directly.

© ${new Date().getFullYear()} Base Prop. All rights reserved.
    `.trim();

    // Send email via Resend
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [invitedEmail],
      subject: `📨 Invitation to join ${organizationName} on Base Prop`,
      html,
      text,
    });

    if (error) {
      console.error('Resend API error:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          success: false,
          error: error.message || 'Failed to send email'
        })
      };
    }

    console.log('✅ Email sent successfully:', data);

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true,
        messageId: data?.id
      })
    };

  } catch (error: any) {
    console.error('Error in send-invitation-email function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        success: false,
        error: error.message || 'Internal server error'
      })
    };
  }
};

