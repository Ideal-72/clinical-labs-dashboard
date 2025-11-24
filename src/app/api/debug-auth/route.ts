import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export async function GET() {
    try {
        // 1. Check connection and RLS visibility
        const { data: users, error } = await supabase
            .from('doctors')
            .select('username, password')
            .eq('username', 'admin');

        return NextResponse.json({
            status: 'Debug Info',
            userFound: users && users.length > 0,
            userDetails: users,
            error: error,
            env: {
                url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing',
                key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing'
            }
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message });
    }
}
