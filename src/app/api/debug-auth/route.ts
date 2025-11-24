import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const urlValid = url ? url.startsWith('https://') && url.includes('.supabase.co') : false;

    let rawFetchResult = null;
    let rawFetchError = null;

    if (url && key) {
        try {
            const res = await fetch(`${url}/rest/v1/doctors?select=username&username=eq.admin`, {
                headers: {
                    apikey: key,
                    Authorization: `Bearer ${key}`
                }
            });
            rawFetchResult = {
                status: res.status,
                statusText: res.statusText,
                data: await res.json()
            };
        } catch (e: any) {
            rawFetchError = e.message;
        }
    }

    try {
        // 1. Check connection and RLS visibility via Client
        const { data: users, error } = await supabase
            .from('doctors')
            .select('username, password')
            .eq('username', 'admin');

        return NextResponse.json({
            status: 'Debug Info',
            clientTest: {
                userFound: users && users.length > 0,
                userDetails: users,
                error: error,
            },
            rawFetchTest: {
                result: rawFetchResult,
                error: rawFetchError
            },
            env: {
                urlConfigured: !!url,
                urlValidFormat: urlValid,
                urlPrefix: url ? url.substring(0, 12) : 'N/A', // Show https://...
                keyConfigured: !!key,
                keyLength: key ? key.length : 0
            }
        });
    } catch (e: any) {
        return NextResponse.json({
            error: e.message,
            stack: e.stack,
            rawFetchTest: {
                result: rawFetchResult,
                error: rawFetchError
            },
            env: {
                urlConfigured: !!url,
                urlValidFormat: urlValid,
                urlPrefix: url ? url.substring(0, 12) : 'N/A',
            }
        });
    }
}
