import { supabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const doctorId = searchParams.get('doctorId');

        // Fetch all IDs to find the maximum numeric one (more robust than just "last")
        const { data: pData } = await supabase.from('patients').select('opno');
        const { data: rData } = await supabase.from('lab_reports').select('patient_id');

        const allIds = [
            ...(pData?.map(p => p.opno) || []),
            ...(rData?.map(r => r.patient_id) || [])
        ].filter(id => id && !id.includes('SAMPLE'));

        let lastId = '8200070094'; // Default starting point if nothing found

        if (allIds.length > 0) {
            let maxVal = BigInt(0);
            let bestId = typeof allIds[0] === 'string' ? allIds[0] : '';

            for (const id of allIds) {
                const numericPart = id.replace(/\D/g, '');
                if (numericPart) {
                    const val = BigInt(numericPart);
                    if (val > maxVal) {
                        maxVal = val;
                        bestId = id;
                    }
                }
            }
            lastId = bestId || '8200070094';
        }

        return calculateNextId(lastId);

    } catch (error: any) {
        console.error('Error calculating next Patient ID:', error);
        return NextResponse.json(
            { error: 'Failed to calculate next Patient ID', details: error.message },
            { status: 500 }
        );
    }
}

function calculateNextId(lastId: string) {
    let nextId = '8200000001';

    if (lastId) {
        // Extract numeric part
        const match = lastId.match(/(\d+)$/);
        if (match) {
            const numberPart = match[1];
            const prefix = lastId.substring(0, lastId.lastIndexOf(numberPart));
            const nextNumber = BigInt(numberPart) + BigInt(1); // Use BigInt for long IDs

            // Maintain exact same length as previous one if it was padded
            const nextNumberStr = nextNumber.toString().padStart(numberPart.length, '0');
            nextId = `${prefix}${nextNumberStr}`;
        } else {
            nextId = `${lastId}1`;
        }
    }

    return NextResponse.json({ nextPatientId: nextId });
}
