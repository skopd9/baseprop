import { supabase } from '../lib/supabase';

export interface EmailNotification {
  to: string;
  subject: string;
  message: string;
  type: 'inspection_booking' | 'inspection_reminder' | 'inspection_completion' | 'inspection_cancellation' | 'general';
  metadata?: Record<string, any>;
}

export class EmailNotificationService {
  // Send email notification (in production, this would integrate with an email service)
  static async sendEmail(notification: EmailNotification): Promise<boolean> {
    try {
      // In a real implementation, this would integrate with:
      // - SendGrid, Mailgun, AWS SES, or similar email service
      // - Supabase Edge Functions for server-side email sending
      // - Or a webhook to your backend email service

      console.log('📧 Sending email notification:', {
        to: notification.to,
        subject: notification.subject,
        type: notification.type,
        timestamp: new Date().toISOString()
      });

      // Simulate email sending delay
      await new Promise(resolve => setTimeout(resolve, 500));

      // Log the notification to database for tracking
      await this.logNotification(notification);

      // In development, show a visual confirmation
      if (import.meta.env.DEV) {
        this.showDevNotification(notification);
      }

      return true;
    } catch (error) {
      console.error('Error sending email notification:', error);
      return false;
    }
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

    return await this.sendEmail({
      to: tenantEmail,
      subject,
      message,
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

    return await this.sendEmail({
      to: tenantEmail,
      subject,
      message,
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
  private static async logNotification(notification: EmailNotification): Promise<void> {
    try {
      const { error } = await supabase
        .from('email_notifications')
        .insert({
          recipient_email: notification.to,
          subject: notification.subject,
          message: notification.message,
          notification_type: notification.type,
          metadata: notification.metadata || {},
          sent_at: new Date().toISOString(),
          status: 'sent'
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