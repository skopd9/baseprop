-- Migration: Add comprehensive onboarding data fields to tenants
-- This migration adds fields to store all onboarding information collected during tenant setup

-- Add onboarding status and progress tracking
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS onboarding_status TEXT DEFAULT 'not_started' CHECK (onboarding_status IN ('not_started', 'in_progress', 'completed')),
ADD COLUMN IF NOT EXISTS onboarding_progress INTEGER DEFAULT 0 CHECK (onboarding_progress >= 0 AND onboarding_progress <= 100),
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS onboarding_notes TEXT;

-- Add lease information fields (if not already present)
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS deposit_weeks INTEGER DEFAULT 4,
ADD COLUMN IF NOT EXISTS rent_due_day INTEGER DEFAULT 1 CHECK (rent_due_day >= 1 AND rent_due_day <= 28);

-- Add comprehensive onboarding data as JSONB
-- This will store:
-- - Credit check information (provider, status, results, guarantors)
-- - Tenancy agreement details (method, questions, DocuSign info)
-- - Preparation checklist and concierge service info
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS onboarding_data JSONB DEFAULT '{}'::jsonb;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_tenants_onboarding_status ON tenants(onboarding_status);
CREATE INDEX IF NOT EXISTS idx_tenants_onboarding_data ON tenants USING GIN (onboarding_data);

-- Add comment explaining the onboarding_data structure
COMMENT ON COLUMN tenants.onboarding_data IS 
'Stores comprehensive onboarding information including:
{
  "creditChecks": [
    {
      "id": "string",
      "type": "tenant|guarantor",
      "name": "string",
      "email": "string",
      "status": "pending|ordered|completed|failed",
      "cost": number,
      "provider": "string",
      "orderedDate": "ISO date",
      "completedDate": "ISO date",
      "result": "passed|failed|pending",
      "failureReason": "string"
    }
  ],
  "tenancyAgreement": {
    "method": "generate|upload",
    "status": "not_started|generating|ready_for_signing|signed|uploaded",
    "generatedDate": "ISO date",
    "signedDate": "ISO date",
    "uploadedFileName": "string",
    "docusignEnvelopeId": "string",
    "questions": {
      "petsAllowed": boolean,
      "smokingAllowed": boolean,
      "sublettingAllowed": boolean,
      "decoratingAllowed": boolean,
      "breakClause": boolean,
      "breakClauseMonths": number
    }
  },
  "preparation": {
    "type": "diy|concierge",
    "checklist": [
      {
        "id": "string",
        "task": "string",
        "completed": boolean,
        "required": boolean
      }
    ],
    "conciergeOrdered": boolean,
    "conciergeOrderedDate": "ISO date"
  }
}';

-- Update existing tenants to have default onboarding_data structure
UPDATE tenants 
SET onboarding_data = '{
  "creditChecks": [],
  "tenancyAgreement": {
    "method": "generate",
    "status": "not_started",
    "questions": {
      "petsAllowed": false,
      "smokingAllowed": false,
      "sublettingAllowed": false,
      "decoratingAllowed": false,
      "breakClause": false,
      "breakClauseMonths": 6
    }
  },
  "preparation": {
    "type": "diy",
    "checklist": [],
    "conciergeOrdered": false
  }
}'::jsonb
WHERE onboarding_data = '{}'::jsonb OR onboarding_data IS NULL;

