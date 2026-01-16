import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

/**
 * Netlify Function: Check if User Exists
 * 
 * This function checks if a user account exists for a given email address.
 * Used to determine whether to show login prompt or signup flow for invitations.
 */

const handler: Handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Parse request body
    const { email } = JSON.parse(event.body || '{}');

    if (!email) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: 'Missing required field: email' 
        })
      };
    }

    // Initialize Supabase Admin Client (with service role key)
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase configuration');
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Server configuration error' })
      };
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Check if user exists by listing users and filtering by email
    const { data, error } = await supabaseAdmin.auth.admin.listUsers();

    if (error) {
      console.error('Error listing users:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to check user existence' })
      };
    }

    // Check if any user has this email
    const exists = data?.users?.some(u => u.email?.toLowerCase() === email.toLowerCase()) || false;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ exists })
    };

  } catch (error: any) {
    console.error('Error in check-user-exists function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      })
    };
  }
};

export { handler };

