import { supabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/lab-reports - List all reports for a doctor
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const doctorId = searchParams.get('doctorId');

        if (!doctorId) {
            return NextResponse.json(
                { error: 'Doctor ID is required' },
                { status: 400 }
            );
        }

        const { data, error } = await supabase
            .from('lab_reports')
            .select('*')
            .eq('doctor_id', doctorId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return NextResponse.json({ reports: data });
    } catch (error: any) {
        console.error('Error fetching reports:', error);
        return NextResponse.json(
            { error: 'Failed to fetch reports', details: error.message },
            { status: 500 }
        );
    }
}

// POST /api/lab-reports - Create a new report
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { patientDetails, sections, doctorId } = body;

        // Validate required fields
        if (!patientDetails || !doctorId) {
            return NextResponse.json(
                { error: 'Patient details and doctor ID are required' },
                { status: 400 }
            );
        }

        // Insert lab report
        const { data: reportData, error: reportError } = await supabase
            .from('lab_reports')
            .insert({
                sid_no: patientDetails.sidNo,
                branch: patientDetails.branch,
                patient_id: patientDetails.patientId,
                patient_name: patientDetails.patientName,
                age: patientDetails.age,
                sex: patientDetails.sex,
                referred_by: patientDetails.referredBy,
                collected_date: patientDetails.collectedDate,
                received_date: patientDetails.receivedDate,
                reported_date: patientDetails.reportedDate || new Date().toISOString(),
                doctor_id: doctorId,
                created_by: doctorId,
            })
            .select()
            .single();

        if (reportError) throw reportError;

        // Insert sections and tests
        if (sections && sections.length > 0) {
            for (let i = 0; i < sections.length; i++) {
                const section = sections[i];

                const { data: sectionData, error: sectionError } = await supabase
                    .from('test_sections')
                    .insert({
                        report_id: reportData.id,
                        section_name: section.name,
                        display_order: i,
                    })
                    .select()
                    .single();

                if (sectionError) throw sectionError;

                // Insert tests for this section
                if (section.tests && section.tests.length > 0) {
                    const testInserts = section.tests.map((test: any, testIndex: number) => ({
                        section_id: sectionData.id,
                        test_name: test.testName,
                        specimen: test.specimen,
                        result: test.result,
                        units: test.units,
                        reference_range: test.referenceRange,
                        method: test.method,
                        notes: test.notes,
                        display_order: testIndex,
                    }));

                    const { error: testsError } = await supabase
                        .from('test_results')
                        .insert(testInserts);

                    if (testsError) throw testsError;
                }
            }
        }

        return NextResponse.json({
            success: true,
            report: reportData,
            message: 'Report created successfully',
        });
    } catch (error: any) {
        console.error('Error creating report:', error);
        return NextResponse.json(
            { error: 'Failed to create report', details: error.message },
            { status: 500 }
        );
    }
}
