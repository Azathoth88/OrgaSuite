-- Initial schema will be created by Sequelize
-- This file can contain custom functions, triggers, etc.

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_members_email ON members(email);
CREATE INDEX IF NOT EXISTS idx_members_member_number ON members(member_number);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_amount ON transactions(amount);

-- Create a view for member overview
CREATE OR REPLACE VIEW member_overview AS
SELECT 
    m.id,
    m.member_number,
    m.first_name || ' ' || m.last_name as full_name,
    m.email,
    m.status,
    m.joined_at,
    o.name as organization_name,
    COUNT(t.id) as transaction_count,
    COALESCE(SUM(CASE WHEN t.member_id = m.id THEN t.amount ELSE 0 END), 0) as total_transactions
FROM members m
LEFT JOIN organizations o ON m.organization_id = o.id
LEFT JOIN transactions t ON t.member_id = m.id
GROUP BY m.id, o.name;

-- Function to generate next member number
CREATE OR REPLACE FUNCTION generate_member_number(org_id INTEGER)
RETURNS VARCHAR(50) AS $$
DECLARE
    next_num INTEGER;
    result VARCHAR(50);
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(member_number FROM 2) AS INTEGER)), 0) + 1
    INTO next_num
    FROM members 
    WHERE organization_id = org_id 
    AND member_number ~ '^M[0-9]+$';
    
    result := 'M' || LPAD(next_num::TEXT, 3, '0');
    RETURN result;
END;
$$ LANGUAGE plpgsql;