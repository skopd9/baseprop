/**
 * Test utility for Resend email integration
 * Run this to verify your Resend setup is working correctly
 */

import { EmailNotificationService } from '../services/EmailNotificationService';

/**
 * Send a test email to verify Resend configuration
 * @param recipientEmail - Your email address to receive the test
 */
export async function sendTestEmail(recipientEmail: string): Promise<void> {
  console.log('🧪 Testing Resend Email Integration...\n');
  
  // Check environment variables
  console.log('📋 Checking configuration:');
  console.log('   VITE_RESEND_API_KEY:', import.meta.env.VITE_RESEND_API_KEY ? '✅ Set' : '❌ Not set');
  console.log('   VITE_FROM_EMAIL:', import.meta.env.VITE_FROM_EMAIL || 'onboarding@resend.dev (default)');
  console.log('');

  if (!import.meta.env.VITE_RESEND_API_KEY) {
    console.warn('⚠️  WARNING: VITE_RESEND_API_KEY not set. Email will be mocked.');
    console.log('   Add your Resend API key to .env file to send real emails.\n');
  }

  try {
    console.log(`📧 Sending test email to: ${recipientEmail}\n`);

    // Test 1: Simple general email
    console.log('Test 1: Sending simple welcome email...');
    const result1 = await EmailNotificationService.sendEmail({
      to: recipientEmail,
      subject: '✅ Resend Integration Test - Welcome Email',
      message: `Hello!

This is a test email from your property management application.

If you're receiving this, your Resend integration is working correctly! 🎉

Test Details:
- Sent at: ${new Date().toISOString()}
- From: ${import.meta.env.VITE_FROM_EMAIL || 'onboarding@resend.dev'}
- Service: Resend API

Next Steps:
1. ✅ Email delivery working
2. Check the HTML formatting looks good
3. Verify the email didn't go to spam
4. Check your Resend dashboard for delivery status

Best regards,
Your Property Management System`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4;">
            <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <div style="background-color: #10b981; color: white; padding: 20px; border-radius: 8px 8px 0 0; margin: -30px -30px 20px -30px; text-align: center;">
                <h1 style="margin: 0; font-size: 24px;">✅ Resend Integration Test</h1>
              </div>
              
              <p style="font-size: 16px; margin-bottom: 20px;">Hello!</p>
              
              <p style="margin-bottom: 20px;">This is a test email from your property management application.</p>
              
              <div style="background-color: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0; font-size: 18px; font-weight: bold; color: #059669;">
                  🎉 If you're receiving this, your Resend integration is working correctly!
                </p>
              </div>
              
              <h3 style="color: #3b82f6; font-size: 18px; margin-top: 25px;">Test Details</h3>
              <ul style="background-color: #f8fafc; padding: 15px 15px 15px 35px; border-radius: 4px;">
                <li><strong>Sent at:</strong> ${new Date().toLocaleString()}</li>
                <li><strong>From:</strong> ${import.meta.env.VITE_FROM_EMAIL || 'onboarding@resend.dev'}</li>
                <li><strong>Service:</strong> Resend API</li>
                <li><strong>Template:</strong> HTML + Plain Text</li>
              </ul>
              
              <h3 style="color: #3b82f6; font-size: 18px; margin-top: 25px;">Next Steps</h3>
              <ol style="padding-left: 20px;">
                <li>✅ Email delivery working</li>
                <li>Check the HTML formatting looks good</li>
                <li>Verify the email didn't go to spam</li>
                <li>Check your Resend dashboard for delivery status</li>
              </ol>
              
              <div style="background-color: #f0f9ff; border: 2px solid #3b82f6; padding: 15px; margin: 25px 0; border-radius: 8px; text-align: center;">
                <p style="margin: 0 0 10px 0; font-size: 14px;">View delivery details in your dashboard:</p>
                <a href="https://resend.com/emails" style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">Open Resend Dashboard</a>
              </div>
              
              <p style="margin-top: 25px;"><strong>Best regards,</strong><br>Your Property Management System</p>
              
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
              
              <p style="font-size: 12px; color: #6b7280; text-align: center; margin: 0;">This is a test email. You can safely ignore or delete it.</p>
            </div>
          </body>
        </html>
      `,
      type: 'general',
      metadata: {
        test: true,
        timestamp: new Date().toISOString()
      }
    });

    if (result1) {
      console.log('✅ Test email sent successfully!\n');
    } else {
      console.error('❌ Failed to send test email\n');
    }

    // Test 2: Inspection booking email (realistic use case)
    console.log('Test 2: Sending inspection booking email...');
    const testDate = new Date();
    testDate.setDate(testDate.getDate() + 7); // 7 days from now
    testDate.setHours(10, 0, 0, 0); // 10:00 AM

    const result2 = await EmailNotificationService.sendInspectionBookingNotification(
      recipientEmail,
      'Test User',
      '123 Test Street, London, SW1A 1AA',
      'routine',
      testDate,
      'This is a test inspection booking. Please disregard this notification.'
    );

    if (result2) {
      console.log('✅ Inspection booking email sent successfully!\n');
    } else {
      console.error('❌ Failed to send inspection booking email\n');
    }

    // Summary
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 Test Summary:');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`   Recipient: ${recipientEmail}`);
    console.log(`   Time: ${new Date().toLocaleString()}`);
    console.log(`   General Email: ${result1 ? '✅ Success' : '❌ Failed'}`);
    console.log(`   Inspection Email: ${result2 ? '✅ Success' : '❌ Failed'}`);
    console.log('');
    console.log('Next steps:');
    console.log('1. Check your inbox for 2 test emails');
    console.log('2. Check spam folder if not in inbox');
    console.log('3. Verify HTML formatting looks professional');
    console.log('4. Visit https://resend.com/emails to see delivery status');
    console.log('5. Check Supabase email_notifications table for logs');
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error during email test:', error);
    console.log('\nTroubleshooting:');
    console.log('1. Verify VITE_RESEND_API_KEY is set in .env file');
    console.log('2. Check API key format starts with "re_"');
    console.log('3. Verify VITE_FROM_EMAIL matches your verified domain');
    console.log('4. Check Resend dashboard for error details');
    console.log('5. Restart development server after changing .env\n');
  }
}

/**
 * Send a test magic link email
 * @param recipientEmail - Your email address to receive the test
 */
export async function sendTestMagicLinkEmail(recipientEmail: string): Promise<void> {
  console.log('🔐 Testing Magic Link Email...\n');
  
  try {
    const testMagicLink = `${window.location.origin}/auth/confirm?token=test_token_abc123xyz`;
    
    console.log(`📧 Sending magic link email to: ${recipientEmail}\n`);
    
    const result = await EmailNotificationService.sendMagicLinkEmail(
      recipientEmail,
      testMagicLink,
      '1 hour'
    );

    if (result) {
      console.log('✅ Magic link email sent successfully!\n');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('📊 What to check:');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('1. ✉️  Check your inbox for the magic link email');
      console.log('2. 🎨 Verify the email has green branding and looks professional');
      console.log('3. 🔘 Test that the "Sign In to Base Prop" button is prominent');
      console.log('4. 📱 Check mobile view - should be responsive');
      console.log('5. 🔒 Verify security information and expiration notice');
      console.log('6. 📋 Check that your email address is displayed correctly');
      console.log('7. 🔗 Verify fallback URL is shown for copy/paste');
      console.log('8. 📖 Check "What is a Magic Link?" explainer section');
      console.log('═══════════════════════════════════════════════════════════\n');
    } else {
      console.error('❌ Failed to send magic link email\n');
    }
  } catch (error) {
    console.error('❌ Error during magic link email test:', error);
  }
}

/**
 * Quick test function that can be called from browser console
 */
(window as any).testResendEmail = sendTestEmail;
(window as any).testMagicLinkEmail = sendTestMagicLinkEmail;

console.log('📧 Resend Email Test Utility Loaded');
console.log('💡 Usage:');
console.log('   testResendEmail("your-email@example.com")      - Send test emails');
console.log('   testMagicLinkEmail("your-email@example.com")   - Test magic link email');
console.log('   Or call from component/dev tools');

