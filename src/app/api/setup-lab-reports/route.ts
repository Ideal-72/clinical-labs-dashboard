import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function POST() {
    try {
        // Create lab_reports table
        const { error: reportsError } = await supabase.rpc('exec_sql', {
            sql: `
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
      `
        });

        if (reportsError) throw reportsError;

        // Create test_sections table
        const { error: sectionsError } = await supabase.rpc('exec_sql', {
            sql: `
        CREATE TABLE IF NOT EXISTS test_sections (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          report_id UUID REFERENCES lab_reports(id) ON DELETE CASCADE,
          section_name TEXT NOT NULL,
          display_order INTEGER NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `
        });

        if (sectionsError) throw sectionsError;

        // Create test_results table
        const { error: resultsError } = await supabase.rpc('exec_sql', {
            sql: `
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
      `
        });

        if (resultsError) throw resultsError;

        // Create indexes
        const { error: indexError } = await supabase.rpc('exec_sql', {
            sql: `
        CREATE INDEX IF NOT EXISTS idx_lab_reports_doctor_id ON lab_reports(doctor_id);
        CREATE INDEX IF NOT EXISTS idx_lab_reports_patient_id ON lab_reports(patient_id);
        CREATE INDEX IF NOT EXISTS idx_test_sections_report_id ON test_sections(report_id);
        CREATE INDEX IF NOT EXISTS idx_test_results_section_id ON test_results(section_id);
      `
        });

        if (indexError) throw indexError;

        return NextResponse.json({
            success: true,
            message: 'Lab reports tables created successfully'
        });
    } catch (error: any) {
        console.error('Migration error:', error);
        return NextResponse.json(
            { error: 'Failed to create tables', details: error.message },
            { status: 500 }
        );
    }
}
