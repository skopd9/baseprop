import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";
import { createClient } from '@supabase/supabase-js';

// Reducto.ai API configuration
const REDUCTO_API_URL = 'https://platform.reducto.ai';

// Supabase configuration for temporary file storage
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const TEMP_BUCKET = 'lease-parsing-temp';

// OpenAI for structured extraction from parsed text
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

// Fields we want to extract from lease documents
const EXTRACTION_FIELDS = {
  tenantName: 'Full legal name of the tenant(s)',
  tenantEmail: 'Email address of the tenant',
  tenantPhone: 'Phone number of the tenant',
  leaseStartDate: 'Start date of the lease (format: YYYY-MM-DD)',
  leaseEndDate: 'End date of the lease (format: YYYY-MM-DD)',
  monthlyRent: 'Monthly rent amount (number only, no currency symbol)',
  depositAmount: 'Security deposit amount (number only)',
  rentDueDay: 'Day of month rent is due (1-28)',
  propertyAddress: 'Full address of the property',
  landlordName: 'Name of the landlord',
  landlordContact: 'Contact info for landlord',
  paymentTerms: 'Payment terms and methods',
  breakClauseDate: 'Break clause date if any (format: YYYY-MM-DD)',
  noticePeriodDays: 'Notice period in days (number)',
  currency: 'Currency code (GBP, EUR, USD, BGN, etc.)',
};

interface ParseRequestBody {
  document: string;
  fileName: string;
  fileType: string;
  language?: 'en' | 'bg' | 'it';
}

interface ReductoParseResponse {
  type?: string;
  chunks?: any[];
  result?: Record<string, any>;
  [key: string]: any;
}

function getConfidenceLevel(score: number): 'high' | 'medium' | 'low' {
  if (score >= 0.8) return 'high';
  if (score >= 0.5) return 'medium';
  return 'low';
}

function buildConfidenceObject(data: Record<string, any>): Record<string, any> {
  const confidence: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (key in EXTRACTION_FIELDS) {
      const score = value !== null && value !== undefined && value !== '' ? 0.75 : 0;
      confidence[key] = {
        field: key,
        confidence: score,
        level: getConfidenceLevel(score),
        rawText: typeof value === 'string' ? value : undefined,
      };
    }
  }
  
  return confidence;
}

// Recursively extract all text from any object structure
function extractAllText(obj: any, depth = 0): string {
  if (depth > 10) return '';
  
  if (typeof obj === 'string') return obj;
  if (typeof obj === 'number') return String(obj);
  if (obj === null || obj === undefined) return '';
  
  if (Array.isArray(obj)) {
    return obj.map(item => extractAllText(item, depth + 1)).filter(Boolean).join('\n');
  }
  
  if (typeof obj === 'object') {
    const textFields = ['content', 'text', 'markdown', 'value', 'data', 'html', 'raw'];
    for (const field of textFields) {
      if (obj[field] && typeof obj[field] === 'string') {
        return obj[field];
      }
    }
    
    const texts: string[] = [];
    for (const [key, value] of Object.entries(obj)) {
      if (['type', 'id', 'index', 'page', 'bbox', 'confidence', 'metadata'].includes(key)) continue;
      const extracted = extractAllText(value, depth + 1);
      if (extracted) texts.push(extracted);
    }
    return texts.join('\n');
  }
  
  return '';
}

function extractTextFromChunks(chunks: any): string {
  if (!chunks) return '';
  return extractAllText(chunks);
}

// Use OpenAI to extract structured data from text
async function extractWithOpenAI(text: string, language: string): Promise<Record<string, any>> {
  if (!OPENAI_API_KEY) {
    console.error('OpenAI API key not configured');
    return {};
  }

  const fieldDescriptions = Object.entries(EXTRACTION_FIELDS)
    .map(([key, desc]) => `- ${key}: ${desc}`)
    .join('\n');

  const languageName = language === 'bg' ? 'Bulgarian' : language === 'it' ? 'Italian' : 'English';
  const prompt = `Extract the following fields from this lease document text. The document may be in ${languageName}.

Return ONLY a valid JSON object with these fields (use null for missing values):
${fieldDescriptions}

Document text:
"""
${text.substring(0, 15000)}
"""

Respond with ONLY the JSON object, no explanation or markdown.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a document parser that extracts structured data from lease agreements. Always respond with valid JSON only.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      console.error('OpenAI API error:', response.status);
      return {};
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || '{}';
    
    let jsonStr = content.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    }
    
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('Error calling OpenAI:', error);
    return {};
  }
}

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const apiKey = process.env.REDUCTO_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false,
        error: 'Lease parsing service is not configured.',
      }),
    };
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false,
        error: 'Storage service is not configured.',
      }),
    };
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  let tempFilePath: string | null = null;

  try {
    const body: ParseRequestBody = JSON.parse(event.body || '{}');
    
    if (!body.document) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          success: false,
          error: 'Document is required',
        }),
      };
    }

    const startTime = Date.now();
    const documentLanguage = body.language || 'en';

    // Step 1: Upload to Supabase Storage temporarily
    const fileBuffer = Buffer.from(body.document, 'base64');
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(7);
    const extension = body.fileName.split('.').pop() || 'pdf';
    tempFilePath = `temp/${timestamp}_${randomId}.${extension}`;
    
    const { error: uploadError } = await supabase.storage
      .from(TEMP_BUCKET)
      .upload(tempFilePath, fileBuffer, {
        contentType: body.fileType || 'application/pdf',
        upsert: true,
      });
    
    if (uploadError) {
      console.error('Storage upload failed:', uploadError.message);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Failed to upload document for processing',
        }),
      };
    }

    // Step 2: Get signed URL
    const { data: urlData, error: urlError } = await supabase.storage
      .from(TEMP_BUCKET)
      .createSignedUrl(tempFilePath, 600);
    
    if (urlError || !urlData?.signedUrl) {
      await supabase.storage.from(TEMP_BUCKET).remove([tempFilePath]);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Failed to generate document URL',
        }),
      };
    }

    // Step 3: Call Reducto.ai /parse endpoint
    const response = await fetch(`${REDUCTO_API_URL}/parse`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ document_url: urlData.signedUrl }),
    });

    // Cleanup temp file
    supabase.storage.from(TEMP_BUCKET).remove([tempFilePath]).catch(() => {});
    tempFilePath = null;

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Reducto API error:', response.status, errorText);
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({
          success: false,
          error: `Document parsing failed: ${response.statusText}`,
        }),
      };
    }

    const reductoResponse: ReductoParseResponse = await response.json();

    // Step 4: Extract text from chunks
    const extractedText = extractTextFromChunks(reductoResponse.chunks || reductoResponse);

    if (!extractedText || extractedText.length < 10) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Could not extract text from document. Please ensure the document is readable.',
        }),
      };
    }

    // Step 5: Use OpenAI to extract structured data
    const extractedData = await extractWithOpenAI(extractedText, documentLanguage);
    const processingTimeMs = Date.now() - startTime;

    // Normalize extracted data
    const normalizedData = {
      tenantName: extractedData.tenantName || null,
      tenantEmail: extractedData.tenantEmail || null,
      tenantPhone: extractedData.tenantPhone || null,
      leaseStartDate: normalizeDate(extractedData.leaseStartDate),
      leaseEndDate: normalizeDate(extractedData.leaseEndDate),
      monthlyRent: parseNumber(extractedData.monthlyRent),
      depositAmount: parseNumber(extractedData.depositAmount),
      rentDueDay: parseNumber(extractedData.rentDueDay),
      propertyAddress: extractedData.propertyAddress || null,
      landlordName: extractedData.landlordName || null,
      landlordContact: extractedData.landlordContact || null,
      paymentTerms: extractedData.paymentTerms || null,
      breakClauseDate: normalizeDate(extractedData.breakClauseDate),
      noticePeriodDays: parseNumber(extractedData.noticePeriodDays),
      currency: extractedData.currency || null,
    };

    const confidence = buildConfidenceObject(normalizedData);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: normalizedData,
        confidence,
        documentLanguage,
        processingTimeMs,
      }),
    };

  } catch (error) {
    console.error('Lease parsing error:', error);
    
    if (tempFilePath) {
      supabase.storage.from(TEMP_BUCKET).remove([tempFilePath]).catch(() => {});
    }
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to parse document. Please try again.',
      }),
    };
  }
};

function normalizeDate(dateValue: any): string | null {
  if (!dateValue) return null;
  
  try {
    if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateValue)) {
      return dateValue.substring(0, 10);
    }
    
    const date = new Date(dateValue);
    if (!isNaN(date.getTime())) {
      return date.toISOString().substring(0, 10);
    }
    
    if (typeof dateValue === 'string') {
      const euroMatch = dateValue.match(/(\d{1,2})[\/\.\-](\d{1,2})[\/\.\-](\d{4})/);
      if (euroMatch) {
        const [, day, month, year] = euroMatch;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
    }
    
    return null;
  } catch {
    return null;
  }
}

function parseNumber(value: any): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return value;
  
  if (typeof value === 'string') {
    const cleaned = value.replace(/[£€$лв,\s]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  }
  
  return null;
}

export { handler };
