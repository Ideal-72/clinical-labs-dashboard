/**
 * Local in-memory store for development when Supabase is not configured.
 * Data persists only while the dev server is running.
 */

export function isSupabaseConfigured(): boolean {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    return !!(url && url.trim() && url.startsWith('http') && !url.includes('placeholder'));
}

interface Patient {
    id: number;
    doctor_id: string;
    opno: string;
    sid_no: string;
    name: string;
    age: number;
    gender: string;
    address: string;
    referred_by: string;
    created_at: string;
}

interface Observation {
    id: number;
    doctor_id: string;
    patient_id: number;
    report_date: string;
    report_name: string;
    parameters: any;
    created_at: string;
}

interface TestGroup {
    id: number;
    doctor_id: string;
    name: string;
    method: string;
    specimen: string;
}

interface LabTest {
    id: number;
    doctor_id: string;
    name: string;
    normalValue: string;
    unit: string;
    group: string;
}

interface ReportGroup {
    id: number;
    doctor_id: string;
    name: string;
    testGroups: string;
}

// Global in-memory store (persists for the lifetime of the dev server process)
const store: {
    patients: Patient[];
    observations: Observation[];
    testGroups: TestGroup[];
    labTests: LabTest[];
    reportGroups: ReportGroup[];
    patientIdCounter: number;
    observationIdCounter: number;
    testGroupIdCounter: number;
    labTestIdCounter: number;
    reportGroupIdCounter: number;
} = {
    patients: [],
    observations: [],
    testGroups: [],
    labTests: [],
    reportGroups: [],
    patientIdCounter: 1,
    observationIdCounter: 1,
    testGroupIdCounter: 1,
    labTestIdCounter: 1,
    reportGroupIdCounter: 1,
};

// ─── Patients ────────────────────────────────────────────────────────────────

export function localGetPatients(doctorId: string, sid?: string): Patient[] {
    let results = store.patients.filter(p => p.doctor_id === doctorId);
    if (sid) results = results.filter(p => p.sid_no === sid);
    else results = [...results].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return results;
}

export function localCreatePatient(doctorId: string, data: Omit<Patient, 'id' | 'doctor_id' | 'created_at'>): Patient {
    // Auto-generate opno if not provided
    let finalOpno = data.opno;
    if (!finalOpno) {
        const existing = store.patients.filter(p => p.doctor_id === doctorId);
        const lastOpno = existing.length > 0
            ? Math.max(...existing.map(p => parseInt(p.opno) || 0))
            : 0;
        finalOpno = (lastOpno + 1).toString().padStart(6, '0');
    }

    const patient: Patient = {
        id: store.patientIdCounter++,
        doctor_id: doctorId,
        opno: finalOpno,
        sid_no: data.sid_no || '',
        name: (data.name || '').substring(0, 100),
        age: parseInt(String(data.age)),
        gender: data.gender,
        address: (data.address || '').substring(0, 100),
        referred_by: data.referred_by || '',
        created_at: new Date().toISOString(),
    };
    store.patients.push(patient);
    return patient;
}

export function localUpdatePatient(doctorId: string, id: number, data: Partial<Patient>): Patient | null {
    const idx = store.patients.findIndex(p => p.id === id && p.doctor_id === doctorId);
    if (idx === -1) return null;
    store.patients[idx] = {
        ...store.patients[idx],
        opno: data.opno ?? store.patients[idx].opno,
        sid_no: data.sid_no ?? store.patients[idx].sid_no,
        name: data.name ? data.name.substring(0, 100) : store.patients[idx].name,
        age: data.age !== undefined ? parseInt(String(data.age)) : store.patients[idx].age,
        gender: data.gender ?? store.patients[idx].gender,
        address: data.address ? data.address.substring(0, 100) : store.patients[idx].address,
        referred_by: data.referred_by ?? store.patients[idx].referred_by,
    };
    return store.patients[idx];
}

export function localDeletePatient(doctorId: string, id: number): boolean {
    const before = store.patients.length;
    store.patients = store.patients.filter(p => !(p.id === id && p.doctor_id === doctorId));
    return store.patients.length < before;
}

// ─── Observations ─────────────────────────────────────────────────────────────

function attachPatient(obs: Observation) {
    const patient = store.patients.find(p => p.id === obs.patient_id);
    return {
        ...obs,
        patients: patient ? { id: patient.id, name: patient.name, opno: patient.opno } : null,
    };
}

export function localGetObservations(doctorId: string, patientId?: number | string, date?: string) {
    let results = store.observations.filter(o => o.doctor_id === doctorId);
    if (patientId) results = results.filter(o => o.patient_id === Number(patientId));
    if (date) results = results.filter(o => o.report_date === date);
    results = [...results].sort((a, b) => new Date(b.report_date).getTime() - new Date(a.report_date).getTime());
    return results.map(attachPatient);
}

export function localCreateObservation(doctorId: string, data: Omit<Observation, 'id' | 'doctor_id' | 'created_at'>) {
    const obs: Observation = {
        id: store.observationIdCounter++,
        doctor_id: doctorId,
        patient_id: Number(data.patient_id),
        report_date: data.report_date,
        report_name: data.report_name,
        parameters: data.parameters,
        created_at: new Date().toISOString(),
    };
    store.observations.push(obs);
    return attachPatient(obs);
}

export function localUpdateObservation(doctorId: string, id: number, data: Partial<Observation>) {
    const idx = store.observations.findIndex(o => o.id === id && o.doctor_id === doctorId);
    if (idx === -1) return null;
    store.observations[idx] = { ...store.observations[idx], ...data };
    return attachPatient(store.observations[idx]);
}

export function localDeleteObservation(doctorId: string, id: number): boolean {
    const before = store.observations.length;
    store.observations = store.observations.filter(o => !(o.id === id && o.doctor_id === doctorId));
    return store.observations.length < before;
}

// ─── Lab Reports ─────────────────────────────────────────────────────────────

interface TestResult {
    id: string;
    section_id: string;
    test_name: string;
    specimen: string;
    result: string;
    units: string;
    reference_range: string;
    method: string;
    notes: string;
    display_order: number;
    row_type: string;
}

interface TestSection {
    id: string;
    report_id: string;
    section_name: string;
    display_order: number;
    tests: TestResult[];
}

interface LabReport {
    id: string;
    doctor_id: string;
    sid_no: string;
    branch: string;
    patient_id: string;
    patient_name: string;
    age: number | null;
    sex: string;
    referred_by: string;
    collected_date: string | null;
    received_date: string | null;
    reported_date: string;
    created_at: string;
    updated_at: string;
    include_header: boolean;
    include_notes: boolean;
    comments: string;
    sections?: TestSection[];
}

const labStore: {
    reports: LabReport[];
    sections: TestSection[];
    testResults: TestResult[];
    reportCounter: number;
    sectionCounter: number;
    testResultCounter: number;
} = {
    reports: [],
    sections: [],
    testResults: [],
    reportCounter: 1001,
    sectionCounter: 1,
    testResultCounter: 1,
};

function makeId(prefix: string, counter: number): string {
    return `${prefix}-${counter}`;
}

export function localGetNextSid(): string {
    if (labStore.reports.length === 0) return '1001';
    const last = labStore.reports[labStore.reports.length - 1].sid_no;
    const match = last?.match(/(\d+)$/);
    if (match) {
        const prefix = last.substring(0, last.lastIndexOf(match[1]));
        return `${prefix}${parseInt(match[1], 10) + 1}`;
    }
    return `${last}1`;
}

export function localGetLabReports(doctorId: string, filters: { date?: string; patientId?: string; search?: string } = {}): LabReport[] {
    let results = labStore.reports.filter(r => r.doctor_id === doctorId);
    if (filters.search) {
        const s = filters.search.toLowerCase();
        results = results.filter(r =>
            r.patient_name?.toLowerCase().includes(s) ||
            r.sid_no?.toLowerCase().includes(s) ||
            r.patient_id?.toLowerCase().includes(s)
        );
    } else {
        if (filters.date) results = results.filter(r => r.reported_date?.startsWith(filters.date!));
        if (filters.patientId) results = results.filter(r => r.patient_id === filters.patientId);
    }
    return [...results].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export function localGetLabReportById(id: string): LabReport | null {
    const report = labStore.reports.find(r => r.id === id);
    if (!report) return null;
    const sections = labStore.sections
        .filter(s => s.report_id === id)
        .sort((a, b) => a.display_order - b.display_order)
        .map(s => ({
            ...s,
            tests: labStore.testResults
                .filter(t => t.section_id === s.id)
                .sort((a, b) => a.display_order - b.display_order),
        }));
    return { ...report, sections };
}

export function localCreateLabReport(patientDetails: any, sections: any[], doctorId: string): LabReport {
    const id = makeId('rep', labStore.reportCounter++);
    const report: LabReport = {
        id,
        doctor_id: doctorId,
        sid_no: patientDetails.sidNo || patientDetails.patientId || '',
        branch: patientDetails.branch || '',
        patient_id: patientDetails.patientId || '',
        patient_name: patientDetails.patientName || '',
        age: patientDetails.age ?? null,
        sex: patientDetails.sex || '',
        referred_by: patientDetails.referredBy || '',
        collected_date: patientDetails.collectedDate || null,
        received_date: patientDetails.receivedDate || null,
        reported_date: patientDetails.reportedDate || new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        include_header: patientDetails.includeHeader ?? true,
        include_notes: patientDetails.includeNotes ?? true,
        comments: patientDetails.comments || '',
    };
    labStore.reports.push(report);
    _insertSections(id, sections);
    return report;
}

function _insertSections(reportId: string, sections: any[]) {
    (sections || []).forEach((sec, i) => {
        const sectionId = makeId('sec', labStore.sectionCounter++);
        const section: TestSection = {
            id: sectionId,
            report_id: reportId,
            section_name: sec.name,
            display_order: i,
            tests: [],
        };
        labStore.sections.push(section);
        (sec.tests || []).forEach((test: any, j: number) => {
            const testResult: TestResult = {
                id: makeId('tr', labStore.testResultCounter++),
                section_id: sectionId,
                test_name: test.testName,
                specimen: test.specimen || '',
                result: test.result || '',
                units: test.units || '',
                reference_range: test.referenceRange || '',
                method: test.method || '',
                notes: test.notes || '',
                display_order: j,
                row_type: test.rowType || 'test',
            };
            labStore.testResults.push(testResult);
        });
    });
}

export function localUpdateLabReport(id: string, patientDetails: any, sections: any[]): boolean {
    const idx = labStore.reports.findIndex(r => r.id === id);
    if (idx === -1) return false;
    labStore.reports[idx] = {
        ...labStore.reports[idx],
        sid_no: patientDetails.sidNo ?? labStore.reports[idx].sid_no,
        branch: patientDetails.branch ?? labStore.reports[idx].branch,
        patient_id: patientDetails.patientId ?? labStore.reports[idx].patient_id,
        patient_name: patientDetails.patientName ?? labStore.reports[idx].patient_name,
        age: patientDetails.age ?? labStore.reports[idx].age,
        sex: patientDetails.sex ?? labStore.reports[idx].sex,
        referred_by: patientDetails.referredBy ?? labStore.reports[idx].referred_by,
        collected_date: patientDetails.collectedDate ?? labStore.reports[idx].collected_date,
        received_date: patientDetails.receivedDate ?? labStore.reports[idx].received_date,
        reported_date: patientDetails.reportedDate ?? labStore.reports[idx].reported_date,
        comments: patientDetails.comments ?? labStore.reports[idx].comments,
        updated_at: new Date().toISOString(),
    };
    // Replace sections
    const sectionIds = labStore.sections.filter(s => s.report_id === id).map(s => s.id);
    labStore.testResults = labStore.testResults.filter(t => !sectionIds.includes(t.section_id));
    labStore.sections = labStore.sections.filter(s => s.report_id !== id);
    _insertSections(id, sections);
    return true;
}

export function localDeleteLabReport(id: string): boolean {
    const before = labStore.reports.length;
    const sectionIds = labStore.sections.filter(s => s.report_id === id).map(s => s.id);
    labStore.testResults = labStore.testResults.filter(t => !sectionIds.includes(t.section_id));
    labStore.sections = labStore.sections.filter(s => s.report_id !== id);
    labStore.reports = labStore.reports.filter(r => r.id !== id);
    return labStore.reports.length < before;
}


// ─── Test Groups ─────────────────────────────────────────────────────────────

export function localGetTestGroups(doctorId: string): TestGroup[] {
    return store.testGroups.filter(g => g.doctor_id === doctorId).sort((a, b) => a.id - b.id);
}

export function localCreateTestGroup(doctorId: string, data: { name: string; method: string; specimen: string }): TestGroup {
    const group: TestGroup = { id: store.testGroupIdCounter++, doctor_id: doctorId, ...data };
    store.testGroups.push(group);
    return group;
}

export function localUpdateTestGroup(doctorId: string, id: number, data: Partial<TestGroup>): TestGroup | null {
    const idx = store.testGroups.findIndex(g => g.id === id && g.doctor_id === doctorId);
    if (idx === -1) return null;
    store.testGroups[idx] = { ...store.testGroups[idx], ...data };
    return store.testGroups[idx];
}

export function localDeleteTestGroup(doctorId: string, id: number): boolean {
    const before = store.testGroups.length;
    store.testGroups = store.testGroups.filter(g => !(g.id === id && g.doctor_id === doctorId));
    return store.testGroups.length < before;
}

// ─── Lab Tests ───────────────────────────────────────────────────────────────

export function localGetLabTests(doctorId: string): LabTest[] {
    return store.labTests.filter(t => t.doctor_id === doctorId).sort((a, b) => a.name.localeCompare(b.name));
}

export function localCreateLabTest(doctorId: string, data: { name: string; normalValue: string; unit: string; group: string }): LabTest {
    const test: LabTest = { id: store.labTestIdCounter++, doctor_id: doctorId, ...data };
    store.labTests.push(test);
    return test;
}

export function localUpdateLabTest(doctorId: string, id: number, data: Partial<LabTest>): LabTest | null {
    const idx = store.labTests.findIndex(t => t.id === id && t.doctor_id === doctorId);
    if (idx === -1) return null;
    store.labTests[idx] = { ...store.labTests[idx], ...data };
    return store.labTests[idx];
}

export function localDeleteLabTest(doctorId: string, id: number): boolean {
    const before = store.labTests.length;
    store.labTests = store.labTests.filter(t => !(t.id === id && t.doctor_id === doctorId));
    return store.labTests.length < before;
}

// ─── Report Groups ───────────────────────────────────────────────────────────

export function localGetReportGroups(doctorId: string): ReportGroup[] {
    return store.reportGroups.filter(g => g.doctor_id === doctorId).sort((a, b) => a.name.localeCompare(b.name));
}

export function localCreateReportGroup(doctorId: string, data: { name: string; testGroups: string }): ReportGroup {
    const group: ReportGroup = { id: store.reportGroupIdCounter++, doctor_id: doctorId, ...data };
    store.reportGroups.push(group);
    return group;
}

export function localUpdateReportGroup(doctorId: string, id: number, data: Partial<ReportGroup>): ReportGroup | null {
    const idx = store.reportGroups.findIndex(g => g.id === id && g.doctor_id === doctorId);
    if (idx === -1) return null;
    store.reportGroups[idx] = { ...store.reportGroups[idx], ...data };
    return store.reportGroups[idx];
}

export function localDeleteReportGroup(doctorId: string, id: number): boolean {
    const before = store.reportGroups.length;
    store.reportGroups = store.reportGroups.filter(g => !(g.id === id && g.doctor_id === doctorId));
    return store.reportGroups.length < before;
}
