import { Handler } from '@netlify/functions';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev';

interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

interface InvoiceEmailRequest {
  // Invoice details
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  periodStart: string;
  periodEnd: string;
  amount: number;
  totalAmount: number;
  lineItems: InvoiceLineItem[];
  
  // Tenant details
  tenantName: string;
  tenantEmail: string;
  propertyAddress: string;
  
  // Company details (from settings)
  companyName?: string;
  companyAddress?: string;
  companyEmail?: string;
  companyPhone?: string;
  paymentTerms?: string;
  paymentInstructions?: string;
  footerNotes?: string;
  
  // Recipients
  recipients: string[];
  
  // Optional PDF attachment (base64 encoded)
  pdfAttachment?: string;
}

// Format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(amount);
}

// Format date
function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// Format month
function formatMonth(dateStr: string): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  });
}

// Create HTML invoice email
function createInvoiceEmailHtml(data: InvoiceEmailRequest): string {
  const {
    invoiceNumber,
    invoiceDate,
    dueDate,
    periodStart,
    totalAmount,
    lineItems,
    tenantName,
    propertyAddress,
    companyName,
    companyAddress,
    companyEmail,
    companyPhone,
    paymentTerms,
    paymentInstructions,
    footerNotes,
  } = data;

  const lineItemsHtml = lineItems.map(item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.description}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(item.unitPrice)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">${formatCurrency(item.amount)}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 700px; margin: 0 auto; padding: 20px; background-color: #f4f4f4;">
        <div style="background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 30px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <h1 style="margin: 0; font-size: 28px; font-weight: 700;">${companyName || 'Property Management'}</h1>
                  ${companyAddress ? `<p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9; white-space: pre-line;">${companyAddress}</p>` : ''}
                </td>
                <td style="text-align: right; vertical-align: top;">
                  <div style="background: rgba(255,255,255,0.2); border-radius: 8px; padding: 12px 16px; display: inline-block;">
                    <p style="margin: 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.9;">Invoice</p>
                    <p style="margin: 4px 0 0 0; font-size: 18px; font-weight: 700;">${invoiceNumber}</p>
                  </div>
                </td>
              </tr>
            </table>
          </div>
          
          <!-- Invoice Details Bar -->
          <div style="background-color: #f8fafc; padding: 20px 30px; border-bottom: 1px solid #e5e7eb;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="width: 33%;">
                  <p style="margin: 0; font-size: 12px; color: #64748b; text-transform: uppercase;">Invoice Date</p>
                  <p style="margin: 4px 0 0 0; font-size: 14px; font-weight: 600; color: #1e293b;">${formatDate(invoiceDate)}</p>
                </td>
                <td style="width: 33%; text-align: center;">
                  <p style="margin: 0; font-size: 12px; color: #64748b; text-transform: uppercase;">Due Date</p>
                  <p style="margin: 4px 0 0 0; font-size: 14px; font-weight: 600; color: #dc2626;">${formatDate(dueDate)}</p>
                </td>
                <td style="width: 33%; text-align: right;">
                  <p style="margin: 0; font-size: 12px; color: #64748b; text-transform: uppercase;">Period</p>
                  <p style="margin: 4px 0 0 0; font-size: 14px; font-weight: 600; color: #1e293b;">${formatMonth(periodStart)}</p>
                </td>
              </tr>
            </table>
          </div>
          
          <!-- Content -->
          <div style="padding: 30px;">
            
            <!-- Bill To -->
            <div style="margin-bottom: 30px;">
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">Bill To</p>
              <p style="margin: 0; font-size: 18px; font-weight: 600; color: #1e293b;">${tenantName}</p>
              <p style="margin: 4px 0 0 0; font-size: 14px; color: #64748b;">${propertyAddress}</p>
            </div>
            
            <!-- Line Items Table -->
            <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
              <thead>
                <tr style="background-color: #f8fafc;">
                  <th style="padding: 12px; text-align: left; font-size: 12px; text-transform: uppercase; color: #64748b; font-weight: 600;">Description</th>
                  <th style="padding: 12px; text-align: center; font-size: 12px; text-transform: uppercase; color: #64748b; font-weight: 600;">Qty</th>
                  <th style="padding: 12px; text-align: right; font-size: 12px; text-transform: uppercase; color: #64748b; font-weight: 600;">Rate</th>
                  <th style="padding: 12px; text-align: right; font-size: 12px; text-transform: uppercase; color: #64748b; font-weight: 600;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${lineItemsHtml}
              </tbody>
              <tfoot>
                <tr style="background-color: #1e293b;">
                  <td colspan="3" style="padding: 16px; text-align: right; font-size: 16px; font-weight: 700; color: white;">Total Due</td>
                  <td style="padding: 16px; text-align: right; font-size: 20px; font-weight: 700; color: white;">${formatCurrency(totalAmount)}</td>
                </tr>
              </tfoot>
            </table>
            
            <!-- Payment Instructions -->
            ${paymentInstructions ? `
              <div style="margin-top: 30px; background-color: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 20px;">
                <h3 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 700; color: #92400e;">Payment Instructions</h3>
                <p style="margin: 0; font-size: 14px; color: #78350f; white-space: pre-line;">${paymentInstructions}</p>
              </div>
            ` : ''}
            
            <!-- Payment Terms -->
            ${paymentTerms ? `
              <p style="margin: 20px 0 0 0; font-size: 14px; color: #64748b; text-align: center;">${paymentTerms}</p>
            ` : ''}
            
          </div>
          
          <!-- Footer -->
          <div style="background-color: #f8fafc; padding: 20px 30px; border-top: 1px solid #e5e7eb;">
            ${footerNotes ? `<p style="margin: 0 0 12px 0; font-size: 14px; color: #64748b; text-align: center;">${footerNotes}</p>` : ''}
            <div style="text-align: center;">
              ${companyEmail ? `<span style="font-size: 13px; color: #64748b;">📧 ${companyEmail}</span>` : ''}
              ${companyEmail && companyPhone ? `<span style="margin: 0 12px; color: #cbd5e1;">|</span>` : ''}
              ${companyPhone ? `<span style="font-size: 13px; color: #64748b;">📞 ${companyPhone}</span>` : ''}
            </div>
          </div>
          
        </div>
        
        <!-- Email Footer -->
        <p style="margin: 20px 0 0 0; font-size: 12px; color: #9ca3af; text-align: center;">
          This invoice was sent by ${companyName || 'your property manager'} via Base Prop.
          <br>
          © ${new Date().getFullYear()} Base Prop. All rights reserved.
        </p>
      </body>
    </html>
  `;
}

// Create plain text version
function createInvoiceEmailText(data: InvoiceEmailRequest): string {
  const {
    invoiceNumber,
    invoiceDate,
    dueDate,
    periodStart,
    totalAmount,
    lineItems,
    tenantName,
    propertyAddress,
    companyName,
    companyAddress,
    companyEmail,
    companyPhone,
    paymentTerms,
    paymentInstructions,
    footerNotes,
  } = data;

  const lineItemsText = lineItems.map(item => 
    `• ${item.description}: ${formatCurrency(item.amount)}`
  ).join('\n');

  return `
INVOICE ${invoiceNumber}
${companyName || 'Property Management'}
${companyAddress || ''}

Invoice Date: ${formatDate(invoiceDate)}
Due Date: ${formatDate(dueDate)}
Period: ${formatMonth(periodStart)}

BILL TO:
${tenantName}
${propertyAddress}

─────────────────────────────────

${lineItemsText}

─────────────────────────────────
TOTAL DUE: ${formatCurrency(totalAmount)}
─────────────────────────────────

${paymentInstructions ? `PAYMENT INSTRUCTIONS:\n${paymentInstructions}\n\n` : ''}
${paymentTerms ? `${paymentTerms}\n\n` : ''}
${footerNotes ? `${footerNotes}\n\n` : ''}

Contact: ${companyEmail || ''} ${companyPhone || ''}

---
This invoice was sent via Base Prop.
© ${new Date().getFullYear()} Base Prop. All rights reserved.
  `.trim();
}

export const handler: Handler = async (event) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Parse request body
    const body: InvoiceEmailRequest = JSON.parse(event.body || '{}');
    const {
      invoiceNumber,
      recipients,
      tenantName,
      totalAmount,
      pdfAttachment,
    } = body;

    // Validate required fields
    if (!invoiceNumber || !recipients || recipients.length === 0 || !tenantName) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing required fields',
          required: ['invoiceNumber', 'recipients', 'tenantName']
        })
      };
    }

    console.log(`📧 Sending invoice ${invoiceNumber} to ${recipients.join(', ')}`);

    // Create email content
    const html = createInvoiceEmailHtml(body);
    const text = createInvoiceEmailText(body);

    // Build email options
    const emailOptions: any = {
      from: FROM_EMAIL,
      to: recipients,
      subject: `Invoice ${invoiceNumber} - ${formatCurrency(totalAmount)} Due`,
      html,
      text,
    };

    // Add PDF attachment if provided
    if (pdfAttachment) {
      emailOptions.attachments = [
        {
          filename: `invoice-${invoiceNumber}.pdf`,
          content: pdfAttachment,
        },
      ];
    }

    // Send email via Resend
    const { data, error } = await resend.emails.send(emailOptions);

    if (error) {
      console.error('Resend API error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          success: false,
          error: error.message || 'Failed to send email'
        })
      };
    }

    console.log('✅ Invoice email sent successfully:', data);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true,
        messageId: data?.id,
        sentTo: recipients,
      })
    };

  } catch (error: any) {
    console.error('Error in send-invoice-email function:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false,
        error: error.message || 'Internal server error'
      })
    };
  }
};
