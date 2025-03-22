-- Database setup script to ensure required extensions are available
-- This should be run before other migrations

-- Enable UUID extension for uuid_generate_v4()
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create the exec_sql function if it doesn't exist
-- This allows executing SQL from the Node.js client
CREATE OR REPLACE FUNCTION exec_sql(query text) 
RETURNS VOID AS $$
BEGIN
  EXECUTE query;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;