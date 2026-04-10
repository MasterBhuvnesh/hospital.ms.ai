-- ──────────────────────────────────────────────────────
-- HMS — PostgreSQL Database Initialization
-- ──────────────────────────────────────────────────────
-- This script runs automatically on first PostgreSQL start.
-- It creates one database per service (database-per-service pattern).
-- The default database (hms_identity) is created by POSTGRES_DB env var.
--
-- To re-run: docker compose -f docker-compose.db.yml down -v
--            docker compose -f docker-compose.db.yml up -d postgres
-- ──────────────────────────────────────────────────────

-- Service databases (hms_identity already created by default)
CREATE DATABASE hms_doctor;
CREATE DATABASE hms_hospital;
CREATE DATABASE hms_appointment;
CREATE DATABASE hms_queue;
CREATE DATABASE hms_patient_records;
CREATE DATABASE hms_consultation;
CREATE DATABASE hms_prescription;
CREATE DATABASE hms_lab_test;
CREATE DATABASE hms_lab_result;
CREATE DATABASE hms_pharmacy;
CREATE DATABASE hms_inventory;
CREATE DATABASE hms_billing;
CREATE DATABASE hms_patient_sheet;
CREATE DATABASE hms_analytics;
CREATE DATABASE hms_calling;

-- ──────────────────────────────────────────────────────
-- Enable useful extensions on all databases
-- ──────────────────────────────────────────────────────

-- uuid-ossp: Generate UUIDs for primary keys
-- pgcrypto:  Password hashing, encryption functions

\c hms_identity
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

\c hms_doctor
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\c hms_hospital
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\c hms_appointment
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\c hms_queue
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\c hms_patient_records
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\c hms_consultation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\c hms_prescription
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\c hms_lab_test
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\c hms_lab_result
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\c hms_pharmacy
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\c hms_inventory
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\c hms_billing
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

\c hms_patient_sheet
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\c hms_analytics
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\c hms_calling
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
