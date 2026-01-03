import { supabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        // Fetch the most recent report to get the last used SID
        const { data, error } = await supabase
            .from('lab_reports')
            .select('sid_no')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is "No rows found"
            console.error('Error fetching last SID:', error);
            throw error;
        }

        let nextSid = '1001'; // Default start

        if (data && data.sid_no) {
            const lastSid = data.sid_no;

            // Extract numeric part
            const match = lastSid.match(/(\d+)$/);
            if (match) {
                const numberPart = match[1];
                const prefix = lastSid.substring(0, lastSid.lastIndexOf(numberPart));
                const nextNumber = parseInt(numberPart, 10) + 1;

                // Keep the same padding if it exists (simple approach: just append)
                // If prefix exists, use it.
                nextSid = `${prefix}${nextNumber}`;
            } else {
                // If completely non-numeric, fallback to default or append number
                nextSid = `${lastSid}1`;
            }
        }

        return NextResponse.json({ nextSid });
    } catch (error: any) {
        console.error('Error calculating next SID:', error);
        return NextResponse.json(
            { error: 'Failed to calculate next SID', details: error.message },
            { status: 500 }
        );
    }
}
