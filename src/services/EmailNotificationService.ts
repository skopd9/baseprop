import { supabase } from '../lib/supabase';
import { Resend } from 'resend';

export interface EmailNotification {
  to: string;
  subject: string;
  message: string;
  type: 'inspection_booking' | 'inspection_reminder' | 'inspection_completion' | 'inspection_cancellation' | 'magic_link' | 'general';
  metadata?: Record<string, any>;
  html?: string; // Optional HTML content
}

// Initialize Resend with API key from environment variables
const resend = new Resend(import.meta.env.VITE_RESEND_API_KEY);

// Default sender email (you should update this to your verified domain)
const DEFAULT_FROM_EMAIL = import.meta.env.VITE_FROM_EMAIL || 'onboarding@resend.dev';

export class EmailNotificationService {
  // Send email notification using Resend API
  static async sendEmail(notification: EmailNotification): Promise<boolean> {
    try {
      console.log('📧 Sending email notification:', {
        to: notification.to,
        subject: notification.subject,
        type: notification.type,
        timestamp: new Date().toISOString()
      });

      // If Resend API key is configured, send via Resend
      if (import.meta.env.VITE_RESEND_API_KEY) {
        try {
          const { data, error } = await resend.emails.send({
            from: DEFAULT_FROM_EMAIL,
            to: [notification.to],
            subject: notification.subject,
            html: notification.html || this.textToHtml(notification.message),
            text: notification.message,
          });

          if (error) {
            console.error('Resend API error:', error);
            throw error;
          }

          console.log('✅ Email sent successfully via Resend:', data);
          
          // Log the notification to database for tracking
          await this.logNotification(notification, 'sent', data?.id);
          
          return true;
        } catch (resendError) {
          console.error('Error sending via Resend:', resendError);
          // Fall back to mock mode if Resend fails
          await this.logNotification(notification, 'failed');
          return false;
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

        return true;
      }
    } catch (error) {
      console.error('Error sending email notification:', error);
      await this.logNotification(notification, 'failed');
      return false;
    }
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
  ): Promise<boolean> {
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
  ): Promise<boolean> {
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

  // Send magic link email for authentication
  static async sendMagicLinkEmail(
    email: string,
    magicLink: string,
    expiresIn: string = '1 hour'
  ): Promise<boolean> {
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
  ): Promise<boolean> {
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

  // Log notification to database for tracking
  private static async logNotification(
    notification: EmailNotification, 
    status: 'sent' | 'failed' | 'mock' = 'sent',
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
        console.error('Error logging notification:', error);
      }
    } catch (error) {
      console.error('Error in logNotification:', error);
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