-- Lab Reports Database Setup
-- Run this SQL in your Supabase SQL Editor to create the required tables

-- Create lab_reports table
CREATE TABLE IF NOT EXISTS lab_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sid_no TEXT NOT NULL,
  branch TEXT,
  patient_id TEXT NOT NULL,
  patient_name TEXT NOT NULL,
  age INTEGER,
  sex TEXT,
  referred_by TEXT,
  collected_date TIMESTAMPTZ,
  received_date TIMESTAMPTZ,
 reported_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,
  doctor_id TEXT
);

-- Create test_sections table
CREATE TABLE IF NOT EXISTS test_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES lab_reports(id) ON DELETE CASCADE,
  section_name TEXT NOT NULL,
  display_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create test_results table
CREATE TABLE IF NOT EXISTS test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID REFERENCES test_sections(id) ON DELETE CASCADE,
  test_name TEXT NOT NULL,
  specimen TEXT,
  result TEXT NOT NULL,
  units TEXT,
  reference_range TEXT,
  method TEXT,
  notes TEXT,
  display_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_lab_reports_doctor_id ON lab_reports(doctor_id);
CREATE INDEX IF NOT EXISTS idx_lab_reports_patient_id ON lab_reports(patient_id);
CREATE INDEX IF NOT EXISTS idx_test_sections_report_id ON test_sections(report_id);
CREATE INDEX IF NOT EXISTS idx_test_results_section_id ON test_results(section_id);

-- 2025-12-11: Add include_header column for Header/Footer toggle feature
ALTER TABLE lab_reports ADD COLUMN IF NOT EXISTS include_header BOOLEAN DEFAULT TRUE;

-- 2025-12-14: Add include_notes column for Clinical Notes toggle feature
ALTER TABLE lab_reports ADD COLUMN IF NOT EXISTS include_notes BOOLEAN DEFAULT TRUE;

-- 2025-12-19: Add "comments" column for Footer Note feature
ALTER TABLE lab_reports ADD COLUMN IF NOT EXISTS comments TEXT;

-- 2025-12-21: Add row_type column for Manual Notes (interstitial text rows)
ALTER TABLE test_results ADD COLUMN IF NOT EXISTS row_type TEXT DEFAULT 'test';

-- 2024-01-03: Add sid_no column to patients table
ALTER TABLE patients ADD COLUMN IF NOT EXISTS sid_no TEXT;

-- 2025-01-19: Add referred_by column to patients table for Doctor Auto-fill
ALTER TABLE patients ADD COLUMN IF NOT EXISTS referred_by TEXT;
