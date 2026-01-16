import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

/**
 * Netlify Function: Accept Invitation Signup
 * 
 * This function creates a new user account for someone accepting an organization invitation.
 * It uses the Supabase Admin API to create the user with email pre-confirmed,
 * so they don't need to click a confirmation email link.
 * 
 * Security: Only works for valid invitation tokens
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
    const { email, name, invitationToken } = JSON.parse(event.body || '{}');

    if (!email || !name || !invitationToken) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: 'Missing required fields: email, name, and invitationToken are required' 
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

    // Step 1: Verify the invitation token is valid
    const { data: invitation, error: inviteError } = await supabaseAdmin
      .from('organization_invitations')
      .select('*')
      .eq('token', invitationToken)
      .eq('status', 'pending')
      .eq('email', email)
      .single();

    if (inviteError || !invitation) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: 'Invalid or expired invitation token' 
        })
      };
    }

    // Step 2: Check if user already exists
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
    const userExists = existingUser.users.some(u => u.email === email);

    if (userExists) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: 'User already exists. Please log in instead.',
          userExists: true
        })
      };
    }

    // Step 3: Create user with email pre-confirmed
    // Generate a random password (user will use magic links to login later)
    const randomPassword = Math.random().toString(36).slice(-20) + Math.random().toString(36).slice(-20);

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: randomPassword,
      email_confirm: true, // Skip email confirmation!
      user_metadata: {
        full_name: name,
        joined_via_invitation: true,
        invitation_token: invitationToken
      }
    });

    if (createError || !newUser.user) {
      console.error('Error creating user:', createError);
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          error: 'Failed to create user account',
          details: createError?.message 
        })
      };
    }

    // Step 4: Create a session for the new user
    // We'll use signInWithPassword since we just created the account
    const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password: randomPassword
    });

    if (sessionError || !sessionData.session) {
      console.error('Error creating session:', sessionError);
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          error: 'Account created but failed to generate session',
          userId: newUser.user.id
        })
      };
    }

    // Step 5: Return success with session data
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        user: {
          id: newUser.user.id,
          email: newUser.user.email,
          full_name: name
        },
        session: {
          access_token: sessionData.session.access_token,
          refresh_token: sessionData.session.refresh_token,
          expires_at: sessionData.session.expires_at,
          expires_in: sessionData.session.expires_in
        }
      })
    };

  } catch (error: any) {
    console.error('Unexpected error in accept-invitation-signup:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'An unexpected error occurred',
        message: error.message 
      })
    };
  }
};

export { handler };

