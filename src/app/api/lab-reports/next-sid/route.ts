import { supabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';
import { isSupabaseConfigured, localGetNextSid } from '@/lib/localStore';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        // ── LOCAL DEV MODE ────────────────────────────────────────────────────
        if (!isSupabaseConfigured()) {
            return NextResponse.json({ nextSid: localGetNextSid() });
        }

        // ── SUPABASE MODE ─────────────────────────────────────────────────────
        const { data, error } = await supabase
            .from('lab_reports')
            .select('sid_no')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('Error fetching last SID:', error);
            throw error;
        }

        let nextSid = '1001';

        if (data && data.sid_no) {
            const lastSid = data.sid_no;
            const match = lastSid.match(/(\d+)$/);
            if (match) {
                const numberPart = match[1];
                const prefix = lastSid.substring(0, lastSid.lastIndexOf(numberPart));
                const nextNumber = parseInt(numberPart, 10) + 1;
                nextSid = `${prefix}${nextNumber}`;
            } else {
                nextSid = `${lastSid}1`;
            }
        }

        return NextResponse.json({ nextSid });
    } catch (error: any) {
        console.error('Error calculating next SID:', error);
        return NextResponse.json({ error: 'Failed to calculate next SID', details: error.message }, { status: 500 });
    }
}
