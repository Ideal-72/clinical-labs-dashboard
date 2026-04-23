import { supabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search')?.toLowerCase() || '';

        // Fetch distinct referred_by values from lab_reports
        // We can't do "distinct" easily on a single column with supabase-js directly in one go with select('distinct referred_by')
        // effectively, but we can fetch them and filter in memory if the dataset isn't huge, 
        // OR use a remote procedure if we had one. 
        // For now, let's fetch 'referred_by' from lab_reports and also 'referred_by' from patients (to include newly added doctors via patients page)

        // 1. Fetch from Lab Reports
        const { data: reportDoctors, error: reportError } = await supabase
            .from('lab_reports')
            .select('referred_by')
            .not('referred_by', 'is', null);

        if (reportError) throw reportError;

        // 2. Fetch from Patients
        const { data: patientDoctors, error: patientError } = await supabase
            .from('patients')
            .select('referred_by')
            .not('referred_by', 'is', null);

        if (patientError) throw patientError;

        // Combine and extract unique names
        const allReferrals = [
            ...(reportDoctors?.map(d => d.referred_by).filter((d): d is string => typeof d === 'string') || []),
            ...(patientDoctors?.map(p => p.referred_by).filter((p): p is string => typeof p === 'string') || [])
        ];

        // Filter for "Dr." and clean up
        const uniqueDoctors = Array.from(new Set(
            allReferrals
                .filter(ref => ref && ref.trim().toLowerCase().includes('dr.')) // Only those explicitly marked as Dr.
                .map(ref => ref.trim())
        )).sort();

        // Filter by search term if present
        const filtered = uniqueDoctors.filter((doc: string) =>
            doc.toLowerCase().includes(search)
        );

        return NextResponse.json({ doctors: filtered });

    } catch (error: any) {
        console.error('Error fetching doctors:', error);
        return NextResponse.json(
            { error: 'Failed to fetch doctors', details: error.message },
            { status: 500 }
        );
    }
}
