import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('sslmode=disable') 
    ? false 
    : { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 20000, // 20s allowance for Neon serverless scale-to-zero compute wakeups
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

export let isConnectedToNeon = false;

// Safe query helper with automatic transient wakeup retry
export async function query<T = any>(text: string, params: any[] = []): Promise<T[]> {
  let attempts = 0;
  while (attempts < 2) {
    attempts++;
    try {
      const client = await pool.connect();
      try {
        const res = await client.query(text, params);
        return res.rows;
      } finally {
        client.release();
      }
    } catch (err: any) {
      const isTransient = err.message?.includes('timeout') || 
                          err.message?.includes('Connection terminated') ||
                          err.code === '57P01' || 
                          err.code === 'ECONNRESET';
      if (isTransient && attempts < 2) {
        console.warn(`[Neon DB] Transient connection/scale-to-zero wakeup notice. Retrying query (attempt ${attempts + 1})...`);
        await new Promise(r => setTimeout(r, 1200));
        continue;
      }
      throw err;
    }
  }
  return [];
}

// Auto-initialize Neon PostgreSQL tables if connected
export async function initDatabase(): Promise<boolean> {
  if (!process.env.DATABASE_URL) {
    console.log('[Database] No DATABASE_URL set. Running in-memory storage mode.');
    isConnectedToNeon = false;
    return false;
  }

  try {
    console.log('[Database] Connecting to Neon PostgreSQL...');
    await query(`
      CREATE TABLE IF NOT EXISTS developer_config (
        id SERIAL PRIMARY KEY,
        is_configured BOOLEAN DEFAULT FALSE,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS tenants (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        admin_name VARCHAR(255) NOT NULL,
        admin_phone VARCHAR(50) NOT NULL,
        admin_email VARCHAR(255) NOT NULL,
        contact_email VARCHAR(255) NOT NULL,
        contact_phone VARCHAR(50) NOT NULL,
        address TEXT,
        license_number VARCHAR(100),
        facility_type VARCHAR(100) DEFAULT 'General Hospital',
        account_status VARCHAR(50) DEFAULT 'pending_setup',
        subscription_plan VARCHAR(100) DEFAULT 'Hospital Pro',
        subscription_status VARCHAR(50) DEFAULT 'trial',
        monthly_fee NUMERIC(12, 2) DEFAULT 397670.00,
        technician_setup_deployed BOOLEAN DEFAULT FALSE,
        technician_deployed_at TIMESTAMP WITH TIME ZONE,
        technician_notes TEXT,
        registered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        last_active_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(64) PRIMARY KEY,
        tenant_id VARCHAR(64) REFERENCES tenants(id) ON DELETE CASCADE,
        tenant_name VARCHAR(255),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL,
        department VARCHAR(100) DEFAULT 'Pharmacy',
        must_change_password BOOLEAN DEFAULT TRUE,
        permissions JSONB,
        avatar_url TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS therapeutic_categories (
        id SERIAL PRIMARY KEY,
        tenant_id VARCHAR(64) REFERENCES tenants(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(tenant_id, name)
      );

      CREATE TABLE IF NOT EXISTS drugs (
        id VARCHAR(64) PRIMARY KEY,
        tenant_id VARCHAR(64) REFERENCES tenants(id) ON DELETE CASCADE,
        brand_name VARCHAR(255) NOT NULL,
        generic_name VARCHAR(255) NOT NULL,
        barcode VARCHAR(100),
        category VARCHAR(100) NOT NULL,
        dosage_form VARCHAR(50) NOT NULL,
        strength VARCHAR(50) NOT NULL,
        manufacturer VARCHAR(255),
        reorder_level INTEGER DEFAULT 30,
        storage_condition VARCHAR(100) DEFAULT 'Room Temp (15-25°C)',
        is_controlled BOOLEAN DEFAULT FALSE,
        total_stock INTEGER DEFAULT 0,
        unit_cost NUMERIC(12, 2) DEFAULT 0,
        unit_price NUMERIC(12, 2) DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS drug_batches (
        id VARCHAR(64) PRIMARY KEY,
        drug_id VARCHAR(64) REFERENCES drugs(id) ON DELETE CASCADE,
        tenant_id VARCHAR(64) REFERENCES tenants(id) ON DELETE CASCADE,
        batch_number VARCHAR(100) NOT NULL,
        quantity INTEGER NOT NULL,
        cost_price NUMERIC(12, 2) NOT NULL,
        selling_price NUMERIC(12, 2) NOT NULL,
        manufacture_date DATE,
        expiry_date DATE NOT NULL,
        supplier VARCHAR(255),
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS dispensation_orders (
        id VARCHAR(64) PRIMARY KEY,
        tenant_id VARCHAR(64) REFERENCES tenants(id) ON DELETE CASCADE,
        order_number VARCHAR(50) NOT NULL UNIQUE,
        patient_name VARCHAR(255) NOT NULL,
        patient_age INTEGER,
        patient_contact VARCHAR(100),
        prescribing_doctor VARCHAR(255),
        prescription_number VARCHAR(100),
        items JSONB NOT NULL,
        subtotal NUMERIC(12, 2) NOT NULL,
        tax NUMERIC(12, 2) DEFAULT 0,
        discount NUMERIC(12, 2) DEFAULT 0,
        total_amount NUMERIC(12, 2) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending_payment',
        payment_method VARCHAR(50),
        created_by VARCHAR(255) NOT NULL,
        created_by_role VARCHAR(50),
        payment_approved_by VARCHAR(255),
        payment_approved_at TIMESTAMP WITH TIME ZONE,
        finalized_by VARCHAR(255),
        finalized_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS dispensation_records (
        id VARCHAR(64) PRIMARY KEY,
        tenant_id VARCHAR(64) REFERENCES tenants(id) ON DELETE CASCADE,
        receipt_number VARCHAR(50) NOT NULL UNIQUE,
        patient_name VARCHAR(255) NOT NULL,
        patient_age INTEGER,
        patient_contact VARCHAR(100),
        prescribing_doctor VARCHAR(255),
        prescription_number VARCHAR(100),
        items JSONB NOT NULL,
        subtotal NUMERIC(12, 2) NOT NULL,
        tax NUMERIC(12, 2) DEFAULT 0,
        discount NUMERIC(12, 2) DEFAULT 0,
        total_amount NUMERIC(12, 2) NOT NULL,
        payment_method VARCHAR(50) NOT NULL,
        dispensed_by VARCHAR(255) NOT NULL,
        dispensed_by_role VARCHAR(50),
        payment_approved_by VARCHAR(255),
        status VARCHAR(50) DEFAULT 'completed',
        void_reason TEXT,
        voided_at TIMESTAMP WITH TIME ZONE,
        dispensed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS drug_registration_logs (
        id VARCHAR(64) PRIMARY KEY,
        tenant_id VARCHAR(64) REFERENCES tenants(id) ON DELETE CASCADE,
        drug_id VARCHAR(64) REFERENCES drugs(id) ON DELETE CASCADE,
        brand_name VARCHAR(255) NOT NULL,
        generic_name VARCHAR(255) NOT NULL,
        batch_number VARCHAR(100) NOT NULL,
        quantity_added INTEGER NOT NULL,
        cost_price NUMERIC(12, 2) NOT NULL,
        selling_price NUMERIC(12, 2) NOT NULL,
        expiry_date DATE NOT NULL,
        supplier VARCHAR(255),
        registered_by VARCHAR(255) NOT NULL,
        registered_by_role VARCHAR(50),
        reason VARCHAR(100) NOT NULL,
        notes TEXT,
        registered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS support_tickets (
        id VARCHAR(50) PRIMARY KEY,
        tenant_id VARCHAR(64),
        tenant_name VARCHAR(255) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        category VARCHAR(100) NOT NULL,
        priority VARCHAR(50) DEFAULT 'medium',
        status VARCHAR(50) DEFAULT 'open',
        submitted_by VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Automatic Schema Migration: Ensure all existing tables have tenant_id and latest columns
      ALTER TABLE drugs ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(64);
      ALTER TABLE drugs ADD COLUMN IF NOT EXISTS brand_name VARCHAR(255);
      ALTER TABLE drugs ADD COLUMN IF NOT EXISTS generic_name VARCHAR(255);
      ALTER TABLE drugs ADD COLUMN IF NOT EXISTS barcode VARCHAR(100);
      ALTER TABLE drugs ADD COLUMN IF NOT EXISTS category VARCHAR(100);
      ALTER TABLE drugs ADD COLUMN IF NOT EXISTS dosage_form VARCHAR(50);
      ALTER TABLE drugs ADD COLUMN IF NOT EXISTS strength VARCHAR(50);
      ALTER TABLE drugs ADD COLUMN IF NOT EXISTS manufacturer VARCHAR(255);
      ALTER TABLE drugs ADD COLUMN IF NOT EXISTS reorder_level INTEGER DEFAULT 30;
      ALTER TABLE drugs ADD COLUMN IF NOT EXISTS storage_condition VARCHAR(100) DEFAULT 'Room Temp (15-25°C)';
      ALTER TABLE drugs ADD COLUMN IF NOT EXISTS is_controlled BOOLEAN DEFAULT FALSE;
      ALTER TABLE drugs ADD COLUMN IF NOT EXISTS total_stock INTEGER DEFAULT 0;
      ALTER TABLE drugs ADD COLUMN IF NOT EXISTS unit_cost NUMERIC(12, 2) DEFAULT 0;
      ALTER TABLE drugs ADD COLUMN IF NOT EXISTS unit_price NUMERIC(12, 2) DEFAULT 0;
      ALTER TABLE drugs ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
      ALTER TABLE drugs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

      ALTER TABLE drug_batches ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(64);
      ALTER TABLE drug_batches ADD COLUMN IF NOT EXISTS drug_id VARCHAR(64);
      ALTER TABLE drug_batches ADD COLUMN IF NOT EXISTS batch_number VARCHAR(100);
      ALTER TABLE drug_batches ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 0;
      ALTER TABLE drug_batches ADD COLUMN IF NOT EXISTS cost_price NUMERIC(12, 2) DEFAULT 0;
      ALTER TABLE drug_batches ADD COLUMN IF NOT EXISTS selling_price NUMERIC(12, 2) DEFAULT 0;
      ALTER TABLE drug_batches ADD COLUMN IF NOT EXISTS manufacture_date DATE;
      ALTER TABLE drug_batches ADD COLUMN IF NOT EXISTS expiry_date DATE;
      ALTER TABLE drug_batches ADD COLUMN IF NOT EXISTS supplier VARCHAR(255);
      ALTER TABLE drug_batches ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';
      ALTER TABLE drug_batches ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

      ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(64);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_name VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT TRUE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions JSONB;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(100) DEFAULT 'Pharmacy';

      ALTER TABLE tenants ADD COLUMN IF NOT EXISTS technician_setup_deployed BOOLEAN DEFAULT FALSE;
      ALTER TABLE tenants ADD COLUMN IF NOT EXISTS technician_deployed_at TIMESTAMP WITH TIME ZONE;
      ALTER TABLE tenants ADD COLUMN IF NOT EXISTS technician_notes TEXT;
      ALTER TABLE tenants ADD COLUMN IF NOT EXISTS account_status VARCHAR(50) DEFAULT 'pending_setup';
      ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(100) DEFAULT 'Hospital Pro';
      ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'trial';
      ALTER TABLE tenants ADD COLUMN IF NOT EXISTS monthly_fee NUMERIC(12, 2) DEFAULT 397670.00;

      ALTER TABLE dispensation_orders ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(64);
      ALTER TABLE dispensation_orders ADD COLUMN IF NOT EXISTS order_number VARCHAR(50);
      ALTER TABLE dispensation_orders ADD COLUMN IF NOT EXISTS patient_name VARCHAR(255);
      ALTER TABLE dispensation_orders ADD COLUMN IF NOT EXISTS patient_age INTEGER;
      ALTER TABLE dispensation_orders ADD COLUMN IF NOT EXISTS patient_contact VARCHAR(100);
      ALTER TABLE dispensation_orders ADD COLUMN IF NOT EXISTS prescribing_doctor VARCHAR(255);
      ALTER TABLE dispensation_orders ADD COLUMN IF NOT EXISTS prescription_number VARCHAR(100);
      ALTER TABLE dispensation_orders ADD COLUMN IF NOT EXISTS items JSONB;
      ALTER TABLE dispensation_orders ADD COLUMN IF NOT EXISTS subtotal NUMERIC(12, 2);
      ALTER TABLE dispensation_orders ADD COLUMN IF NOT EXISTS tax NUMERIC(12, 2) DEFAULT 0;
      ALTER TABLE dispensation_orders ADD COLUMN IF NOT EXISTS discount NUMERIC(12, 2) DEFAULT 0;
      ALTER TABLE dispensation_orders ADD COLUMN IF NOT EXISTS total_amount NUMERIC(12, 2);
      ALTER TABLE dispensation_orders ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending_payment';
      ALTER TABLE dispensation_orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);
      ALTER TABLE dispensation_orders ADD COLUMN IF NOT EXISTS created_by VARCHAR(255);
      ALTER TABLE dispensation_orders ADD COLUMN IF NOT EXISTS created_by_role VARCHAR(50);
      ALTER TABLE dispensation_orders ADD COLUMN IF NOT EXISTS payment_approved_by VARCHAR(255);
      ALTER TABLE dispensation_orders ADD COLUMN IF NOT EXISTS payment_approved_at TIMESTAMP WITH TIME ZONE;
      ALTER TABLE dispensation_orders ADD COLUMN IF NOT EXISTS finalized_by VARCHAR(255);
      ALTER TABLE dispensation_orders ADD COLUMN IF NOT EXISTS finalized_at TIMESTAMP WITH TIME ZONE;
      ALTER TABLE dispensation_orders ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

      ALTER TABLE dispensation_records ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(64);
      ALTER TABLE dispensation_records ADD COLUMN IF NOT EXISTS receipt_number VARCHAR(50);
      ALTER TABLE dispensation_records ADD COLUMN IF NOT EXISTS patient_name VARCHAR(255);
      ALTER TABLE dispensation_records ADD COLUMN IF NOT EXISTS patient_age INTEGER;
      ALTER TABLE dispensation_records ADD COLUMN IF NOT EXISTS patient_contact VARCHAR(100);
      ALTER TABLE dispensation_records ADD COLUMN IF NOT EXISTS prescribing_doctor VARCHAR(255);
      ALTER TABLE dispensation_records ADD COLUMN IF NOT EXISTS prescription_number VARCHAR(100);
      ALTER TABLE dispensation_records ADD COLUMN IF NOT EXISTS items JSONB;
      ALTER TABLE dispensation_records ADD COLUMN IF NOT EXISTS subtotal NUMERIC(12, 2);
      ALTER TABLE dispensation_records ADD COLUMN IF NOT EXISTS tax NUMERIC(12, 2) DEFAULT 0;
      ALTER TABLE dispensation_records ADD COLUMN IF NOT EXISTS discount NUMERIC(12, 2) DEFAULT 0;
      ALTER TABLE dispensation_records ADD COLUMN IF NOT EXISTS total_amount NUMERIC(12, 2);
      ALTER TABLE dispensation_records ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);
      ALTER TABLE dispensation_records ADD COLUMN IF NOT EXISTS dispensed_by VARCHAR(255);
      ALTER TABLE dispensation_records ADD COLUMN IF NOT EXISTS dispensed_by_role VARCHAR(50);
      ALTER TABLE dispensation_records ADD COLUMN IF NOT EXISTS payment_approved_by VARCHAR(255);
      ALTER TABLE dispensation_records ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'completed';
      ALTER TABLE dispensation_records ADD COLUMN IF NOT EXISTS void_reason TEXT;
      ALTER TABLE dispensation_records ADD COLUMN IF NOT EXISTS voided_at TIMESTAMP WITH TIME ZONE;
      ALTER TABLE dispensation_records ADD COLUMN IF NOT EXISTS dispensed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

      ALTER TABLE drug_registration_logs ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(64);
      ALTER TABLE drug_registration_logs ADD COLUMN IF NOT EXISTS drug_id VARCHAR(64);
      ALTER TABLE drug_registration_logs ADD COLUMN IF NOT EXISTS brand_name VARCHAR(255);
      ALTER TABLE drug_registration_logs ADD COLUMN IF NOT EXISTS generic_name VARCHAR(255);
      ALTER TABLE drug_registration_logs ADD COLUMN IF NOT EXISTS batch_number VARCHAR(100);
      ALTER TABLE drug_registration_logs ADD COLUMN IF NOT EXISTS quantity_added INTEGER;
      ALTER TABLE drug_registration_logs ADD COLUMN IF NOT EXISTS cost_price NUMERIC(12, 2);
      ALTER TABLE drug_registration_logs ADD COLUMN IF NOT EXISTS selling_price NUMERIC(12, 2);
      ALTER TABLE drug_registration_logs ADD COLUMN IF NOT EXISTS expiry_date DATE;
      ALTER TABLE drug_registration_logs ADD COLUMN IF NOT EXISTS supplier VARCHAR(255);
      ALTER TABLE drug_registration_logs ADD COLUMN IF NOT EXISTS registered_by VARCHAR(255);
      ALTER TABLE drug_registration_logs ADD COLUMN IF NOT EXISTS registered_by_role VARCHAR(50);
      ALTER TABLE drug_registration_logs ADD COLUMN IF NOT EXISTS reason VARCHAR(100);
      ALTER TABLE drug_registration_logs ADD COLUMN IF NOT EXISTS notes TEXT;
      ALTER TABLE drug_registration_logs ADD COLUMN IF NOT EXISTS registered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

      ALTER TABLE therapeutic_categories ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(64);
      ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(64);
      ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS tenant_name VARCHAR(255);

      -- Automatic Schema Migration: Developer Config (ensuring password, email, and config flag exist)
      CREATE TABLE IF NOT EXISTS developer_config (
        id SERIAL PRIMARY KEY,
        is_configured BOOLEAN DEFAULT FALSE,
        email VARCHAR(255),
        password VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      ALTER TABLE developer_config ADD COLUMN IF NOT EXISTS password VARCHAR(255);
      ALTER TABLE developer_config ADD COLUMN IF NOT EXISTS email VARCHAR(255);
      ALTER TABLE developer_config ADD COLUMN IF NOT EXISTS is_configured BOOLEAN DEFAULT FALSE;
      ALTER TABLE developer_config ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    `);
    console.log('[Database] Neon PostgreSQL initialized successfully. Tables and schema columns migrated.');
    isConnectedToNeon = true;
    return true;
  } catch (err) {
    console.warn('[Database] Neon PostgreSQL connection error. Running in memory fallback:', err);
    isConnectedToNeon = false;
    return false;
  }
}
