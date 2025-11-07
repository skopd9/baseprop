import { supabase } from '../lib/supabase';
import { Resend } from 'resend';
import { rateLimitService } from './RateLimitService';

export interface EmailNotification {
  to: string;
  subject: string;
  message: string;
  type: 'inspection_booking' | 'inspection_reminder' | 'inspection_completion' | 'inspection_cancellation' | 'magic_link' | 'organization_invitation' | 'general';
  metadata?: Record<string, any>;
  html?: string; // Optional HTML content
}

export interface EmailSendResult {
  success: boolean;
  error?: string;
  rateLimited?: boolean;
  retryAfter?: number;
  remainingToday?: number;
}

// Lazy-load Resend client only when API key is available
let resendClient: Resend | null = null;

function getResendClient(): Resend | null {
  if (!import.meta.env.VITE_RESEND_API_KEY) {
    return null;
  }
  
  if (!resendClient) {
    resendClient = new Resend(import.meta.env.VITE_RESEND_API_KEY);
  }
  
  return resendClient;
}

// Default sender email (you should update this to your verified domain)
const DEFAULT_FROM_EMAIL = import.meta.env.VITE_FROM_EMAIL || 'onboarding@resend.dev';

export class EmailNotificationService {
  // Send email notification using Resend API with rate limiting
  static async sendEmail(notification: EmailNotification): Promise<EmailSendResult> {
    try {
      console.log('📧 Attempting to send email notification:', {
        to: notification.to,
        subject: notification.subject,
        type: notification.type,
        timestamp: new Date().toISOString()
      });

      // Try to get Resend client (only if API key is configured)
      const resend = getResendClient();
      
      // If Resend API key is configured, send via Resend
      if (resend) {
        // Check rate limit before attempting to send
        const rateLimitCheck = rateLimitService.canSendEmail();
        if (!rateLimitCheck.allowed) {
          const stats = rateLimitService.getUsageStats();
          console.warn('⚠️ Rate limit exceeded:', rateLimitCheck.reason);
          
          // Show user-friendly notification
          this.showRateLimitNotification(rateLimitCheck, stats);
          
          await this.logNotification(notification, 'rate_limited');
          
          return {
            success: false,
            error: rateLimitCheck.reason,
            rateLimited: true,
            retryAfter: rateLimitCheck.retryAfter,
            remainingToday: stats.remainingToday
          };
        }

        try {
          const { data, error } = await resend.emails.send({
            from: DEFAULT_FROM_EMAIL,
            to: [notification.to],
            subject: notification.subject,
            html: notification.html || this.textToHtml(notification.message),
            text: notification.message,
          });

          if (error) {
            console.error('❌ Resend API error:', error);
            
            // Check if this is a rate limit error from Resend's API
            if (rateLimitService.constructor.isRateLimitError(error)) {
              const stats = rateLimitService.getUsageStats();
              const errorMsg = this.getResendRateLimitMessage(error);
              
              this.showRateLimitNotification({ allowed: false, reason: errorMsg }, stats);
              await this.logNotification(notification, 'rate_limited');
              
              return {
                success: false,
                error: errorMsg,
                rateLimited: true,
                remainingToday: stats.remainingToday
              };
            }
            
            throw error;
          }

          console.log('✅ Email sent successfully via Resend:', data);
          
          // Record successful send for rate limiting
          rateLimitService.recordEmailSent();
          
          // Log the notification to database for tracking
          await this.logNotification(notification, 'sent', data?.id);
          
          // Show usage stats after successful send
          const stats = rateLimitService.getUsageStats();
          console.log('📊 Email usage today:', `${stats.today}/${stats.limits.maxEmailsPerDay} (${stats.remainingToday} remaining)`);
          
          return {
            success: true,
            remainingToday: stats.remainingToday
          };
        } catch (resendError: any) {
          console.error('Error sending via Resend:', resendError);
          
          // Check if this is a rate limit error
          if (rateLimitService.constructor.isRateLimitError(resendError)) {
            const stats = rateLimitService.getUsageStats();
            const errorMsg = this.getResendRateLimitMessage(resendError);
            
            this.showRateLimitNotification({ allowed: false, reason: errorMsg }, stats);
            await this.logNotification(notification, 'rate_limited');
            
            return {
              success: false,
              error: errorMsg,
              rateLimited: true,
              remainingToday: stats.remainingToday
            };
          }
          
          // Other errors
          await this.logNotification(notification, 'failed');
          return {
            success: false,
            error: resendError.message || 'Unknown error occurred'
          };
        }
      } else {
        // Development/mock mode - no Resend API key configured
        console.warn('⚠️ VITE_RESEND_API_KEY not configured. Running in mock mode.');
        
        // Simulate email sending delay
        await new Promise(resolve => setTimeout(resolve, 500));

        // Log the notification to database for tracking
        await this.logNotification(notification, 'mock');

        // In development, show a visual confirmation
        if (import.meta.env.DEV) {
          this.showDevNotification(notification);
        }

        return { success: true };
      }
    } catch (error: any) {
      console.error('Error sending email notification:', error);
      await this.logNotification(notification, 'failed');
      return {
        success: false,
        error: error.message || 'Failed to send email'
      };
    }
  }

  /**
   * Get user-friendly message for Resend rate limit errors
   */
  private static getResendRateLimitMessage(error: any): string {
    const errorMsg = error.message?.toLowerCase() || '';
    
    // Sandbox mode (3 emails limit)
    if (errorMsg.includes('sandbox') || errorMsg.includes('verify')) {
      return '🚨 SANDBOX MODE: You can only send 3 emails total. Please verify your domain in Resend to unlock full limits (100 emails/day). Visit: https://resend.com/domains';
    }
    
    // Daily limit
    if (errorMsg.includes('daily') || errorMsg.includes('day')) {
      return '📧 Daily limit reached (100 emails). Resets at midnight UTC. Consider upgrading: https://resend.com/pricing';
    }
    
    // General rate limit
    return '⏱️ Rate limit exceeded. Please wait a few minutes before sending more emails.';
  }

  // Convert plain text to simple HTML
  private static textToHtml(text: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="white-space: pre-wrap;">${text.replace(/\n/g, '<br>')}</div>
        </body>
      </html>
    `;
  }

  // Create HTML template for inspection booking
  private static createInspectionBookingHtml(
    tenantName: string,
    propertyAddress: string,
    inspectionType: string,
    formattedDate: string,
    formattedTime: string,
    notes?: string
  ): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4;">
          <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <div style="background-color: #3b82f6; color: white; padding: 20px; border-radius: 8px 8px 0 0; margin: -30px -30px 20px -30px;">
              <h1 style="margin: 0; font-size: 24px;">Property Inspection Scheduled</h1>
            </div>
            
            <p style="font-size: 16px; margin-bottom: 20px;">Dear ${tenantName},</p>
            
            <p style="margin-bottom: 20px;">We hope this email finds you well. We are writing to inform you that a property inspection has been scheduled for your residence.</p>
            
            <div style="background-color: #f8fafc; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <h2 style="margin-top: 0; color: #3b82f6; font-size: 18px;">Inspection Details</h2>
              <ul style="list-style: none; padding: 0; margin: 10px 0;">
                <li style="margin-bottom: 8px;"><strong>📍 Property:</strong> ${propertyAddress}</li>
                <li style="margin-bottom: 8px;"><strong>🔍 Type:</strong> ${inspectionType.charAt(0).toUpperCase() + inspectionType.slice(1)} Inspection</li>
                <li style="margin-bottom: 8px;"><strong>📅 Date:</strong> ${formattedDate}</li>
                <li style="margin-bottom: 8px;"><strong>🕐 Time:</strong> ${formattedTime}</li>
              </ul>
            </div>
            
            ${notes ? `
              <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <h3 style="margin-top: 0; color: #f59e0b; font-size: 16px;">Additional Notes</h3>
                <p style="margin: 0;">${notes}</p>
              </div>
            ` : ''}
            
            <h3 style="color: #3b82f6; font-size: 18px; margin-top: 25px;">What to Expect</h3>
            <ul style="padding-left: 20px;">
              <li>The inspection will take approximately 30-60 minutes</li>
              <li>Please ensure access to all areas of the property</li>
              <li>You are welcome to be present during the inspection</li>
              <li>Any issues found will be discussed with you directly</li>
            </ul>
            
            <h3 style="color: #3b82f6; font-size: 18px;">Preparation</h3>
            <ul style="padding-left: 20px;">
              <li>Please ensure the property is accessible</li>
              <li>Remove any personal items that may obstruct access to fixtures</li>
              <li>Ensure utilities (water, electricity, heating) are functioning</li>
            </ul>
            
            <div style="background-color: #f0f9ff; border: 2px solid #3b82f6; padding: 15px; margin: 25px 0; border-radius: 8px; text-align: center;">
              <p style="margin: 0 0 10px 0; font-size: 14px;">Access your tenant portal to view more details:</p>
              <a href="https://turnkey.com/tenant-login" style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">Login to Portal</a>
            </div>
            
            <p style="margin-top: 25px;">If you have any questions or need to reschedule, please contact us as soon as possible.</p>
            
            <p style="margin-top: 20px;">Thank you for your cooperation.</p>
            
            <p style="margin-top: 20px;"><strong>Best regards,</strong><br>Property Management Team</p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            
            <p style="font-size: 12px; color: #6b7280; text-align: center; margin: 0;">This is an automated notification. Please do not reply to this email.</p>
          </div>
        </body>
      </html>
    `;
  }

  // Create HTML template for magic link authentication
  private static createMagicLinkHtml(
    email: string,
    magicLink: string,
    expiresIn: string = '1 hour'
  ): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4;">
          <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <div style="background-color: #10b981; color: white; padding: 20px; border-radius: 8px 8px 0 0; margin: -30px -30px 20px -30px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px;">🔐 Sign In to Base Prop</h1>
            </div>
            
            <p style="font-size: 16px; margin-bottom: 20px;">Hello!</p>
            
            <p style="margin-bottom: 20px;">You requested a magic link to sign in to your Base Prop account. Click the button below to securely sign in:</p>
            
            <div style="text-align: center; margin: 35px 0;">
              <a href="${magicLink}" style="display: inline-block; background-color: #10b981; color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.25);">
                Sign In to Base Prop
              </a>
            </div>
            
            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 25px 0; border-radius: 4px;">
              <p style="margin: 0; font-size: 14px; color: #92400e;">
                ⏰ <strong>This link will expire in ${expiresIn}.</strong> If you didn't request this email, you can safely ignore it.
              </p>
            </div>
            
            <div style="background-color: #f8fafc; padding: 15px; margin: 20px 0; border-radius: 4px; border: 1px solid #e2e8f0;">
              <p style="margin: 0 0 5px 0; font-size: 12px; color: #64748b;"><strong>Account Details:</strong></p>
              <p style="margin: 0; font-size: 14px; color: #334155;">📧 ${email}</p>
            </div>
            
            <h3 style="color: #3b82f6; font-size: 16px; margin-top: 25px;">Having trouble?</h3>
            <p style="font-size: 14px; color: #64748b; margin-bottom: 10px;">If the button doesn't work, copy and paste this link into your browser:</p>
            <div style="background-color: #f8fafc; padding: 12px; border-radius: 4px; word-break: break-all; font-size: 12px; color: #475569; border: 1px solid #e2e8f0;">
              ${magicLink}
            </div>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            
            <div style="text-align: center;">
              <h3 style="color: #10b981; font-size: 18px; margin-bottom: 10px;">What is a Magic Link?</h3>
              <p style="font-size: 14px; color: #64748b; margin: 0;">
                Magic links provide secure, password-free authentication. Simply click the link, and you'll be automatically signed in to your account. No passwords to remember!
              </p>
            </div>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            
            <p style="font-size: 12px; color: #6b7280; text-align: center; margin: 0;">
              This email was sent to <strong>${email}</strong> because a sign-in was requested for Base Prop.
              <br><br>
              If you didn't request this email, please ignore it or contact support if you have concerns.
              <br><br>
              © ${new Date().getFullYear()} Base Prop. All rights reserved.
            </p>
          </div>
        </body>
      </html>
    `;
  }

  // Create HTML template for inspection cancellation
  private static createInspectionCancellationHtml(
    tenantName: string,
    propertyAddress: string,
    inspectionType: string,
    formattedDate: string,
    formattedTime: string,
    cancellationReason?: string
  ): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4;">
          <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <div style="background-color: #ef4444; color: white; padding: 20px; border-radius: 8px 8px 0 0; margin: -30px -30px 20px -30px;">
              <h1 style="margin: 0; font-size: 24px;">Inspection Cancelled</h1>
            </div>
            
            <p style="font-size: 16px; margin-bottom: 20px;">Dear ${tenantName},</p>
            
            <p style="margin-bottom: 20px;">We are writing to inform you that the property inspection scheduled for your residence has been cancelled.</p>
            
            <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <h2 style="margin-top: 0; color: #ef4444; font-size: 18px;">Cancelled Inspection Details</h2>
              <ul style="list-style: none; padding: 0; margin: 10px 0;">
                <li style="margin-bottom: 8px;"><strong>📍 Property:</strong> ${propertyAddress}</li>
                <li style="margin-bottom: 8px;"><strong>🔍 Type:</strong> ${inspectionType.charAt(0).toUpperCase() + inspectionType.slice(1)} Inspection</li>
                <li style="margin-bottom: 8px;"><strong>📅 Originally Scheduled:</strong> ${formattedDate} at ${formattedTime}</li>
              </ul>
            </div>
            
            ${cancellationReason ? `
              <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <h3 style="margin-top: 0; color: #f59e0b; font-size: 16px;">Reason for Cancellation</h3>
                <p style="margin: 0;">${cancellationReason}</p>
              </div>
            ` : ''}
            
            <h3 style="color: #3b82f6; font-size: 18px; margin-top: 25px;">Next Steps</h3>
            <ul style="padding-left: 20px;">
              <li>No action is required from you at this time</li>
              <li>We will contact you if we need to reschedule this inspection</li>
              <li>You can check for updates in your tenant portal</li>
            </ul>
            
            <div style="background-color: #f0f9ff; border: 2px solid #3b82f6; padding: 15px; margin: 25px 0; border-radius: 8px; text-align: center;">
              <p style="margin: 0 0 10px 0; font-size: 14px;">Check your inspection history in the tenant portal:</p>
              <a href="https://turnkey.com/tenant-login" style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">Login to Portal</a>
            </div>
            
            <p style="margin-top: 25px;">We apologize for any inconvenience this may cause. If you have any questions or concerns, please don't hesitate to contact us.</p>
            
            <p style="margin-top: 20px;"><strong>Best regards,</strong><br>Property Management Team</p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            
            <p style="font-size: 12px; color: #6b7280; text-align: center; margin: 0;">This is an automated notification. Please do not reply to this email.</p>
          </div>
        </body>
      </html>
    `;
  }

  // Send inspection booking notification to tenant
  static async sendInspectionBookingNotification(
    tenantEmail: string,
    tenantName: string,
    propertyAddress: string,
    inspectionType: string,
    scheduledDate: Date,
    notes?: string
  ): Promise<EmailSendResult> {
    const subject = `Property Inspection Scheduled - ${propertyAddress}`;
    
    const formattedDate = scheduledDate.toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    const formattedTime = scheduledDate.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit'
    });
    
    const message = `
Dear ${tenantName},

We hope this email finds you well. We are writing to inform you that a property inspection has been scheduled for your residence.

**Inspection Details:**
• Property: ${propertyAddress}
• Type: ${inspectionType.charAt(0).toUpperCase() + inspectionType.slice(1)} Inspection
• Date: ${formattedDate}
• Time: ${formattedTime}

${notes ? `**Additional Notes:**\n${notes}\n\n` : ''}

**What to Expect:**
• The inspection will take approximately 30-60 minutes
• Please ensure access to all areas of the property
• You are welcome to be present during the inspection
• Any issues found will be discussed with you directly

**Preparation:**
• Please ensure the property is accessible
• Remove any personal items that may obstruct access to fixtures
• Ensure utilities (water, electricity, heating) are functioning

**Tenant Portal Access:**
You can view more details about this inspection and manage your tenancy through your tenant portal:
👉 Login to your portal: https://turnkey.com/tenant-login

If you have any questions or need to reschedule, please contact us as soon as possible.

Thank you for your cooperation.

Best regards,
Property Management Team

---
This is an automated notification. Please do not reply to this email.
    `.trim();

    const html = this.createInspectionBookingHtml(
      tenantName,
      propertyAddress,
      inspectionType,
      formattedDate,
      formattedTime,
      notes
    );

    return await this.sendEmail({
      to: tenantEmail,
      subject,
      message,
      html,
      type: 'inspection_booking',
      metadata: {
        propertyAddress,
        inspectionType,
        scheduledDate: scheduledDate.toISOString(),
        tenantName
      }
    });
  }

  // Send inspection cancellation notification to tenant
  static async sendInspectionCancellationNotification(
    tenantEmail: string,
    tenantName: string,
    propertyAddress: string,
    inspectionType: string,
    scheduledDate: Date,
    cancellationReason?: string
  ): Promise<EmailSendResult> {
    const subject = `Inspection Cancelled - ${propertyAddress}`;
    
    const formattedDate = scheduledDate.toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    const formattedTime = scheduledDate.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit'
    });
    
    const message = `
Dear ${tenantName},

We are writing to inform you that the property inspection scheduled for your residence has been cancelled.

**Cancelled Inspection Details:**
• Property: ${propertyAddress}
• Type: ${inspectionType.charAt(0).toUpperCase() + inspectionType.slice(1)} Inspection
• Originally Scheduled: ${formattedDate} at ${formattedTime}

${cancellationReason ? `**Reason for Cancellation:**\n${cancellationReason}\n\n` : ''}

**Next Steps:**
• No action is required from you at this time
• We will contact you if we need to reschedule this inspection
• You can check for updates in your tenant portal

**Tenant Portal Access:**
You can view your inspection history and any updates through your tenant portal:
👉 Login to your portal: https://turnkey.com/tenant-login

We apologize for any inconvenience this may cause. If you have any questions or concerns, please don't hesitate to contact us.

Best regards,
Property Management Team

---
This is an automated notification. Please do not reply to this email.
    `.trim();

    const html = this.createInspectionCancellationHtml(
      tenantName,
      propertyAddress,
      inspectionType,
      formattedDate,
      formattedTime,
      cancellationReason
    );

    return await this.sendEmail({
      to: tenantEmail,
      subject,
      message,
      html,
      type: 'inspection_cancellation',
      metadata: {
        propertyAddress,
        inspectionType,
        scheduledDate: scheduledDate.toISOString(),
        tenantName,
        cancellationReason
      }
    });
  }

  // Create HTML template for organization invitation
  private static createOrganizationInvitationHtml(
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

  // Send organization invitation email via Netlify Function
  static async sendOrganizationInvitationEmail(
    invitedEmail: string,
    organizationName: string,
    inviterName: string,
    role: 'owner' | 'member',
    invitationToken: string,
    expiresIn: string = '7 days'
  ): Promise<EmailSendResult> {
    try {
      const baseUrl = window.location.origin;
      const acceptLink = `${baseUrl}/?invite=${invitationToken}`;
      
      // Check if we're in local development (Netlify Function may not be available)
      const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      
      if (isLocalDev) {
        console.log('🔧 LOCAL DEV MODE - Invitation email details:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📧 To:', invitedEmail);
        console.log('🏢 Organization:', organizationName);
        console.log('👤 Invited by:', inviterName);
        console.log('🎭 Role:', role);
        console.log('🔗 Accept Link:', acceptLink);
        console.log('⏰ Expires:', expiresIn);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('');
        console.log('💡 Copy this link to test the invitation:');
        console.log(acceptLink);
        console.log('');
        console.log('📌 To send real emails in development, run: netlify dev');
        console.log('📌 To send real emails in production, deploy to Netlify');
        
        // Show visual notification in dev mode
        this.showInvitationDevNotification(invitedEmail, acceptLink);
        
        return {
          success: true
        };
      }

      console.log('📧 Sending invitation email via Netlify Function...');

      // Call Netlify Function to send email (avoids CORS issues)
      const response = await fetch('/.netlify/functions/send-invitation-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invitedEmail,
          organizationName,
          inviterName,
          role,
          invitationToken,
          baseUrl,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        console.error('❌ Failed to send invitation email:', result.error);
        return {
          success: false,
          error: result.error || 'Failed to send email'
        };
      }

      console.log('✅ Invitation email sent successfully!', result.messageId);
      
      return {
        success: true
      };
    } catch (error: any) {
      console.error('❌ Error sending invitation email:', error);
      return {
        success: false,
        error: error.message || 'Failed to send email'
      };
    }
  }

  // Show invitation notification in dev mode with copy link button
  private static showInvitationDevNotification(email: string, inviteLink: string): void {
    const notificationEl = document.createElement('div');
    notificationEl.className = 'fixed top-4 right-4 bg-indigo-600 text-white p-6 rounded-lg shadow-2xl z-50 max-w-md animate-slide-in';
    notificationEl.innerHTML = `
      <div class="space-y-3">
        <div class="flex items-start space-x-3">
          <div class="flex-shrink-0">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-bold mb-1">📧 Invitation Created (Dev Mode)</p>
            <p class="text-xs opacity-90 mb-2">To: ${email}</p>
            <p class="text-xs opacity-75 mb-3">In production, this would send an email via Resend.</p>
          </div>
          <button onclick="this.closest('div').parentElement.parentElement.remove()" class="text-white hover:text-indigo-200 flex-shrink-0">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        
        <div class="bg-indigo-700 rounded p-3">
          <p class="text-xs font-semibold mb-2">🔗 Invitation Link:</p>
          <div class="bg-indigo-800 rounded p-2 text-xs break-all font-mono mb-2">
            ${inviteLink}
          </div>
          <button 
            onclick="navigator.clipboard.writeText('${inviteLink}').then(() => { 
              this.textContent = '✅ Copied!'; 
              setTimeout(() => this.textContent = '📋 Copy Link', 2000);
            })"
            class="w-full bg-white text-indigo-600 px-3 py-2 rounded text-xs font-semibold hover:bg-indigo-50 transition-colors">
            📋 Copy Link
          </button>
        </div>
        
        <div class="text-xs opacity-75 pt-2 border-t border-indigo-500">
          💡 <strong>Tip:</strong> Deploy to Netlify or run <code class="bg-indigo-700 px-1 rounded">netlify dev</code> to send real emails
        </div>
      </div>
    `;

    document.body.appendChild(notificationEl);

    // Auto-remove after 30 seconds
    setTimeout(() => {
      if (notificationEl.parentNode) {
        notificationEl.parentNode.removeChild(notificationEl);
      }
    }, 30000);
  }

  // Send magic link email for authentication
  static async sendMagicLinkEmail(
    email: string,
    magicLink: string,
    expiresIn: string = '1 hour'
  ): Promise<EmailSendResult> {
    const subject = '🔐 Sign in to Base Prop - Magic Link';
    
    const message = `
Hello!

You requested a magic link to sign in to your Base Prop account.

Click here to sign in: ${magicLink}

This link will expire in ${expiresIn}.

If you didn't request this email, you can safely ignore it.

Account: ${email}

---
© ${new Date().getFullYear()} Base Prop. All rights reserved.
    `.trim();

    const html = this.createMagicLinkHtml(email, magicLink, expiresIn);

    return await this.sendEmail({
      to: email,
      subject,
      message,
      html,
      type: 'magic_link',
      metadata: {
        email,
        expiresIn,
        sentAt: new Date().toISOString()
      }
    });
  }

  // Send inspection reminder (24 hours before)
  static async sendInspectionReminder(
    tenantEmail: string,
    tenantName: string,
    propertyAddress: string,
    inspectionType: string,
    scheduledDate: Date
  ): Promise<EmailSendResult> {
    const subject = `Reminder: Property Inspection Tomorrow - ${propertyAddress}`;
    
    const message = `
Dear ${tenantName},

This is a friendly reminder that your property inspection is scheduled for tomorrow.

**Inspection Details:**
• Property: ${propertyAddress}
• Type: ${inspectionType.charAt(0).toUpperCase() + inspectionType.slice(1)} Inspection
• Date & Time: ${scheduledDate.toLocaleDateString('en-GB')} at ${scheduledDate.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit'
    })}

Please ensure the property is accessible and you are available if you wish to be present.

If you need to reschedule, please contact us immediately.

Best regards,
Property Management Team
    `.trim();

    return await this.sendEmail({
      to: tenantEmail,
      subject,
      message,
      type: 'inspection_reminder',
      metadata: {
        propertyAddress,
        inspectionType,
        scheduledDate: scheduledDate.toISOString(),
        tenantName
      }
    });
  }

  /**
   * Show rate limit notification to user
   */
  private static showRateLimitNotification(
    rateLimitCheck: { allowed: boolean; reason?: string },
    stats: any
  ): void {
    const notificationEl = document.createElement('div');
    notificationEl.className = 'fixed top-4 right-4 bg-red-500 text-white p-4 rounded-lg shadow-lg z-50 max-w-md animate-slide-in';
    notificationEl.innerHTML = `
      <div class="flex items-start space-x-3">
        <div class="flex-shrink-0">
          <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
          </svg>
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-bold mb-1">⚠️ Email Rate Limit Exceeded</p>
          <p class="text-xs mb-2">${rateLimitCheck.reason}</p>
          <div class="bg-red-600 bg-opacity-50 rounded p-2 text-xs mb-2">
            <p class="font-semibold">Today's Usage:</p>
            <p>${stats.today}/${stats.limits.maxEmailsPerDay} emails sent</p>
            <p>${stats.remainingToday} remaining</p>
          </div>
          <p class="text-xs opacity-90">
            💡 <strong>Solutions:</strong><br>
            • Wait and try again later<br>
            • Verify your domain to unlock full limits<br>
            • Upgrade your Resend plan
          </p>
        </div>
        <button onclick="this.parentElement.parentElement.remove()" class="text-white hover:text-red-200">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
    `;

    document.body.appendChild(notificationEl);

    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (notificationEl.parentNode) {
        notificationEl.parentNode.removeChild(notificationEl);
      }
    }, 10000);
  }

  // Log notification to database for tracking (optional - table may not exist)
  private static async logNotification(
    notification: EmailNotification, 
    status: 'sent' | 'failed' | 'mock' | 'rate_limited' = 'sent',
    externalId?: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('email_notifications')
        .insert({
          recipient_email: notification.to,
          subject: notification.subject,
          message: notification.message,
          notification_type: notification.type,
          metadata: {
            ...(notification.metadata || {}),
            ...(externalId && { resend_id: externalId })
          },
          sent_at: new Date().toISOString(),
          status
        });

      if (error) {
        // Silently fail if table doesn't exist - logging is optional
        if (error.code !== 'PGRST204' && error.code !== '42P01') {
          console.error('Error logging notification:', error);
        }
      }
    } catch (error) {
      // Silently fail - logging is optional
      console.debug('Email notification logging skipped (table may not exist)');
    }
  }

  // Show development notification (visual feedback in dev mode)
  private static showDevNotification(notification: EmailNotification): void {
    // Create a temporary notification element
    const notificationEl = document.createElement('div');
    notificationEl.className = 'fixed top-4 right-4 bg-green-500 text-white p-4 rounded-lg shadow-lg z-50 max-w-sm';
    notificationEl.innerHTML = `
      <div class="flex items-start space-x-3">
        <div class="flex-shrink-0">
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
            <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
          </svg>
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium">Email Sent!</p>
          <p class="text-xs opacity-90">To: ${notification.to}</p>
          <p class="text-xs opacity-90">${notification.subject}</p>
        </div>
      </div>
    `;

    document.body.appendChild(notificationEl);

    // Remove after 5 seconds
    setTimeout(() => {
      if (notificationEl.parentNode) {
        notificationEl.parentNode.removeChild(notificationEl);
      }
    }, 5000);
  }

  // Get notification history
  static async getNotificationHistory(
    recipientEmail?: string,
    type?: string,
    limit: number = 50
  ): Promise<any[]> {
    try {
      let query = supabase
        .from('email_notifications')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(limit);

      if (recipientEmail) {
        query = query.eq('recipient_email', recipientEmail);
      }

      if (type) {
        query = query.eq('notification_type', type);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching notification history:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getNotificationHistory:', error);
      return [];
    }
  }

  // Schedule inspection reminders (would typically run as a cron job)
  static async scheduleInspectionReminders(): Promise<void> {
    try {
      // This would typically be implemented as:
      // 1. A Supabase Edge Function that runs on a schedule
      // 2. A cron job on your backend
      // 3. A scheduled task in your deployment platform

      console.log('📅 Checking for inspection reminders to send...');
      
      // In a real implementation, you would:
      // 1. Query for inspections scheduled for tomorrow
      // 2. Check if reminders have already been sent
      // 3. Send reminders to tenants
      // 4. Mark reminders as sent to avoid duplicates

    } catch (error) {
      console.error('Error scheduling inspection reminders:', error);
    }
  }
}