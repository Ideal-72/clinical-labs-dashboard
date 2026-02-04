import { useState, useEffect } from 'react';
import { getTestTemplate, getTestsForGroup } from '@/lib/testTemplates';
import { getReferenceRangeByGender } from '@/lib/getReferenceRangeByGender';

export interface Test {
    id: string;
    testName: string;
    specimen: string;
    result: string;
    units: string;
    referenceRange: string;
    method: string;
    notes: string;
    isHeader?: boolean;
    rowType?: 'test' | 'note';
}

export interface Section {
    id: string;
    name: string;
    reportGroup: string;
    tests: Test[];
}

export interface PatientDetails {
    sidNo: string;
    branch: string;
    patientId: string;
    patientName: string;
    age: string;
    sex: string;
    referredBy: string;
    referralType: string;
    doctorName: string;
    collectedDate: string;
    receivedDate: string;
    reportedDate: string;
    includeHeader: boolean;
    includeNotes: boolean;
    comments: string;
}

// Helper to get current time in IST (Asia/Kolkata) formatted as YYYY-MM-DDTHH:mm
const getISTDateTimeString = () => {
    const now = new Date();
    const istTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));

    const year = istTime.getFullYear();
    const month = String(istTime.getMonth() + 1).padStart(2, '0');
    const day = String(istTime.getDate()).padStart(2, '0');
    const hours = String(istTime.getHours()).padStart(2, '0');
    const minutes = String(istTime.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export const useReportForm = (doctorId?: string | number | null) => {
    const [patientDetails, setPatientDetails] = useState<PatientDetails>({
        sidNo: '',
        branch: 'Tiruchendur',
        patientId: '',
        patientName: '',
        age: '',
        sex: 'Male',
        referredBy: 'Self',
        referralType: 'self',
        doctorName: '',
        collectedDate: getISTDateTimeString(),
        receivedDate: getISTDateTimeString(),
        reportedDate: getISTDateTimeString(),
        includeHeader: true,
        includeNotes: false,
        comments: '',
    });

    const [sections, setSections] = useState<Section[]>([
        {
            id: '1',
            name: '',
            reportGroup: '',
            tests: [
                {
                    id: '1',
                    testName: '',
                    specimen: '',
                    result: '',
                    units: '',
                    referenceRange: '',
                    method: '',
                    notes: '',
                },
            ],
        },
    ]);

    const PREFIXES = ['Mr.', 'Mrs.', 'Ms.', 'Miss.', 'Dr.'];

    // Handle Name Prefix Logic
    const handleNameChange = (name: string) => {
        let newName = name;

        // Remove existing prefixes (case insensitive) to avoid duplication
        const prefixRegex = new RegExp(`^(${PREFIXES.map(p => p.replace('.', '\\.')).join('|')})\\s*`, 'i');
        const cleanName = newName.replace(prefixRegex, '');

        // We only clean the name here. The actual prefixing happens on blur or sex change
        // to avoid jumping cursors while typing.
        setPatientDetails(prev => ({ ...prev, patientName: newName }));

        return newName;
    };

    const applyPrefix = () => {
        setPatientDetails(prev => {
            let name = prev.patientName;
            // Clean existing
            const prefixRegex = new RegExp(`^(${PREFIXES.map(p => p.replace('.', '\\.')).join('|')})\\s*`, 'i');
            name = name.replace(prefixRegex, '');

            if (!name.trim()) return prev;

            // Apply based on sex if no prefix is present (simple default)
            // But user might want to choose. We will respect what they typed if it matches a prefix.
            // If they typed a name without prefix, we auto-add based on sex logic?
            // The previous logic forced Mr/Mrs. Let's make it smarter or stick to the requested simple logic.

            // Current Logic: If Sex is Male -> Mr., Female -> Mrs. (Default)
            // But we have Ms, Miss, Dr.
            // Let's only auto-add default if NO prefix is found.

            let prefix = '';
            if (prev.sex === 'Male') prefix = 'Mr.';
            else if (prev.sex === 'Female') prefix = 'Mrs.';

            return { ...prev, patientName: `${prefix} ${name}` };
        });
    }

    // Update reference ranges when patient sex changes
    useEffect(() => {
        if (!patientDetails.sex) return;

        // Update Reference Ranges
        setSections(currentSections =>
            currentSections.map(section => ({
                ...section,
                tests: section.tests.map(test => {
                    if (test.testName) {
                        const template = getTestTemplate(section.name, test.testName);
                        // If we can find the original template logic
                        if (template && template.referenceRange) {
                            // Try to find if this test came from a group template
                            const groupTest = getTestsForGroup(section.reportGroup).find(t => t.name === test.testName);
                            const refRange = groupTest ? groupTest.template.referenceRange : template.referenceRange;

                            const newRange = getReferenceRangeByGender(refRange, patientDetails.sex, patientDetails.age);
                            if (newRange !== test.referenceRange) {
                                return { ...test, referenceRange: newRange };
                            }
                        }
                    }
                    return test;
                })
            }))
        );

        // Update Prefix on Sex Change
        setPatientDetails(prev => {
            let name = prev.patientName;
            const prefixRegex = new RegExp(`^(${PREFIXES.map(p => p.replace('.', '\\.')).join('|')})\\s*`, 'i');
            const hasPrefix = prefixRegex.test(name);

            // Remove old prefix
            name = name.replace(prefixRegex, '');

            if (!name.trim()) return prev;

            let newPrefix = '';
            if (prev.sex === 'Male') newPrefix = 'Mr.';
            else if (prev.sex === 'Female') newPrefix = 'Mrs.';

            // Only auto-switch if it was already prefixed or we want to enforce it.
            // Let's enforce it to keep it helpful, but allow manual override later/on-blur if needed.
            return { ...prev, patientName: `${newPrefix} ${name}` };
        });

    }, [patientDetails.sex]);

    const calculateDependentValues = (tests: Test[]): Test[] => {
        let updatedTests = [...tests];

        const findIndex = (name: string) => updatedTests.findIndex(t => t.testName.toLowerCase() === name.toLowerCase() || t.testName.toLowerCase().includes(name.toLowerCase()));

        const getVal = (name: string) => {
            const index = findIndex(name);
            const t = index !== -1 ? updatedTests[index] : null;
            return t && t.result && !isNaN(parseFloat(t.result)) ? parseFloat(t.result) : null;
        };

        const setVal = (name: string, val: string) => {
            const index = findIndex(name);
            if (index !== -1) {
                updatedTests[index] = { ...updatedTests[index], result: val };
            }
        };

        // --- LIPID PROFILE ---
        const trig = getVal('Triglycerides');
        const chol = getVal('Cholesterol,Total') || getVal('Total Cholesterol');
        const hdl = getVal('Cholesterol,HDL') || getVal('HDL Cholesterol');

        if (trig !== null) {
            const vldl = (trig / 5).toFixed(1);
            setVal('Cholesterol,VLDL', vldl);
            setVal('VLDL Cholesterol', vldl);
        }

        const vldl = getVal('Cholesterol,VLDL') || getVal('VLDL Cholesterol');

        if (chol !== null && hdl !== null) {
            setVal('Non-HDLCholesterol', (chol - hdl).toFixed(1));
            setVal('Non-HDL Cholesterol', (chol - hdl).toFixed(1));
            if (hdl !== 0) {
                setVal('Cholesterol/HDLRatio', (chol / hdl).toFixed(1));
                setVal('Total Cholesterol/HDL Ratio', (chol / hdl).toFixed(1));
            }
        }

        if (chol !== null && hdl !== null && vldl !== null) {
            const ldlVal = (chol - hdl - vldl).toFixed(1);
            setVal('Cholesterol,LDL', ldlVal);
            setVal('LDL Cholesterol', ldlVal);
        }

        const ldl = getVal('Cholesterol,LDL') || getVal('LDL Cholesterol');
        if (ldl !== null && hdl !== null) {
            if (hdl !== 0) {
                setVal('LDL/HDLRatio', (ldl / hdl).toFixed(1));
                setVal('LDL/HDL Ratio', (ldl / hdl).toFixed(1));
            }
            if (ldl !== 0) {
                setVal('HDL/LDLRatio', (hdl / ldl).toFixed(1));
                setVal('HDL/LDL Ratio', (hdl / ldl).toFixed(1));
            }
        }

        // --- DIABETES ---
        const hba1c = getVal('HbA1c') || getVal('Glycosylated Haemoglobin (HbA1c)');
        if (hba1c !== null) {
            setVal('Estimated Average Glucose (eAG)', ((28.7 * hba1c) - 46.7).toFixed(0));
            setVal('eAG', ((28.7 * hba1c) - 46.7).toFixed(0));
        }

        // --- LFT ---
        const tp = getVal('TotalProtein.') || getVal('Total Protein');
        const alb = getVal('Albumin.') || getVal('Albumin');
        if (tp !== null && alb !== null) {
            const glob = (tp - alb).toFixed(1);
            setVal('Globulin.', glob);
            if (parseFloat(glob) !== 0) setVal('Albumin/Globulin', (alb / parseFloat(glob)).toFixed(1));
        }

        const sgot = getVal('Aspartateaminotransferase(AST/SGOT)') || getVal('SGOT/AST');
        const sgpt = getVal('Alanineaminotransferase(ALT/SGPT)') || getVal('SGPT/ALT');
        if (sgot !== null && sgpt !== null && sgpt !== 0) {
            setVal('SGOT/SGPT', (sgot / sgpt).toFixed(1));
        }

        return updatedTests;
    };

    const updateTest = (sectionId: string, testId: string, field: keyof Test, value: string) => {
        setSections(sections.map((section) => {
            if (section.id === sectionId) {
                let newTests = section.tests.map((test) => {
                    if (test.id === testId) {
                        const updatedTest = { ...test, [field]: value };

                        if (field === 'testName' && value.trim()) {
                            const template = getTestTemplate(section.name, value);
                            if (template) {
                                updatedTest.units = template.units;
                                updatedTest.referenceRange = getReferenceRangeByGender(template.referenceRange, patientDetails.sex, patientDetails.age);
                                if (template.specimen) updatedTest.specimen = template.specimen;
                                if (template.method) updatedTest.method = template.method;
                            }
                        }
                        return updatedTest;
                    }
                    return test;
                });

                if (field === 'result') {
                    newTests = calculateDependentValues(newTests);
                }

                return { ...section, tests: newTests };
            }
            return section;
        }));
    };

    const addSection = () => {
        setSections([...sections, {
            id: Date.now().toString(),
            name: '',
            reportGroup: '',
            tests: [{ id: Date.now().toString(), testName: '', specimen: '', result: '', units: '', referenceRange: '', method: '', notes: '', rowType: 'test' }]
        }]);
    };

    const removeSection = (id: string) => setSections(sections.filter(s => s.id !== id));

    const updateSectionName = (id: string, name: string) => {
        setSections(sections.map(s => s.id === id ? { ...s, name } : s));
    };

    const updateSectionGroup = (id: string, groupName: string) => {
        const groupTests = getTestsForGroup(groupName);
        const newTests: Test[] = groupTests.map((t, index) => ({
            id: Date.now().toString() + index,
            testName: t.name,
            specimen: t.template.specimen || '',
            result: t.template.defaultValue || '',
            units: t.template.units,
            referenceRange: getReferenceRangeByGender(t.template.referenceRange, patientDetails.sex, patientDetails.age),
            method: t.template.method || '',
            notes: '',
            isHeader: t.template.type === 'group_header',
            rowType: t.template.type === 'group_header' ? 'note' : 'test'
        }));

        setSections(sections.map(s => s.id === id ? { ...s, reportGroup: groupName, name: groupName, tests: newTests } : s));
    };

    const addTest = (sectionId: string) => {
        setSections(sections.map(s => s.id === sectionId ? {
            ...s, tests: [...s.tests, { id: Date.now().toString(), testName: '', specimen: '', result: '', units: '', referenceRange: '', method: '', notes: '', rowType: 'test' }]
        } : s));
    };

    const addNoteRow = (sectionId: string) => {
        setSections(sections.map(s => s.id === sectionId ? {
            ...s, tests: [...s.tests, { id: Date.now().toString(), testName: '', specimen: '', result: '', units: '', referenceRange: '', method: '', notes: '', rowType: 'note' }]
        } : s));
    };

    const removeTest = (sectionId: string, testId: string) => {
        setSections(sections.map(s => s.id === sectionId ? {
            ...s, tests: s.tests.filter(t => t.id !== testId)
        } : s));
    };

    const fetchNextSid = async () => {
        try {
            const response = await fetch('/api/lab-reports/next-sid');
            if (response.ok) {
                const data = await response.json();
                if (data.nextSid) setPatientDetails(prev => ({ ...prev, sidNo: data.nextSid }));
            }
        } catch (error) { console.error(error); }
    };

    const fetchNextPatientId = async () => {
        if (!doctorId) return;
        try {
            const response = await fetch(`/api/patients/next-id?doctorId=${doctorId}`);
            if (response.ok) {
                const data = await response.json();
                if (data.nextPatientId) setPatientDetails(prev => ({ ...prev, patientId: data.nextPatientId }));
            }
        } catch (error) { console.error(error); }
    };

    return {
        patientDetails,
        setPatientDetails,
        sections,
        setSections,
        updateTest,
        addSection,
        removeSection,
        updateSectionName,
        updateSectionGroup,
        addTest,
        addNoteRow,
        removeTest,
        fetchNextSid,
        fetchNextPatientId,
        PREFIXES
    };
};
