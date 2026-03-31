-- ============================================
-- PRODUCTION-READY RLS SETUP
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Re-enable RLS
ALTER TABLE payment_notifications ENABLE ROW LEVEL SECURITY;

-- 2. Drop ALL existing policies (clean slate)
DROP POLICY IF EXISTS "Allow public inserts" ON payment_notifications;
DROP POLICY IF EXISTS "Enable insert for all users" ON payment_notifications;
DROP POLICY IF EXISTS "Allow anon inserts" ON payment_notifications;
DROP POLICY IF EXISTS "Allow authenticated inserts" ON payment_notifications;
DROP POLICY IF EXISTS "Allow authenticated reads" ON payment_notifications;
DROP POLICY IF EXISTS "Allow authenticated updates" ON payment_notifications;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON payment_notifications;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON payment_notifications;

-- 3. Create CORRECT policies for production

-- Allow ANON users to insert (this is what your frontend uses)
CREATE POLICY "anon_insert_policy" 
ON payment_notifications 
FOR INSERT 
TO anon
WITH CHECK (true);

-- Allow AUTHENTICATED users to insert (for admin panel later)
CREATE POLICY "authenticated_insert_policy" 
ON payment_notifications 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Allow AUTHENTICATED users to read (for admin panel)
CREATE POLICY "authenticated_select_policy" 
ON payment_notifications 
FOR SELECT 
TO authenticated
USING (true);

-- Allow AUTHENTICATED users to update (for marking as notified)
CREATE POLICY "authenticated_update_policy" 
ON payment_notifications 
FOR UPDATE 
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow AUTHENTICATED users to delete (for admin cleanup)
CREATE POLICY "authenticated_delete_policy" 
ON payment_notifications 
FOR DELETE 
TO authenticated
USING (true);

-- 4. Verify all policies are active
SELECT 
  schemaname,
  tablename, 
  policyname, 
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'payment_notifications'
ORDER BY policyname;

