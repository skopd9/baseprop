import {
  LeaseParseRequest,
  LeaseParseResponse,
  ParsedLeaseData,
  SupportedLanguage,
  TenantFormMapping,
} from '../types/leaseParsing';

const PARSE_ENDPOINT = '/.netlify/functions/parse-lease-document';

export class LeaseParserService {
  /**
   * Convert a File to base64 string
   */
  static async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data URL prefix (e.g., "data:application/pdf;base64,")
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = (error) => reject(error);
    });
  }

  /**
   * Parse a lease document using Reducto.ai
   */
  static async parseLeaseDocument(
    file: File,
    language?: SupportedLanguage
  ): Promise<LeaseParseResponse> {
    try {
      // Convert file to base64
      const base64Document = await this.fileToBase64(file);

      const request: LeaseParseRequest = {
        document: base64Document,
        fileName: file.name,
        fileType: file.type,
        language,
      };

      const response = await fetch(PARSE_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const responseData = await response.json().catch(() => ({}));
      
      if (!response.ok) {
        throw new Error(responseData.error || `Failed to parse document: ${response.statusText}`);
      }

      return responseData;
    } catch (error) {
      console.error('Error parsing lease document:', error);
      throw error;
    }
  }

  /**
   * Validate file before parsing
   */
  static validateFile(file: File): { valid: boolean; error?: string } {
    const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
    const ALLOWED_TYPES = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/tiff',
      'image/webp',
    ];

    if (!file) {
      return { valid: false, error: 'No file provided' };
    }

    if (file.size > MAX_FILE_SIZE) {
      return { valid: false, error: 'File size must be less than 20MB' };
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return {
        valid: false,
        error: 'File type not supported. Please upload a PDF or image file.',
      };
    }

    return { valid: true };
  }

  /**
   * Map parsed lease data to tenant form fields
   */
  static mapToTenantForm(data: ParsedLeaseData): Partial<TenantFormMapping> {
    const mapping: Partial<TenantFormMapping> = {};

    // Split tenant name into first and last name
    if (data.tenantName) {
      const nameParts = data.tenantName.trim().split(/\s+/);
      if (nameParts.length >= 2) {
        mapping.firstName = nameParts[0];
        mapping.surname = nameParts.slice(1).join(' ');
      } else {
        mapping.firstName = data.tenantName;
        mapping.surname = '';
      }
    }

    if (data.tenantEmail) {
      mapping.email = data.tenantEmail;
    }

    if (data.tenantPhone) {
      mapping.phone = data.tenantPhone;
    }

    if (data.leaseStartDate) {
      mapping.leaseStartDate = data.leaseStartDate;
    }

    if (data.leaseEndDate) {
      mapping.leaseEndDate = data.leaseEndDate;
    }

    if (data.monthlyRent !== undefined) {
      mapping.monthlyRent = String(data.monthlyRent);
    }

    if (data.depositAmount !== undefined) {
      mapping.depositAmount = String(data.depositAmount);
    }

    if (data.rentDueDay !== undefined) {
      mapping.rentDueDay = data.rentDueDay;
    }

    return mapping;
  }

  /**
   * Get display name for a field
   */
  static getFieldDisplayName(fieldName: keyof ParsedLeaseData): string {
    const displayNames: Record<keyof ParsedLeaseData, string> = {
      tenantName: 'Tenant Name',
      tenantEmail: 'Email Address',
      tenantPhone: 'Phone Number',
      leaseStartDate: 'Lease Start Date',
      leaseEndDate: 'Lease End Date',
      monthlyRent: 'Monthly Rent',
      depositAmount: 'Deposit Amount',
      rentDueDay: 'Rent Due Day',
      currency: 'Currency',
      propertyAddress: 'Property Address',
      landlordName: 'Landlord Name',
      landlordContact: 'Landlord Contact',
      paymentTerms: 'Payment Terms',
      breakClauseDate: 'Break Clause Date',
      noticePeriodDays: 'Notice Period (Days)',
    };

    return displayNames[fieldName] || fieldName;
  }

  /**
   * Format a field value for display
   */
  static formatFieldValue(
    fieldName: keyof ParsedLeaseData,
    value: any,
    currency?: string
  ): string {
    if (value === null || value === undefined || value === '') {
      return '—';
    }

    // Format dates
    if (fieldName.includes('Date')) {
      try {
        const date = new Date(value);
        return date.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });
      } catch {
        return String(value);
      }
    }

    // Format currency values
    if (fieldName === 'monthlyRent' || fieldName === 'depositAmount') {
      const currencySymbol = this.getCurrencySymbol(currency);
      return `${currencySymbol}${Number(value).toLocaleString()}`;
    }

    // Format rent due day
    if (fieldName === 'rentDueDay') {
      const day = Number(value);
      const suffix = this.getOrdinalSuffix(day);
      return `${day}${suffix} of the month`;
    }

    // Format notice period
    if (fieldName === 'noticePeriodDays') {
      const days = Number(value);
      return days === 1 ? '1 day' : `${days} days`;
    }

    return String(value);
  }

  /**
   * Get currency symbol from code
   */
  private static getCurrencySymbol(currencyCode?: string): string {
    const symbols: Record<string, string> = {
      GBP: '£',
      EUR: '€',
      USD: '$',
      BGN: 'лв',
    };
    return symbols[currencyCode || 'GBP'] || currencyCode || '£';
  }

  /**
   * Get ordinal suffix for a number
   */
  private static getOrdinalSuffix(n: number): string {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
  }

  /**
   * Get language display name
   */
  static getLanguageDisplayName(code: SupportedLanguage): string {
    const names: Record<SupportedLanguage, string> = {
      en: 'English',
      bg: 'Bulgarian',
      it: 'Italian',
    };
    return names[code] || code;
  }

  /**
   * Detect likely language from filename or user preference
   */
  static detectLanguageFromFilename(filename: string): SupportedLanguage | undefined {
    const lowerName = filename.toLowerCase();
    
    if (lowerName.includes('bg') || lowerName.includes('bulgarian') || lowerName.includes('българия')) {
      return 'bg';
    }
    if (lowerName.includes('it') || lowerName.includes('italian') || lowerName.includes('italiano')) {
      return 'it';
    }
    if (lowerName.includes('en') || lowerName.includes('english')) {
      return 'en';
    }
    
    return undefined;
  }
}
