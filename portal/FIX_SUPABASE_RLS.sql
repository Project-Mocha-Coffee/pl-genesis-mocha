-- Fix Row Level Security for payment_notifications table
-- Run this in Supabase SQL Editor

-- First, drop existing policies
DROP POLICY IF EXISTS "Allow public inserts" ON payment_notifications;
DROP POLICY IF EXISTS "Allow authenticated reads" ON payment_notifications;
DROP POLICY IF EXISTS "Allow authenticated updates" ON payment_notifications;

-- Create new, more permissive policy for inserts
CREATE POLICY "Enable insert for all users" 
ON payment_notifications 
FOR INSERT 
TO public
WITH CHECK (true);

-- Policy for reads (only authenticated users)
CREATE POLICY "Enable read for authenticated users" 
ON payment_notifications 
FOR SELECT 
TO authenticated
USING (true);

-- Policy for updates (only authenticated users)
CREATE POLICY "Enable update for authenticated users" 
ON payment_notifications 
FOR UPDATE 
TO authenticated
USING (true)
WITH CHECK (true);

-- Verify RLS is enabled
ALTER TABLE payment_notifications ENABLE ROW LEVEL SECURITY;

-- Check the policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'payment_notifications';

