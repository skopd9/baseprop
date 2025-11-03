# Expenses Tracker Feature Guide

## Overview
The Expenses Tracker is a comprehensive expense management system for landlords to track all property-related costs. This feature helps with financial planning, tax preparation, and potential integration with accounting systems.

## Features

### 📊 Expense Management
- **Add Expenses**: Record expenses with detailed categorization
- **Edit/Update**: Modify existing expense records
- **Delete**: Remove incorrect or duplicate entries
- **Property Association**: Link expenses to specific properties or mark as general portfolio expenses

### 🏷️ Categorization System
**Main Categories:**
- Maintenance (repairs, upkeep)
- Insurance (property, liability)
- Council Tax
- Mortgage (interest, fees)
- Legal (solicitor fees, court costs)
- Marketing (advertising, letting agent fees)
- Utilities (when landlord pays)
- Capex (capital expenditure, improvements)
- Professional Services (accountant, property manager)
- Other (miscellaneous expenses)

**Additional Fields:**
- Subcategory for more specific classification
- Vendor/Supplier information
- Payment method tracking
- Tax deductible marking
- Notes for additional context

### 📈 Reporting & Analytics
- **Monthly Summaries**: Track spending by month
- **Category Breakdown**: See where money is being spent
- **Tax Deductible Totals**: Separate tax-deductible expenses
- **Property-Specific Reports**: Expenses per property
- **Year-over-Year Comparisons**: Historical spending analysis

### 🔍 Filtering & Search
- Filter by category
- Filter by property
- Filter by year
- Filter by tax-deductible status
- Search by description or vendor

## User Interface

### Dashboard Integration
- **Expenses Widget**: Shows recent expenses and monthly total
- **Quick Access**: Direct link to full expenses tracker
- **Summary Stats**: Key metrics at a glance

### Main Expenses View
- **Table View**: Comprehensive list of all expenses
- **Add/Edit Modal**: User-friendly forms for data entry
- **Summary Cards**: Key financial metrics
- **Export Options**: Data export for accounting systems

## Database Schema

```sql
expenses (
    id UUID PRIMARY KEY,
    property_id UUID (references properties),
    category VARCHAR(100) NOT NULL,
    subcategory VARCHAR(100),
    description TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    expense_date DATE NOT NULL,
    payment_method VARCHAR(50),
    receipt_url TEXT,
    is_tax_deductible BOOLEAN DEFAULT true,
    vendor_name VARCHAR(200),
    notes TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
)
```

## Integration Benefits

### 🧾 Tax Preparation
- Automatic categorization for tax purposes
- Tax-deductible expense tracking
- Annual summaries for accountants
- Detailed records for HMRC compliance

### 💼 Accounting Systems Integration
The expense data structure is designed to integrate with popular accounting systems:
- **QuickBooks**: Category mapping and data export
- **Xero**: Direct API integration potential
- **Sage**: CSV export compatibility
- **FreeAgent**: Expense categorization alignment

### 📊 Financial Planning
- Monthly budget tracking
- Expense forecasting
- Property profitability analysis
- Cash flow management

## Usage Examples

### Common Expense Types
1. **Emergency Repairs**: Boiler breakdown, plumbing issues
2. **Routine Maintenance**: Annual gas safety, cleaning
3. **Legal Costs**: Eviction proceedings, contract reviews
4. **Insurance**: Buildings insurance, landlord liability
5. **Marketing**: Property advertising, letting agent fees
6. **Utilities**: When landlord covers utilities between tenants

### Best Practices
1. **Regular Entry**: Log expenses weekly to avoid forgetting
2. **Detailed Descriptions**: Include property address and nature of work
3. **Receipt Storage**: Keep digital copies of receipts
4. **Category Consistency**: Use consistent categorization for reporting
5. **Tax Planning**: Mark expenses as tax-deductible appropriately

## Future Enhancements

### Planned Features
- **Receipt Upload**: Attach receipt images to expenses
- **Recurring Expenses**: Set up automatic recurring entries
- **Budget Alerts**: Notifications when spending exceeds budgets
- **Mobile App**: Expense entry on-the-go
- **API Integration**: Direct connection to accounting software
- **Expense Approval**: Multi-user approval workflows

### Reporting Enhancements
- **Visual Charts**: Spending trends and category breakdowns
- **Comparative Analysis**: Property-to-property expense comparison
- **Profitability Reports**: Income vs expenses per property
- **Tax Reports**: Automated tax return preparation

## Getting Started

1. **Navigate to Expenses**: Click "Expenses" in the sidebar
2. **Add First Expense**: Click "Add Expense" button
3. **Fill Details**: Complete the expense form with all relevant information
4. **Review Summary**: Check the dashboard widget for quick overview
5. **Generate Reports**: Use filters to create specific reports

## Support & Integration

For accounting system integration or advanced reporting needs, the expense data can be exported in various formats:
- CSV for spreadsheet analysis
- JSON for API integration
- PDF for record keeping
- XML for accounting software import

The system is designed to grow with your property portfolio and can handle thousands of expense records with fast search and filtering capabilities.