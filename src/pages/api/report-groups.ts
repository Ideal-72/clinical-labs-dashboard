import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
import {
  isSupabaseConfigured,
  localGetReportGroups,
  localCreateReportGroup,
  localUpdateReportGroup,
  localDeleteReportGroup,
} from '../../lib/localStore';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;
  const doctorId = req.headers.authorization;

  if (!doctorId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // ── LOCAL DEV MODE (no Supabase) ──────────────────────────────────────────
  if (!isSupabaseConfigured()) {
    switch (method) {
      case 'GET':
        return res.status(200).json(localGetReportGroups(doctorId as string));
      case 'POST': {
        const { name, testGroups } = req.body;
        return res.status(201).json(localCreateReportGroup(doctorId as string, { name, testGroups: testGroups || '' }));
      }
      case 'PUT': {
        const { id, name, testGroups } = req.body;
        const updated = localUpdateReportGroup(doctorId as string, Number(id), { name, testGroups: testGroups || '' });
        if (!updated) return res.status(404).json({ error: 'Not found' });
        return res.status(200).json(updated);
      }
      case 'DELETE': {
        const { id } = req.body;
        localDeleteReportGroup(doctorId as string, Number(id));
        return res.status(200).json({ message: 'Report group deleted' });
      }
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).end(`Method ${method} Not Allowed`);
    }
  }

  // ── SUPABASE MODE ─────────────────────────────────────────────────────────
  switch (method) {
    case 'GET':
      const { data: reportGroups, error: fetchError } = await supabase
        .from('report_groups')
        .select('id, name, test_groups')
        .eq('doctor_id', doctorId)
        .order('name');

      if (fetchError) {
        return res.status(500).json({ error: fetchError.message });
      }

      const transformedData = reportGroups.map(group => ({
        id: group.id,
        name: group.name,
        testGroups: group.test_groups || ''
      }));

      return res.status(200).json(transformedData);

    case 'POST':
      const { name, testGroups } = req.body;
      const { data: newReportGroup, error: insertError } = await supabase
        .from('report_groups')
        .insert([{
          doctor_id: doctorId,
          name,
          test_groups: testGroups || ''
        }])
        .select('id, name, test_groups')
        .single();

      if (insertError) {
        return res.status(500).json({ error: insertError.message });
      }

      return res.status(201).json({
        id: newReportGroup.id,
        name: newReportGroup.name,
        testGroups: newReportGroup.test_groups || ''
      });

    case 'PUT':
      const { id, name: updateName, testGroups: updateTestGroups } = req.body;
      const { data: updatedReportGroup, error: updateError } = await supabase
        .from('report_groups')
        .update({
          name: updateName,
          test_groups: updateTestGroups || ''
        })
        .eq('id', id)
        .eq('doctor_id', doctorId)
        .select('id, name, test_groups')
        .single();

      if (updateError) {
        return res.status(500).json({ error: updateError.message });
      }

      return res.status(200).json({
        id: updatedReportGroup.id,
        name: updatedReportGroup.name,
        testGroups: updatedReportGroup.test_groups || ''
      });

    case 'DELETE':
      const { id: deleteId } = req.body;
      const { error: deleteError } = await supabase
        .from('report_groups')
        .delete()
        .eq('id', deleteId)
        .eq('doctor_id', doctorId);

      if (deleteError) {
        return res.status(500).json({ error: deleteError.message });
      }
      return res.status(200).json({ message: 'Report group deleted' });

    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      return res.status(405).end(`Method ${method} Not Allowed`);
  }
}
