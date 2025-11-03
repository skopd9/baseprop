# Tenant Onboarding - Quick Start Guide

## What Changed?

### ✅ Removed
- Self-service credit report option (no more "Send self-service link")

### ✅ Added
1. **Multi-Provider Credit Checks** - Choose from 4 UK providers
2. **Agent Contract Upload** - Upload contracts from your agent/solicitor
3. **DocuSign Integration** - Digital signature support (demo mode ready)
4. **Manual Credit Check Control** - Mark checks as complete or failed manually
5. **Fixed Completion Issues** - Can now complete entire onboarding flow

## Quick Test (3 minutes)

1. **Start**: Click "Start Onboarding" on any tenant
2. **Step 1**: Fill in lease dates and rent → Next
3. **Step 2**: 
   - Select a credit check provider
   - Click "Order Credit Check"
   - Wait 3 seconds (auto-completes) or click "Mark as Complete"
   - Next
4. **Step 3**: Choose one:
   - **Generate**: Answer questions → Generate → Send for DocuSign (auto-signs in 5s)
   - **Upload**: Select file → Upload agent contract
   - Next
5. **Step 4**: Choose DIY or Concierge → Complete checklist
6. **Done**: Click "Complete Onboarding"

## Credit Check Providers

| Provider | Cost | Speed | Features |
|----------|------|-------|----------|
| **Credas** | £30 | 24h | Right to Rent, ID, AML |
| **Homelet** | £35 | 24-48h | Full referencing |
| **Vouch** | £28 | 15min | Instant, Open Banking |
| **Rental Exchange** | £32 | 24h | Rental history |

## Tenancy Agreement Options

### Option 1: Generate In-App
- Customize AST agreement
- Set terms (pets, smoking, break clause, etc.)
- Send via DocuSign for signatures
- **Demo mode**: Auto-signs in 5 seconds

### Option 2: Upload Agent Contract
- Accept PDF or DOCX files
- For contracts created by agents/solicitors
- No generation needed
- Upload = Step complete

## Demo Mode Features

Everything works without external APIs:
- ✅ Credit checks auto-complete in 3 seconds
- ✅ DocuSign auto-signs in 5 seconds
- ✅ All providers selectable
- ✅ File uploads store locally

## Production Setup (Optional)

Add to `.env` file:
```bash
# DocuSign (get from https://developers.docusign.com)
VITE_DOCUSIGN_INTEGRATION_KEY=your_key
VITE_DOCUSIGN_ACCOUNT_ID=your_account
VITE_DOCUSIGN_REDIRECT_URL=http://localhost:5173/docusign-callback

# Credit Check Provider (default: credas)
VITE_CREDIT_CHECK_PROVIDER=credas
```

## Common Questions

**Q: Can I complete onboarding now?**
A: Yes! All blockers are fixed. Complete all 4 steps and click "Complete Onboarding".

**Q: What if credit checks fail?**
A: You can still proceed. A warning shows but won't block progress.

**Q: Do I need DocuSign configured?**
A: No. Demo mode works perfectly for testing. Configure later for production.

**Q: Can I use my agent's contract?**
A: Yes! Choose "Upload Agent Contract" in Step 3 and upload the PDF/DOCX.

**Q: How do I add guarantors?**
A: In Step 2, click "+ Add Guarantor" button at the bottom.

## Next Steps

1. Test the new flow with existing tenants
2. Configure DocuSign API keys for production
3. Choose your preferred credit check provider
4. Update costs if needed in `CreditCheckService.ts`

---

**Full Documentation**: See `TENANT_ONBOARDING_IMPROVEMENTS.md` for complete details.

