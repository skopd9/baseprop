-- =================================================================
-- Alpha List and Waitlist Tables for Turnkey
-- User access control and waitlist management
-- =================================================================

-- Create Alpha List table for users with immediate access
CREATE TABLE IF NOT EXISTS alpha_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'user',
  granted_access_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  granted_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Drop and recreate waitlist table to ensure correct structure
DROP TABLE IF EXISTS waitlist CASCADE;

-- Create Waitlist table for users waiting for access
CREATE TABLE waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  company TEXT,
  use_case TEXT,
  how_did_you_hear TEXT,
  requested_access_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES auth.users(id),
  rejection_reason TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_alpha_list_email ON alpha_list(email);
CREATE INDEX IF NOT EXISTS idx_waitlist_email ON waitlist(email);
CREATE INDEX IF NOT EXISTS idx_waitlist_status ON waitlist(status);

-- Insert admin user into alpha list
INSERT INTO alpha_list (email, name, role, notes) 
VALUES ('admin@turnkey.com', 'Admin User', 'admin', 'Initial admin user')
ON CONFLICT (email) DO NOTHING;

-- Enable Row Level Security (RLS)
ALTER TABLE alpha_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admin can manage alpha list" ON alpha_list;
DROP POLICY IF EXISTS "Anyone can join waitlist" ON waitlist;
DROP POLICY IF EXISTS "Users can view their own waitlist entry" ON waitlist;
DROP POLICY IF EXISTS "Admin can manage waitlist" ON waitlist;
DROP POLICY IF EXISTS "Allow public read access to alpha list" ON alpha_list;
DROP POLICY IF EXISTS "Allow public insert to waitlist" ON waitlist;

-- RLS Policies for alpha_list - Allow public read access for login checks
CREATE POLICY "Allow public read access to alpha list" ON alpha_list
  FOR SELECT USING (true);

-- Admin management policy for alpha_list
CREATE POLICY "Admin can manage alpha list" ON alpha_list
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM alpha_list 
      WHERE email = auth.jwt() ->> 'email' 
      AND role = 'admin'
    )
  );

-- RLS Policies for waitlist - Allow public insert for signup
CREATE POLICY "Allow public insert to waitlist" ON waitlist
  FOR INSERT WITH CHECK (true);

-- Users can view their own waitlist entry
CREATE POLICY "Users can view their own waitlist entry" ON waitlist
  FOR SELECT USING (
    email = auth.jwt() ->> 'email' OR
    EXISTS (
      SELECT 1 FROM alpha_list 
      WHERE email = auth.jwt() ->> 'email' 
      AND role = 'admin'
    )
  );

-- Admin can manage waitlist
CREATE POLICY "Admin can manage waitlist" ON waitlist
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM alpha_list 
      WHERE email = auth.jwt() ->> 'email' 
      AND role = 'admin'
    )
  );

-- Create function to check if user is in alpha list
CREATE OR REPLACE FUNCTION is_alpha_user(user_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM alpha_list 
    WHERE email = user_email
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to add user to waitlist
CREATE OR REPLACE FUNCTION join_waitlist(
  user_email TEXT,
  user_name TEXT DEFAULT NULL,
  user_company TEXT DEFAULT NULL,
  user_use_case TEXT DEFAULT NULL,
  how_heard TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  waitlist_id UUID;
BEGIN
  INSERT INTO waitlist (email, name, company, use_case, how_did_you_hear)
  VALUES (user_email, user_name, user_company, user_use_case, how_heard)
  ON CONFLICT (email) DO UPDATE SET
    name = COALESCE(EXCLUDED.name, waitlist.name),
    company = COALESCE(EXCLUDED.company, waitlist.company),
    use_case = COALESCE(EXCLUDED.use_case, waitlist.use_case),
    how_did_you_hear = COALESCE(EXCLUDED.how_did_you_hear, waitlist.how_did_you_hear),
    updated_at = NOW()
  RETURNING id INTO waitlist_id;
  
  RETURN waitlist_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =================================================================
-- Alpha List Schema Complete
-- =================================================================
