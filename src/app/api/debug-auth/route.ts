```javascript
import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function GET() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const urlValid = url ? url.startsWith('https://') && url.includes('.supabase.co') : false;

    let rawFetchResult = null;
    let rawFetchError = null;

    if (url && key) {
        try {
            const res = await fetch(`${ url } /rest/v1 / doctors ? select = username & username=eq.admin`, {
                headers: {
                    apikey: key,
                    Authorization: `Bearer ${ key } `
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
            .select('username, password_hash') // Changed from password to password_hash if that is the column name, checking both
            .eq('username', 'admin');

        // Check if we got users
        let passwordCheck = null;
        if (users && users.length > 0) {
            const user = users[0];
            // The column might be password or password_hash based on previous SQL.
            // In the previous debug output it showed "password": "..." so the column name in the SELECT was likely aliased or just 'password'.
            // Let's check the actual column name from previous steps.
            // The previous debug output showed: "userDetails":[{"username":"admin","password":"$2b$10$..."}]
            // So the column name in the DB is likely 'password' OR the previous select was `select('username, password')`.

            const hash = user.password || user.password_hash;
            const isMatch = await bcrypt.compare('admin123', hash);
            passwordCheck = {
                hashFound: !!hash,
                isMatch: isMatch,
                testedPassword: 'admin123'
            };
        }

        return NextResponse.json({
            status: 'Debug Info',
            clientTest: {
                userFound: users && users.length > 0,
                userDetails: users,
                passwordCheck: passwordCheck,
                error: error,
            },
            rawFetchTest: {
                result: rawFetchResult,
                error: rawFetchError
            },
            env: {
                urlConfigured: !!url,
                urlValidFormat: urlValid,
                urlPrefix: url ? url.substring(0, 12) : 'N/A',
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
```
