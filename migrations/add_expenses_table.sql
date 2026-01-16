-- Create expenses table for tracking property-related expenses
CREATE TABLE IF NOT EXISTS expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_expenses_property_id ON expenses(property_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);

-- Add some common expense categories as reference
COMMENT ON COLUMN expenses.category IS 'Common categories: Maintenance, Insurance, Council Tax, Mortgage, Legal, Marketing, Utilities, Capex, Professional Services, Other';
COMMENT ON COLUMN expenses.subcategory IS 'More specific categorization within the main category';
COMMENT ON COLUMN expenses.is_tax_deductible IS 'Whether this expense can be claimed for tax purposes';