import { supabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/lab-reports - List all reports for a doctor
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const doctorId = searchParams.get('doctorId');
        const date = searchParams.get('date');
        const patientId = searchParams.get('patientId');
        const search = searchParams.get('search'); // New search parameter
        const patient_id = searchParams.get('patient_id'); // Handle both cases just in case

        if (!doctorId) {
            return NextResponse.json(
                { error: 'Doctor ID is required' },
                { status: 400 }
            );
        }

        let query = supabase
            .from('lab_reports')
            .select('*')
            .eq('doctor_id', doctorId)
            .order('created_at', { ascending: false });

        // If search is present, prioritize search over specific filters
        if (search) {
            // Search across multiple columns using 'or'
            // Note: 'ilike' is for case-insensitive pattern matching.
            // We cast patient_id to text if needed, but Supabase might handle it.
            // Assuming patient_name and sid_no are text.
            const searchTerm = `%${search}%`;
            query = query.or(`patient_name.ilike.${searchTerm},sid_no.ilike.${searchTerm},patient_id.ilike.${searchTerm}`);
        } else {
            // Apply standard filters if no search (or combine them, but typically search overrides)
            if (date) {
                // Check if date string is valid YYYY-MM-DD
                if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                    // Filter from start of day (00:00:00) to end of day (23:59:59.999)
                    // Assuming date stored in DB is ISO string or timestamp
                    const startOfDay = `${date}T00:00:00.000Z`; // Adjust timezone logic if needed, currently assumes UTC storage matching date input
                    const endOfDay = `${date}T23:59:59.999Z`;

                    // Actually, simpler to just match the day part if using Postgres date casting, 
                    // but using range is safer for timestamptz.
                    // We'll broaden the selection to ensure we catch local time shifts if necessary,
                    // but strict range on the input date string is standard.
                    query = query.gte('reported_date', `${date}T00:00:00`).lt('reported_date', `${date}T23:59:59.999`);
                }
            }

            const pId = patientId || patient_id;
            if (pId) {
                query = query.eq('patient_id', pId);
            }
        }

        const { data, error } = await query;

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
        // Try to insert with include_header
        let reportData, reportError;

        try {
            const result = await supabase
                .from('lab_reports')
                .insert({
                    sid_no: patientDetails.sidNo || patientDetails.patientId,
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
                    include_header: patientDetails.includeHeader ?? true,
                    include_notes: patientDetails.includeNotes ?? true,
                    comments: patientDetails.comments,
                })
                .select()
                .single();

            reportData = result.data;
            reportError = result.error;

            if (reportError && (
                reportError.message.includes('include_header') ||
                reportError.message.includes('include_notes') ||
                reportError.message.includes('comments') ||
                reportError.message.includes('schema cache')
            )) {
                throw reportError; // Throw to catch block for retry
            }
        } catch (err) {
            // Fallback: Try insertion WITHOUT optional columns if they don't exist
            console.warn('Failed to insert with optional columns, retrying without them...', err);
            const fallbackResult = await supabase
                .from('lab_reports')
                .insert({
                    sid_no: patientDetails.sidNo || patientDetails.patientId,
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
                    // optional columns omitted
                })
                .select()
                .single();

            reportData = fallbackResult.data;
            reportError = fallbackResult.error;
        }

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
                        row_type: test.rowType || 'test',
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
