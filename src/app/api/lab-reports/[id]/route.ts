import { supabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';
import {
    isSupabaseConfigured,
    localGetLabReportById,
    localUpdateLabReport,
    localDeleteLabReport,
} from '@/lib/localStore';

export const dynamic = 'force-dynamic';

// GET /api/lab-reports/[id]
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // ── LOCAL DEV MODE ────────────────────────────────────────────────────
        if (!isSupabaseConfigured()) {
            const report = localGetLabReportById(id);
            if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 });
            return NextResponse.json({ report });
        }

        // ── SUPABASE MODE ─────────────────────────────────────────────────────
        const { data: report, error: reportError } = await supabase
            .from('lab_reports').select('*').eq('id', id).single();

        if (reportError) throw reportError;
        if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 });

        const { data: sections, error: sectionsError } = await supabase
            .from('test_sections').select('*').eq('report_id', id).order('display_order');
        if (sectionsError) throw sectionsError;

        const sectionsWithTests = await Promise.all(
            (sections || []).map(async (section) => {
                const { data: tests, error: testsError } = await supabase
                    .from('test_results').select('*').eq('section_id', section.id).order('display_order');
                if (testsError) throw testsError;
                return { ...section, tests: tests || [] };
            })
        );

        return NextResponse.json({ report: { ...report, sections: sectionsWithTests } });
    } catch (error: any) {
        console.error('Error fetching report:', error);
        return NextResponse.json({ error: 'Failed to fetch report', details: error.message }, { status: 500 });
    }
}

// PUT /api/lab-reports/[id]
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { patientDetails, sections } = body;

        // ── LOCAL DEV MODE ────────────────────────────────────────────────────
        if (!isSupabaseConfigured()) {
            const ok = localUpdateLabReport(id, patientDetails, sections || []);
            if (!ok) return NextResponse.json({ error: 'Report not found' }, { status: 404 });
            return NextResponse.json({ success: true, message: 'Report updated successfully' });
        }

        // ── SUPABASE MODE ─────────────────────────────────────────────────────
        let reportError;
        try {
            const result = await supabase.from('lab_reports').update({
                sid_no: patientDetails.sidNo,
                branch: patientDetails.branch,
                patient_id: patientDetails.patientId,
                patient_name: patientDetails.patientName,
                age: patientDetails.age,
                sex: patientDetails.sex,
                referred_by: patientDetails.referredBy,
                collected_date: patientDetails.collectedDate,
                received_date: patientDetails.receivedDate,
                reported_date: patientDetails.reportedDate,
                comments: patientDetails.comments,
                updated_at: new Date().toISOString(),
            }).eq('id', id);
            reportError = result.error;
            if (reportError && (reportError.message.includes('comments') || reportError.message.includes('schema cache'))) throw reportError;
        } catch (err) {
            console.warn('Retrying update without comments...', err);
            const fallback = await supabase.from('lab_reports').update({
                sid_no: patientDetails.sidNo,
                branch: patientDetails.branch,
                patient_id: patientDetails.patientId,
                patient_name: patientDetails.patientName,
                age: patientDetails.age,
                sex: patientDetails.sex,
                referred_by: patientDetails.referredBy,
                collected_date: patientDetails.collectedDate,
                received_date: patientDetails.receivedDate,
                reported_date: patientDetails.reportedDate,
                updated_at: new Date().toISOString(),
            }).eq('id', id);
            reportError = fallback.error;
        }

        if (reportError) throw reportError;

        await supabase.from('test_sections').delete().eq('report_id', id);

        if (sections && sections.length > 0) {
            for (let i = 0; i < sections.length; i++) {
                const section = sections[i];
                const { data: sectionData, error: sectionError } = await supabase
                    .from('test_sections')
                    .insert({ report_id: id, section_name: section.name, display_order: i })
                    .select().single();
                if (sectionError) throw sectionError;

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
                    const { error: testsError } = await supabase.from('test_results').insert(testInserts);
                    if (testsError) throw testsError;
                }
            }
        }

        return NextResponse.json({ success: true, message: 'Report updated successfully' });
    } catch (error: any) {
        console.error('Error updating report:', error);
        return NextResponse.json({ error: 'Failed to update report', details: error.message }, { status: 500 });
    }
}

// DELETE /api/lab-reports/[id]
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // ── LOCAL DEV MODE ────────────────────────────────────────────────────
        if (!isSupabaseConfigured()) {
            localDeleteLabReport(id);
            return NextResponse.json({ success: true, message: 'Report deleted successfully' });
        }

        // ── SUPABASE MODE ─────────────────────────────────────────────────────
        const { error } = await supabase.from('lab_reports').delete().eq('id', id);
        if (error) throw error;
        return NextResponse.json({ success: true, message: 'Report deleted successfully' });
    } catch (error: any) {
        console.error('Error deleting report:', error);
        return NextResponse.json({ error: 'Failed to delete report', details: error.message }, { status: 500 });
    }
}
