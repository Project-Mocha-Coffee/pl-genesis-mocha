-- CORRECT FIX for Row Level Security
-- The anon key uses the 'anon' role, not 'public' role
-- Run this in Supabase SQL Editor

-- First, completely drop ALL existing policies
DROP POLICY IF EXISTS "Allow public inserts" ON payment_notifications;
DROP POLICY IF EXISTS "Enable insert for all users" ON payment_notifications;
DROP POLICY IF EXISTS "Allow authenticated reads" ON payment_notifications;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON payment_notifications;
DROP POLICY IF EXISTS "Allow authenticated updates" ON payment_notifications;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON payment_notifications;

-- Create policy for ANON inserts (this is what the anon key uses)
CREATE POLICY "Allow anon inserts" 
ON payment_notifications 
FOR INSERT 
TO anon
WITH CHECK (true);

-- Also allow authenticated users to insert
CREATE POLICY "Allow authenticated inserts" 
ON payment_notifications 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Policy for reads (authenticated users only)
CREATE POLICY "Allow authenticated reads" 
ON payment_notifications 
FOR SELECT 
TO authenticated
USING (true);

-- Policy for updates (authenticated users only)
CREATE POLICY "Allow authenticated updates" 
ON payment_notifications 
FOR UPDATE 
TO authenticated
USING (true)
WITH CHECK (true);

-- Ensure RLS is enabled
ALTER TABLE payment_notifications ENABLE ROW LEVEL SECURITY;

-- Verify policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'payment_notifications';

