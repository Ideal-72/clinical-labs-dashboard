import { createClient } from '@supabase/supabase-js';

const getSupabaseUrl = () => {
    let url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    // Check if url is defined, not empty, and starts with http/https
    if (!url || !url.trim() || !url.startsWith('http')) {
        return 'https://placeholder.supabase.co';
    }
    return url;
};

const getSupabaseKey = () => {
    let key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!key || !key.trim()) {
        return 'placeholder';
    }
    return key;
};



export const supabase = createClient(getSupabaseUrl(), getSupabaseKey());