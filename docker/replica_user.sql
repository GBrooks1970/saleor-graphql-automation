-- Create read-only role for direct DB assertions if required
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'saleor_read') THEN
    CREATE ROLE saleor_read WITH LOGIN PASSWORD 'saleor_read';
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO saleor_read;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO saleor_read;
