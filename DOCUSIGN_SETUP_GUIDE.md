# DocuSign Production Setup Guide

## ✅ Configuration Complete

Your DocuSign credentials are configured:
```
Integration Key: YOUR_INTEGRATION_KEY
Account ID: YOUR_ACCOUNT_ID
Redirect URL: http://localhost:5173/docusign-callback
```

## What's Working Now

✅ **Demo Mode**: The system will detect your credentials and prepare for production use
✅ **Configuration**: All environment variables are set
✅ **Service Layer**: DocuSign service is ready to make API calls

## What's Needed for Production

### 1. OAuth 2.0 Authentication

DocuSign requires OAuth 2.0 access tokens. You need to implement one of these flows:

#### Option A: Authorization Code Grant (Recommended for Web Apps)

```typescript
// Add to DocuSignService.ts

private static async getAccessToken(): Promise<string> {
  // Check if we have a valid cached token
  const cachedToken = localStorage.getItem('docusign_access_token');
  const tokenExpiry = localStorage.getItem('docusign_token_expiry');
  
  if (cachedToken && tokenExpiry && Date.now() < parseInt(tokenExpiry)) {
    return cachedToken;
  }

  // Redirect to DocuSign OAuth
  const authUrl = `https://account-d.docusign.com/oauth/auth?` +
    `response_type=code&` +
    `scope=signature%20impersonation&` +
    `client_id=${this.config.integrationKey}&` +
    `redirect_uri=${encodeURIComponent(this.config.redirectUrl)}`;
  
  window.location.href = authUrl;
  throw new Error('Redirecting to DocuSign for authentication');
}

static async handleOAuthCallback(code: string): Promise<void> {
  // Exchange code for access token
  const response = await fetch('https://account-d.docusign.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + btoa(`${this.config.integrationKey}:YOUR_SECRET_KEY`)
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: code
    })
  });

  const data = await response.json();
  
  // Store token
  localStorage.setItem('docusign_access_token', data.access_token);
  localStorage.setItem('docusign_token_expiry', (Date.now() + data.expires_in * 1000).toString());
  localStorage.setItem('docusign_refresh_token', data.refresh_token);
}
```

#### Option B: JWT Grant (For Server-to-Server)

If you're using a backend server:

```typescript
// Backend implementation
import jwt from 'jsonwebtoken';

async function getJWTAccessToken() {
  const privateKey = process.env.DOCUSIGN_PRIVATE_KEY;
  const userId = process.env.DOCUSIGN_USER_ID;
  
  const jwtPayload = {
    iss: process.env.DOCUSIGN_INTEGRATION_KEY,
    sub: userId,
    aud: 'account-d.docusign.com',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
    scope: 'signature impersonation'
  };

  const token = jwt.sign(jwtPayload, privateKey, { algorithm: 'RS256' });

  const response = await fetch('https://account-d.docusign.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: token
    })
  });

  return response.json();
}
```

### 2. Create OAuth Callback Route

Add a route to handle the OAuth callback:

```typescript
// src/pages/DocuSignCallback.tsx
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DocuSignService } from '../services/DocuSignService';

export const DocuSignCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const code = searchParams.get('code');
    if (code) {
      DocuSignService.handleOAuthCallback(code)
        .then(() => {
          navigate('/tenants'); // or wherever you want to redirect
        })
        .catch(error => {
          console.error('OAuth callback error:', error);
        });
    }
  }, [searchParams, navigate]);

  return <div>Completing DocuSign authentication...</div>;
};
```

### 3. Update DocuSign Service for Production

Replace the demo methods with real API calls:

```typescript
// src/services/DocuSignService.ts - Updated methods

static async createEnvelope(request: CreateEnvelopeRequest): Promise<DocuSignEnvelope> {
  if (!this.isConfigured()) {
    return this.createDemoEnvelope(request);
  }

  const accessToken = await this.getAccessToken();

  const response = await fetch(
    `${this.config.baseUrl}/v2.1/accounts/${this.config.accountId}/envelopes`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        emailSubject: request.emailSubject,
        emailBlurb: request.emailBlurb,
        documents: [{
          documentBase64: request.documentContent,
          name: request.documentName,
          fileExtension: 'pdf',
          documentId: '1'
        }],
        recipients: {
          signers: request.signers.map((signer, index) => ({
            email: signer.email,
            name: signer.name,
            recipientId: (index + 1).toString(),
            routingOrder: signer.routingOrder,
            tabs: {
              signHereTabs: [{
                documentId: '1',
                pageNumber: '1',
                xPosition: '100',
                yPosition: '100'
              }]
            }
          }))
        },
        status: 'sent'
      })
    }
  );

  if (!response.ok) {
    throw new Error(`DocuSign API error: ${response.statusText}`);
  }

  const data = await response.json();

  return {
    envelopeId: data.envelopeId,
    status: 'sent',
    documentName: request.documentName,
    signers: request.signers.map((signer, index) => ({
      email: signer.email,
      name: signer.name,
      recipientId: (index + 1).toString(),
      status: 'sent'
    })),
    createdDate: new Date(),
    sentDate: new Date()
  };
}
```

### 4. Required DocuSign Account Setup

1. **Go to DocuSign Admin**: https://admindemo.docusign.com (or account.docusign.com for production)

2. **Create Integration Key**:
   - Navigate to Settings → Apps and Keys
   - Click "Add App and Integration Key"
   - Add Redirect URI: `http://localhost:5173/docusign-callback`
   - Note your Integration Key (already done ✅)

3. **Generate RSA Key Pair** (for JWT):
   - In the same app settings
   - Click "Add RSA Keypair"
   - Download private key

4. **Grant Consent**:
   - User consent is required for OAuth
   - Visit: `https://account-d.docusign.com/oauth/auth?response_type=code&scope=signature%20impersonation&client_id=YOUR_INTEGRATION_KEY&redirect_uri=YOUR_REDIRECT_URI`

5. **Get User ID**:
   - Settings → My Profile → API and Keys
   - Copy your User ID

### 5. Additional Environment Variables Needed

Add to your `.env`:

```bash
# Existing (already set ✅)
VITE_DOCUSIGN_INTEGRATION_KEY=YOUR_INTEGRATION_KEY
VITE_DOCUSIGN_ACCOUNT_ID=YOUR_ACCOUNT_ID
VITE_DOCUSIGN_REDIRECT_URL=http://localhost:5173/docusign-callback

# New - Add these
VITE_DOCUSIGN_USER_ID=your_user_id_here
VITE_DOCUSIGN_SECRET_KEY=your_secret_key_here
VITE_DOCUSIGN_BASE_URL=https://demo.docusign.net/restapi  # or https://na3.docusign.net/restapi for production
```

### 6. Testing Checklist

- [ ] OAuth flow redirects correctly
- [ ] Access token is retrieved and cached
- [ ] Envelopes are created in DocuSign
- [ ] Emails are sent to signers
- [ ] Signature tabs appear correctly
- [ ] Signed documents are retrievable
- [ ] Token refresh works when expired

## Current Status

**Your app is configured and ready for the next steps:**

1. ✅ Integration Key configured
2. ✅ Account ID configured  
3. ✅ Redirect URL configured
4. ⏳ OAuth flow needs implementation
5. ⏳ Access token management needed
6. ⏳ Real API calls need to replace demo mode

## Quick Test (Demo Mode Still Active)

Even with credentials configured, the app still uses demo mode because OAuth isn't implemented yet. To test:

1. Start onboarding a tenant
2. Go to Step 3 (Tenancy Agreement)
3. Generate agreement
4. Click "Send for Digital Signature (DocuSign)"
5. It will still auto-sign in 5 seconds (demo mode)

## Recommended Next Steps

### Option 1: Keep Demo Mode (Fastest)
- Current setup works great for testing and development
- No additional setup needed
- Perfect for MVP and demos

### Option 2: Implement Full OAuth (Production)
1. Implement OAuth 2.0 flow (choose Authorization Code or JWT)
2. Add OAuth callback route
3. Update DocuSignService with real API calls
4. Add error handling and retry logic
5. Test with real DocuSign account

### Option 3: Use Backend Proxy (Most Secure)
1. Create backend API endpoint for DocuSign operations
2. Store credentials and private keys server-side
3. Frontend calls your backend, backend calls DocuSign
4. Better security (credentials never exposed to frontend)

## Resources

- **DocuSign Developer Center**: https://developers.docusign.com
- **OAuth Guide**: https://developers.docusign.com/platform/auth/
- **API Reference**: https://developers.docusign.com/docs/esign-rest-api/reference/
- **Node.js SDK**: https://github.com/docusign/docusign-node-client
- **Code Examples**: https://github.com/docusign/code-examples-node

## Support

Need help implementing OAuth? The DocuSign service is already structured for it - just uncomment the API call code and add the `getAccessToken()` method!

---

**Current State**: Demo mode active (credentials configured but OAuth not implemented)
**Next Step**: Decide if you want to implement full OAuth or keep demo mode for now

