import jsPDF from 'jspdf';

export const generateMarketingPDF = () => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);

  // Brand Colors
  const turnkeyGreen = [34, 197, 94]; // #22C55E
  const turnkeyBlue = [59, 130, 246]; // #3B82F6
  const darkGray = [31, 41, 55]; // #1F2937
  const lightGray = [107, 114, 128]; // #6B7280

  // Header with gradient background effect
  doc.setFillColor(turnkeyGreen[0], turnkeyGreen[1], turnkeyGreen[2]);
  doc.rect(0, 0, pageWidth, 60, 'F');
  
  // TurnKey Logo/Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(32);
  doc.setFont('helvetica', 'bold');
  doc.text('TurnKey', margin, 25);
  
  // Tagline
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text('Real Estate Operational Workflows', margin, 35);
  
  doc.setFontSize(11);
  doc.text('Property Management Made Simple', margin, 45);

  // Main Headline Section
  let yPosition = 75;
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Manage Your Rental Properties', margin, yPosition);
  yPosition += 8;
  doc.setTextColor(turnkeyGreen[0], turnkeyGreen[1], turnkeyGreen[2]);
  doc.text('with Ease', margin, yPosition);
  
  yPosition += 12;
  doc.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const subtitle = 'The simple property management system for landlords. Track tenants,';
  doc.text(subtitle, margin, yPosition);
  yPosition += 5;
  doc.text('collect rent, schedule inspections, and stay compliant - all in one place.', margin, yPosition);

  // Key Features Section
  yPosition += 15;
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Key Features', margin, yPosition);

  yPosition += 10;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  const features = [
    {
      icon: '🏠',
      title: 'Property Portfolio Management',
      description: 'Track all your properties, occupancy status, and key details in one organized dashboard.'
    },
    {
      icon: '👥',
      title: 'Tenant Management',
      description: 'Manage tenant information, track lease agreements, monitor rent payments, and handle communications.'
    },
    {
      icon: '💰',
      title: 'Rent Collection & Tracking',
      description: 'Monitor monthly rent payments, identify overdue accounts, and track financial performance.'
    },
    {
      icon: '🔧',
      title: 'Maintenance & Compliance',
      description: 'Stay on top of property maintenance, safety certificates, and compliance with automated reminders.'
    },
    {
      icon: '📋',
      title: 'Inspection Scheduling',
      description: 'Plan routine, move-in, and move-out inspections. Track maintenance requests and repairs.'
    },
    {
      icon: '📊',
      title: 'Expense Tracking',
      description: 'Record all property-related expenses, monitor costs, and track financial performance.'
    }
  ];

  features.forEach((feature) => {
    // Feature box
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(margin, yPosition - 3, contentWidth, 16, 2, 2, 'F');
    
    // Icon
    doc.setFontSize(14);
    doc.text(feature.icon, margin + 2, yPosition + 3);
    
    // Title
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(feature.title, margin + 12, yPosition + 2);
    
    // Description
    doc.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(feature.description, contentWidth - 14);
    doc.text(lines, margin + 12, yPosition + 7);
    
    yPosition += 18;
  });

  // Multi-Country Support Section
  yPosition += 5;
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Available in Multiple Countries', margin, yPosition);
  
  yPosition += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.text('🇬🇧 United Kingdom  |  🇬🇷 Greece  |  🇺🇸 United States', margin, yPosition);

  // Why Choose TurnKey Section
  yPosition += 12;
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Why Choose TurnKey?', margin, yPosition);

  yPosition += 8;
  const benefits = [
    '✓ Easy to use - No technical expertise required',
    '✓ All-in-one platform - Everything you need in one place',
    '✓ Stay compliant - Never miss important deadlines',
    '✓ Save time - Automate repetitive tasks',
    '✓ Trusted by landlords managing 1000+ properties'
  ];

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
  
  benefits.forEach((benefit) => {
    doc.text(benefit, margin + 5, yPosition);
    yPosition += 6;
  });

  // Pricing Section
  yPosition += 8;
  doc.setFillColor(turnkeyGreen[0], turnkeyGreen[1], turnkeyGreen[2]);
  doc.roundedRect(margin, yPosition - 5, contentWidth, 25, 3, 3, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Get Started Free', pageWidth / 2, yPosition + 2, { align: 'center' });
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('Up to 5 properties • Unlimited tenants • Full feature access', pageWidth / 2, yPosition + 9, { align: 'center' });
  
  doc.setFontSize(10);
  doc.text('No credit card required', pageWidth / 2, yPosition + 15, { align: 'center' });

  // Footer
  const footerY = pageHeight - 15;
  doc.setDrawColor(turnkeyGreen[0], turnkeyGreen[1], turnkeyGreen[2]);
  doc.setLineWidth(0.5);
  doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
  
  doc.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Visit us at: www.turnkey.com | Email: info@turnkey.com', pageWidth / 2, footerY, { align: 'center' });

  // Save the PDF
  doc.save('TurnKey-Property-Management-Brochure.pdf');
};









