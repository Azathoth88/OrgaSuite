-- Simplified init.sql for OrgaSuite
-- Tables will be created by Sequelize, we only add extensions and functions here

-- Enable UUID extension (for future use)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable full-text search (for future search features)
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Function to generate next member number (will work after tables are created)
CREATE OR REPLACE FUNCTION generate_member_number(org_id INTEGER)
RETURNS VARCHAR(50) AS $$
DECLARE
    next_num INTEGER;
    result VARCHAR(50);
BEGIN
    -- Only execute if members table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'members') THEN
        SELECT COALESCE(MAX(CAST(SUBSTRING(member_number FROM 2) AS INTEGER)), 0) + 1
        INTO next_num
        FROM members 
        WHERE organization_id = org_id 
        AND member_number ~ '^M[0-9]+$';
        
        result := 'M' || LPAD(next_num::TEXT, 3, '0');
        RETURN result;
    ELSE
        RETURN 'M001';
    END IF;
END;
$$ LANGUAGE plpgsql;