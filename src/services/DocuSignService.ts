import { 
  DocuSignConfig, 
  DocuSignEnvelope, 
  CreateEnvelopeRequest,
  DocuSignSigner 
} from '../types/docusign';

export class DocuSignService {
  private static config: DocuSignConfig = {
    integrationKey: import.meta.env.VITE_DOCUSIGN_INTEGRATION_KEY || '',
    accountId: import.meta.env.VITE_DOCUSIGN_ACCOUNT_ID || '',
    redirectUrl: import.meta.env.VITE_DOCUSIGN_REDIRECT_URL || window.location.origin + '/docusign-callback',
    baseUrl: 'https://demo.docusign.net/restapi'
  };

  static isConfigured(): boolean {
    return !!(this.config.integrationKey && this.config.accountId);
  }

  static async createEnvelope(request: CreateEnvelopeRequest): Promise<DocuSignEnvelope> {
    if (!this.isConfigured()) {
      console.warn('DocuSign is not configured. Using demo mode.');
      return this.createDemoEnvelope(request);
    }

    // In production, this would make actual DocuSign API calls:
    // const response = await fetch(`${this.config.baseUrl}/v2.1/accounts/${this.config.accountId}/envelopes`, {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${accessToken}`,
    //     'Content-Type': 'application/json'
    //   },
    //   body: JSON.stringify({
    //     emailSubject: request.emailSubject,
    //     emailBlurb: request.emailBlurb,
    //     documents: [{
    //       documentBase64: request.documentContent,
    //       name: request.documentName,
    //       fileExtension: 'pdf',
    //       documentId: '1'
    //     }],
    //     recipients: {
    //       signers: request.signers.map((signer, index) => ({
    //         email: signer.email,
    //         name: signer.name,
    //         recipientId: (index + 1).toString(),
    //         routingOrder: signer.routingOrder
    //       }))
    //     },
    //     status: 'sent'
    //   })
    // });

    return this.createDemoEnvelope(request);
  }

  private static createDemoEnvelope(request: CreateEnvelopeRequest): DocuSignEnvelope {
    const envelopeId = 'demo-' + Math.random().toString(36).substring(7);
    
    return {
      envelopeId,
      status: 'sent',
      documentName: request.documentName,
      signers: request.signers.map((signer, index) => ({
        email: signer.email,
        name: signer.name,
        recipientId: (index + 1).toString(),
        status: 'sent'
      })),
      createdDate: new Date(),
      sentDate: new Date(),
      viewUrl: `https://demo.docusign.net/signing/${envelopeId}`
    };
  }

  static async sendForSignature(envelope: DocuSignEnvelope): Promise<DocuSignEnvelope> {
    console.log(`Sending envelope ${envelope.envelopeId} for signature`);
    
    // In production, this would update the envelope status to 'sent'
    return {
      ...envelope,
      status: 'sent',
      sentDate: new Date()
    };
  }

  static async getEnvelopeStatus(envelopeId: string): Promise<DocuSignEnvelope> {
    if (!this.isConfigured()) {
      console.warn('DocuSign is not configured. Using demo mode.');
      return this.getDemoEnvelopeStatus(envelopeId);
    }

    // In production:
    // const response = await fetch(
    //   `${this.config.baseUrl}/v2.1/accounts/${this.config.accountId}/envelopes/${envelopeId}`,
    //   {
    //     headers: { 'Authorization': `Bearer ${accessToken}` }
    //   }
    // );

    return this.getDemoEnvelopeStatus(envelopeId);
  }

  private static getDemoEnvelopeStatus(envelopeId: string): DocuSignEnvelope {
    return {
      envelopeId,
      status: 'delivered',
      documentName: 'Tenancy Agreement',
      signers: [],
      createdDate: new Date(),
      sentDate: new Date()
    };
  }

  static async getSigningUrl(envelopeId: string, signerEmail: string, returnUrl: string): Promise<string> {
    if (!this.isConfigured()) {
      return `https://demo.docusign.net/signing/${envelopeId}?email=${signerEmail}&return=${encodeURIComponent(returnUrl)}`;
    }

    // In production, create a recipient view:
    // const response = await fetch(
    //   `${this.config.baseUrl}/v2.1/accounts/${this.config.accountId}/envelopes/${envelopeId}/views/recipient`,
    //   {
    //     method: 'POST',
    //     headers: {
    //       'Authorization': `Bearer ${accessToken}`,
    //       'Content-Type': 'application/json'
    //     },
    //     body: JSON.stringify({
    //       returnUrl,
    //       authenticationMethod: 'email',
    //       email: signerEmail
    //     })
    //   }
    // );

    return `https://demo.docusign.net/signing/${envelopeId}?email=${signerEmail}&return=${encodeURIComponent(returnUrl)}`;
  }

  static simulateSignature(envelope: DocuSignEnvelope): DocuSignEnvelope {
    const updatedSigners: DocuSignSigner[] = envelope.signers.map(signer => ({
      ...signer,
      status: 'signed',
      signedDate: new Date(),
      ipAddress: '127.0.0.1'
    }));

    return {
      ...envelope,
      status: 'completed',
      signers: updatedSigners,
      completedDate: new Date()
    };
  }

  static getConfigurationInstructions(): string {
    return `
To configure DocuSign integration:

1. Create a DocuSign Developer account at https://developers.docusign.com
2. Create an integration key in the DocuSign Admin console
3. Add the required environment variables to your .env file:
   - VITE_DOCUSIGN_INTEGRATION_KEY
   - VITE_DOCUSIGN_ACCOUNT_ID
   - VITE_DOCUSIGN_REDIRECT_URL

4. Implement OAuth 2.0 authentication flow to get access tokens

See DOCUSIGN_SETUP_GUIDE.md in the project root for detailed instructions.

For now, the system operates in demo mode without actual DocuSign API calls.
    `.trim();
  }
}

