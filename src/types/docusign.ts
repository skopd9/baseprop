export interface DocuSignConfig {
  integrationKey: string;
  accountId: string;
  redirectUrl: string;
  baseUrl: string;
}

export interface DocuSignEnvelope {
  envelopeId: string;
  status: 'created' | 'sent' | 'delivered' | 'signed' | 'completed' | 'declined' | 'voided';
  documentName: string;
  signers: DocuSignSigner[];
  createdDate: Date;
  sentDate?: Date;
  completedDate?: Date;
  viewUrl?: string;
}

export interface DocuSignSigner {
  email: string;
  name: string;
  recipientId: string;
  status: 'created' | 'sent' | 'delivered' | 'signed' | 'declined';
  signedDate?: Date;
  ipAddress?: string;
}

export interface DocuSignDocument {
  documentId: string;
  name: string;
  fileExtension: string;
  documentBase64?: string;
  order?: number;
}

export interface CreateEnvelopeRequest {
  documentName: string;
  documentContent: string; // Base64 encoded
  signers: {
    name: string;
    email: string;
    routingOrder: number;
  }[];
  emailSubject: string;
  emailBlurb?: string;
}

