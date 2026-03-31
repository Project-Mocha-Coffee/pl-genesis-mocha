-- TEMPORARY FIX: Disable RLS for testing
-- This will allow emails to be saved immediately
-- Run this in Supabase SQL Editor, test, then re-enable with proper policies

-- Temporarily disable RLS
ALTER TABLE payment_notifications DISABLE ROW LEVEL SECURITY;

-- You can re-enable it later with:
-- ALTER TABLE payment_notifications ENABLE ROW LEVEL SECURITY;

-- After testing, use FIX_SUPABASE_RLS_V2.sql to set up proper policies

