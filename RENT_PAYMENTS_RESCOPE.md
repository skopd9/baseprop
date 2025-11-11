# Rent Payments Feature - Rescoping Document

## Executive Summary

The **rent_payments** table and associated features were fully scoped and implemented in code but the database migration was **never applied**. This document rescopes the requirements and provides a clear implementation path.

## Current Status

### ✅ What's Complete
- **Service Layer**: `RentPaymentService.ts` is fully implemented with all business logic
- **Type Definitions**: `RentPayment` and `RentPaymentStatus` types defined in `src/types/index.ts`
- **Migration Files**: SQL migration ready at `migrations/create_rent_payments_table.sql`
- **UI Components**: Several components reference rent payment functionality
- **Documentation**: User guide at `APPLY_RENT_PAYMENTS_MIGRATION.md`

### ❌ What's Missing
- **Database Table**: The `rent_payments` table does not exist in the database
- **No actual data**: Service code checks for table existence and gracefully returns empty arrays
- **Feature is non-functional**: All rent tracking features are currently disabled

---

## Requirements Specification

### 1. Core Business Requirements

#### 1.1 Rent Payment Tracking
- Track rent payments per tenant per property
- Support multiple payment periods (monthly, quarterly, annual)
- Record payment status: pending, paid, late, partial, missed
- Track payment dates and due dates
- Record payment methods and references

#### 1.2 Pro-Rated Rent Calculation
- **Use Case**: When tenants move in/out mid-month
- **Logic**: Calculate daily rate based on days in month
- Formula: `dailyRate = monthlyRent / daysInMonth`
- Pro-rated amount: `dailyRate × actualDays`
- Track pro-rated status and number of days

#### 1.3 Payment Periods
- **Monthly**: Default frequency, rent due on specific day of month
- **Quarterly**: Every 3 months (future enhancement)
- **Annual**: Once per year (future enhancement)
- Generate all payment periods when lease is created
- Track period start/end dates separate from payment/due dates

#### 1.4 Invoice Generation
- Generate unique invoice numbers: `INV-YYYYMM-{tenantId}-{sequence}`
- Track when invoices are generated
- Include all payment details (period, amount, pro-rating)
- Link invoices to payment records

#### 1.5 Rent Status Tracking
- Calculate if rent is current or overdue
- Calculate days overdue for late payments
- Show current period payment status
- Support multiple tenants per property (HMO properties)

### 2. Technical Requirements

#### 2.1 Database Schema

```sql
CREATE TABLE rent_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  
  -- Payment Details
  payment_date DATE NOT NULL,           -- When payment was/will be made
  due_date DATE NOT NULL,                -- When payment is due
  amount_due DECIMAL(10, 2) NOT NULL,   -- Total amount due
  amount_paid DECIMAL(10, 2),           -- Actual amount paid (NULL until paid)
  
  -- Payment Period
  payment_frequency TEXT DEFAULT 'monthly' CHECK (payment_frequency IN ('monthly', 'quarterly', 'annual')),
  period_start DATE,                     -- Start of rental period
  period_end DATE,                       -- End of rental period
  is_pro_rated BOOLEAN DEFAULT false,   -- Whether this is pro-rated
  pro_rate_days INTEGER,                -- Number of days for pro-rating
  
  -- Invoice
  invoice_number TEXT,
  invoice_generated_at TIMESTAMP WITH TIME ZONE,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'late', 'partial', 'missed')),
  
  -- Payment Method
  payment_method TEXT,                  -- e.g., 'bank_transfer', 'standing_order', 'cash', 'cheque'
  
  -- Reference
  payment_reference TEXT,               -- External reference number
  
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 2.2 Required Indexes
```sql
CREATE INDEX idx_rent_payments_tenant_period ON rent_payments(tenant_id, period_start, period_end);
CREATE INDEX idx_rent_payments_due_date ON rent_payments(due_date);
CREATE INDEX idx_rent_payments_status ON rent_payments(status);
```

#### 2.3 Row Level Security (RLS)
- Enable RLS on rent_payments table
- Landlords can view payments for properties in their organization
- Landlords can insert/update/delete payments in their organization
- All operations scoped by `organization_id` via properties table

#### 2.4 Auto-Update Trigger
```sql
CREATE TRIGGER rent_payments_updated_at
  BEFORE UPDATE ON rent_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_rent_payments_updated_at();
```

### 3. Service Layer Capabilities (Already Implemented)

#### 3.1 Payment Period Generation
```typescript
generatePaymentPeriods(
  tenantId: string,
  propertyId: string,
  leaseStart: Date,
  leaseEnd: Date,
  monthlyRent: number,
  rentDueDay: number,
  paymentFrequency: PaymentFrequency = 'monthly'
): PaymentPeriod[]
```

**Logic**:
1. Start from lease start date
2. For first period: use actual lease start date (may be mid-month)
3. For subsequent periods: use rent_due_day of each month
4. Calculate period end as next rent_due_day
5. Check if period is partial (needs pro-rating)
6. Calculate pro-rated amount if necessary
7. Continue until lease end date

#### 3.2 Pro-Rating Calculation
```typescript
calculateProRatedAmount(
  monthlyRent: number,
  periodStart: Date,
  periodEnd: Date
): { amount: number; days: number }
```

**Logic**:
1. Calculate days in the partial period
2. Get total days in the month
3. Calculate daily rate: `monthlyRent / daysInMonth`
4. Calculate pro-rated amount: `dailyRate × days`
5. Round to 2 decimal places

#### 3.3 Payment Recording
```typescript
recordPayment(paymentData: {
  paymentId: string;
  amountPaid: number;
  paymentDate: Date;
  paymentMethod?: string;
  paymentReference?: string;
  notes?: string;
}): Promise<boolean>
```

#### 3.4 Status Calculation
```typescript
calculateRentStatus(
  tenantId: string,
  rentDueDay: number,
  monthlyRent: number,
  leaseStart: Date,
  leaseEnd: Date
): Promise<RentStatusResult>
```

**Returns**:
- `status`: 'current' or 'overdue'
- `daysOverdue`: Number of days past due date
- `currentPayment`: Current period payment record

#### 3.5 Cash Flow Projection
```typescript
calculateFutureCashFlow(
  tenantId: string,
  startDate?: Date,
  endDate?: Date
): Promise<CashFlowItem[]>
```

#### 3.6 Invoice Generation
```typescript
generateInvoice(paymentId: string): Promise<Invoice | null>
```

### 4. Integration Requirements

#### 4.1 Tenant Onboarding Integration
When a new tenant is created:
1. Generate all payment periods for the lease duration
2. Save payment periods to database
3. Handle pro-rating for mid-month move-ins
4. Use tenant's `rent_due_day` from tenant record

#### 4.2 Dashboard Integration
- Show rent collection overview
- Display overdue payments
- Show upcoming payments
- Calculate collection rate
- Show monthly cash flow projections

#### 4.3 Property Management Integration
- Link payments to properties
- Support HMO properties (multiple tenants)
- Calculate per-property rent collection
- Track vacancies and their impact on rent

### 5. User Stories

#### US-1: As a landlord, I want to automatically generate rent payment schedules when I add a tenant
**Acceptance Criteria**:
- When tenant is added with lease dates, all payment periods are created
- First payment is pro-rated if tenant moves in mid-month
- Payment periods align with rent_due_day
- All periods from lease start to lease end are created

#### US-2: As a landlord, I want to see which tenants have overdue rent
**Acceptance Criteria**:
- Dashboard shows list of overdue payments
- Shows days overdue for each tenant
- Shows amount owed
- Can filter by property

#### US-3: As a landlord, I want to record when a tenant pays rent
**Acceptance Criteria**:
- Can mark payment as paid
- Can enter actual payment date
- Can enter payment method and reference
- Can add notes
- Status updates to 'paid'

#### US-4: As a landlord, I want to generate invoices for rent payments
**Acceptance Criteria**:
- Can generate invoice for any payment period
- Invoice has unique number
- Shows all payment details including pro-rating
- Can regenerate/view existing invoice

#### US-5: As a landlord, I want to see future cash flow projections
**Acceptance Criteria**:
- Can see all upcoming payments
- Can filter by date range
- Shows payment amounts and due dates
- Indicates payment status

### 6. Data Flow

```
Tenant Created → Generate Payment Periods → Save to DB
                         ↓
                  Check Lease Dates
                         ↓
                Calculate Pro-Rating (if needed)
                         ↓
                  Create Payment Records
                         ↓
              Set status = 'pending'
```

```
Payment Due Date Reached → Check Payment Status → Update Status
                                    ↓
                          If unpaid → Calculate Days Overdue
                                    ↓
                          Update status to 'late'
```

```
Record Payment → Update Payment Record → Set amount_paid
                         ↓
                  Set payment_date
                         ↓
                  Set payment_method
                         ↓
                Update status to 'paid'
```

### 7. Example Scenarios

#### Scenario 1: Full Month Rent
- Tenant: John Smith
- Property: 123 Main St
- Lease: 2025-01-01 to 2025-12-31
- Monthly Rent: £1,200
- Rent Due Day: 1st of month

**Generated Periods**:
- Period 1: Jan 1 - Feb 1, Due: Jan 1, Amount: £1,200
- Period 2: Feb 1 - Mar 1, Due: Feb 1, Amount: £1,200
- ... (12 periods total)

#### Scenario 2: Mid-Month Move-In (Pro-Rated)
- Tenant: Jane Doe
- Property: 456 Oak Ave
- Lease: 2025-01-15 to 2025-12-31
- Monthly Rent: £1,200
- Rent Due Day: 1st of month

**Generated Periods**:
- Period 1: Jan 15 - Feb 1, Due: Jan 15, Amount: £677.42 (17 days, pro-rated)
- Period 2: Feb 1 - Mar 1, Due: Feb 1, Amount: £1,200
- Period 3: Mar 1 - Apr 1, Due: Mar 1, Amount: £1,200
- ... (continues to Dec 31)

#### Scenario 3: HMO Property (Multiple Tenants)
- Property: 789 Student House (HMO)
- 4 Units, 4 Tenants
- Each tenant: £500/month
- Different move-in dates

**Result**:
- Separate payment schedules per tenant
- Each tenant has own payment records
- All linked to same property_id
- Property shows total expected rent: £2,000/month

---

## Migration Plan

### Step 1: Apply Database Migration
Run the migration file: `migrations/create_rent_payments_table.sql`

**What it does**:
- Creates rent_payments table with all fields
- Creates indexes for performance
- Enables RLS with 4 policies (SELECT, INSERT, UPDATE, DELETE)
- Creates updated_at trigger

### Step 2: Verify Migration
```sql
-- Check table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'rent_payments'
) as table_exists;

-- Check RLS is enabled
SELECT rowsecurity 
FROM pg_tables 
WHERE tablename = 'rent_payments';

-- Check policies
SELECT COUNT(*) 
FROM pg_policies 
WHERE tablename = 'rent_payments';
-- Expected: 4 policies
```

### Step 3: Test with Sample Data
```sql
-- Insert a test payment
INSERT INTO rent_payments (
  tenant_id,
  property_id,
  payment_date,
  due_date,
  amount_due,
  period_start,
  period_end
) VALUES (
  'existing-tenant-id',
  'existing-property-id',
  '2025-01-01',
  '2025-01-01',
  1200.00,
  '2025-01-01',
  '2025-02-01'
);
```

### Step 4: Integration Testing
1. Create a new tenant with lease dates
2. Verify payment periods are generated
3. Check pro-rating calculation
4. Test recording a payment
5. Test status updates
6. Test invoice generation

### Step 5: UI Testing
1. Open dashboard - check for console errors
2. Navigate to tenant details
3. View rent payment schedule
4. Record a test payment
5. Generate an invoice

---

## Success Criteria

✅ **Migration Applied**: rent_payments table exists in database  
✅ **RLS Enabled**: 4 policies active  
✅ **Indexes Created**: 3 indexes for performance  
✅ **No Console Errors**: Application loads without 404 errors  
✅ **Payment Periods Generated**: New tenants get payment schedules  
✅ **Pro-Rating Works**: Mid-month move-ins calculate correctly  
✅ **Payments Recorded**: Can mark payments as paid  
✅ **Invoices Generated**: Can create invoices with unique numbers  
✅ **Dashboard Updated**: Shows rent collection metrics  

---

## Risk Assessment

### Low Risk
- Migration is idempotent (uses `IF NOT EXISTS`)
- Service layer already handles missing table gracefully
- No data loss risk (creating new table)

### Medium Risk
- Need to ensure organization_id relationships work correctly
- RLS policies must allow access to landlords in organization

### Mitigation
- Test with existing tenant/property data
- Verify RLS policies with real user sessions
- Run in development/staging first

---

## Next Steps

1. **Review this rescoping document** - Ensure all requirements are correct
2. **Apply the migration** - Run `migrations/create_rent_payments_table.sql`
3. **Verify table creation** - Check table, indexes, and RLS
4. **Test with sample data** - Create test payment records
5. **Integration test** - Add a tenant and verify payment periods
6. **UI test** - Check dashboard and tenant views
7. **Monitor logs** - Watch for any errors or issues

---

## References

- Migration File: `migrations/create_rent_payments_table.sql`
- Service Implementation: `src/services/RentPaymentService.ts`
- Type Definitions: `src/types/index.ts`
- User Guide: `APPLY_RENT_PAYMENTS_MIGRATION.md`
- Base Schema: `uk_landlord_schema.sql` (lines 158-204)

---

**Document Version**: 1.0  
**Date**: 2025-11-04  
**Status**: Ready for Implementation






