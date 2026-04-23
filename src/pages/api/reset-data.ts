import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'DELETE' && req.method !== 'POST') {
        res.setHeader('Allow', ['DELETE', 'POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const doctorId = req.headers.authorization;
    if (!doctorId) {
        return res.status(401).json({ error: 'Unauthorized: No Doctor ID provided' });
    }

    try {
        // Delete all lab reports for this doctor
        const { error: reportsError } = await supabase
            .from('lab_reports')
            .delete()
            .eq('doctor_id', doctorId);

        if (reportsError) {
            console.error('Error deleting reports:', reportsError);
            return res.status(500).json({ error: reportsError.message });
        }

        // Delete all patients for this doctor
        const { error: patientsError } = await supabase
            .from('patients')
            .delete()
            .eq('doctor_id', doctorId);

        if (patientsError) {
            console.error('Error deleting patients:', patientsError);
            return res.status(500).json({ error: patientsError.message });
        }

        return res.status(200).json({ message: 'All data has been reset successfully.' });
    } catch (error: any) {
        console.error('Reset error:', error);
        return res.status(500).json({ error: error.message });
    }
}
