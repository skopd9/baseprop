import jsPDF from 'jspdf';
import { Invoice, InvoiceSettings } from '../services/InvoiceService';

interface GenerateInvoicePDFOptions {
  invoice: Invoice;
  settings?: InvoiceSettings | null;
  returnBase64?: boolean;
}

// Format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(amount);
}

// Format date
function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// Format month
function formatMonth(dateStr: string | undefined): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Generate a PDF invoice using jsPDF
 * Returns the PDF as base64 string if returnBase64 is true, otherwise saves the file
 */
export const generateInvoicePDF = (options: GenerateInvoicePDFOptions): string | void => {
  const { invoice, settings, returnBase64 = false } = options;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;

  // Colors
  const primaryColor: [number, number, number] = [59, 130, 246]; // Blue
  const darkGray: [number, number, number] = [31, 41, 55];
  const mediumGray: [number, number, number] = [107, 114, 128];
  const lightGray: [number, number, number] = [156, 163, 175];

  let yPosition = margin;

  // =====================================================
  // Header Background
  // =====================================================
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, pageWidth, 50, 'F');

  // Company Name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(settings?.companyName || 'Property Management', margin, 20);

  // Company Address (if provided)
  if (settings?.companyAddress) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const addressLines = settings.companyAddress.split('\n');
    let addressY = 26;
    addressLines.forEach((line) => {
      doc.text(line, margin, addressY);
      addressY += 4;
    });
  }

  // Invoice Badge
  doc.setFillColor(255, 255, 255, 0.2);
  doc.roundedRect(pageWidth - margin - 50, 10, 50, 30, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('INVOICE', pageWidth - margin - 25, 20, { align: 'center' });
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(invoice.invoiceNumber, pageWidth - margin - 25, 30, { align: 'center' });

  yPosition = 60;

  // =====================================================
  // Invoice Details Bar
  // =====================================================
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, yPosition - 5, contentWidth, 20, 'F');

  doc.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');

  // Invoice Date
  doc.text('INVOICE DATE', margin + 5, yPosition);
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(formatDate(invoice.invoiceDate), margin + 5, yPosition + 7);

  // Due Date
  doc.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('DUE DATE', pageWidth / 2 - 15, yPosition);
  doc.setTextColor(220, 38, 38); // Red for due date
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(formatDate(invoice.dueDate), pageWidth / 2 - 15, yPosition + 7);

  // Period
  doc.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('RENT PERIOD', pageWidth - margin - 45, yPosition);
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  const periodText = invoice.periodStart && invoice.periodEnd 
    ? `${formatDate(invoice.periodStart)} - ${formatDate(invoice.periodEnd)}`
    : formatMonth(invoice.periodStart);
  doc.text(periodText, pageWidth - margin - 45, yPosition + 7);

  yPosition += 30;

  // =====================================================
  // Bill To Section
  // =====================================================
  doc.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('BILL TO', margin, yPosition);

  yPosition += 6;
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(invoice.tenantName, margin, yPosition);

  yPosition += 6;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);
  doc.text(invoice.propertyAddress, margin, yPosition);

  if (invoice.tenantEmail) {
    yPosition += 5;
    doc.text(invoice.tenantEmail, margin, yPosition);
  }

  yPosition += 10;

  // Rent Period Info Box
  if (invoice.periodStart && invoice.periodEnd) {
    doc.setFillColor(239, 246, 255); // Light blue background
    doc.roundedRect(margin, yPosition, contentWidth, 12, 2, 2, 'F');
    
    doc.setTextColor(29, 78, 216); // Blue text
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Rent Period:', margin + 3, yPosition + 7);
    
    doc.setFont('helvetica', 'normal');
    doc.text(
      `${formatDate(invoice.periodStart)} to ${formatDate(invoice.periodEnd)}`,
      margin + 25,
      yPosition + 7
    );
    
    yPosition += 17;
  } else {
    yPosition += 5;
  }

  // =====================================================
  // Line Items Table
  // =====================================================

  // Table Header
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, yPosition - 5, contentWidth, 12, 'F');

  doc.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('DESCRIPTION', margin + 3, yPosition);
  doc.text('QTY', margin + 100, yPosition, { align: 'center' });
  doc.text('RATE', margin + 125, yPosition, { align: 'right' });
  doc.text('AMOUNT', margin + contentWidth - 3, yPosition, { align: 'right' });

  yPosition += 10;

  // Table Rows
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  const lineItems = invoice.lineItems || [
    {
      description: `Rent for ${formatMonth(invoice.periodStart)}`,
      quantity: 1,
      unitPrice: invoice.amount,
      amount: invoice.amount,
    },
  ];

  lineItems.forEach((item) => {
    // Draw line
    doc.setDrawColor(229, 231, 235);
    doc.line(margin, yPosition - 3, margin + contentWidth, yPosition - 3);

    doc.text(item.description, margin + 3, yPosition + 2);
    doc.text(String(item.quantity), margin + 100, yPosition + 2, { align: 'center' });
    doc.text(formatCurrency(item.unitPrice), margin + 125, yPosition + 2, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrency(item.amount), margin + contentWidth - 3, yPosition + 2, { align: 'right' });
    doc.setFont('helvetica', 'normal');

    yPosition += 12;
  });

  // Total Row
  yPosition += 5;
  doc.setFillColor(darkGray[0], darkGray[1], darkGray[2]);
  doc.rect(margin, yPosition - 5, contentWidth, 14, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL DUE', margin + 3, yPosition + 2);
  doc.setFontSize(14);
  doc.text(formatCurrency(invoice.totalAmount), margin + contentWidth - 3, yPosition + 2, { align: 'right' });

  yPosition += 20;

  // =====================================================
  // Payment Instructions
  // =====================================================
  if (settings?.paymentInstructions) {
    doc.setFillColor(254, 243, 199); // Yellow background
    doc.roundedRect(margin, yPosition - 5, contentWidth, 35, 3, 3, 'F');

    doc.setTextColor(146, 64, 14); // Brown text
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Payment Instructions', margin + 5, yPosition + 2);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const instructionLines = doc.splitTextToSize(settings.paymentInstructions, contentWidth - 10);
    doc.text(instructionLines, margin + 5, yPosition + 10);

    yPosition += 40;
  }

  // =====================================================
  // Payment Terms
  // =====================================================
  if (settings?.paymentTerms) {
    doc.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(settings.paymentTerms, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;
  }

  // =====================================================
  // Footer
  // =====================================================
  const footerY = pageHeight - 25;

  // Separator line
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setLineWidth(0.5);
  doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);

  // Footer notes
  if (settings?.footerNotes) {
    doc.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);
    doc.setFontSize(8);
    doc.text(settings.footerNotes, pageWidth / 2, footerY, { align: 'center' });
  }

  // Contact info
  doc.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.setFontSize(8);
  const contactParts = [];
  if (settings?.companyEmail) contactParts.push(settings.companyEmail);
  if (settings?.companyPhone) contactParts.push(settings.companyPhone);
  if (contactParts.length > 0) {
    doc.text(contactParts.join('  |  '), pageWidth / 2, footerY + 6, { align: 'center' });
  }

  // Generated by
  doc.setFontSize(7);
  doc.text('Generated by Base Prop', pageWidth / 2, footerY + 12, { align: 'center' });

  // =====================================================
  // Output
  // =====================================================
  if (returnBase64) {
    // Return base64 string for email attachment
    return doc.output('datauristring').split(',')[1];
  } else {
    // Save the file
    doc.save(`invoice-${invoice.invoiceNumber}.pdf`);
  }
};

/**
 * Generate a base64-encoded PDF for email attachment
 */
export const generateInvoicePDFBase64 = (
  invoice: Invoice,
  settings?: InvoiceSettings | null
): string => {
  return generateInvoicePDF({ invoice, settings, returnBase64: true }) as string;
};

/**
 * Download an invoice PDF
 */
export const downloadInvoicePDF = (
  invoice: Invoice,
  settings?: InvoiceSettings | null
): void => {
  generateInvoicePDF({ invoice, settings, returnBase64: false });
};
