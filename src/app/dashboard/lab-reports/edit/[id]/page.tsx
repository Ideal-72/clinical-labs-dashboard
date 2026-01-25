'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth';
import { getTestTemplate, getReportGroups, getTestsForGroup } from '@/lib/testTemplates';
import { getReferenceRangeByGender } from '@/lib/getReferenceRangeByGender';

interface Test {
    id: string;
    testName: string;
    specimen: string;
    result: string;
    units: string;
    referenceRange: string;
    method: string;
    notes: string;
    rowType?: 'test' | 'note';
    isHeader?: boolean;
}

interface Section {
    id: string;
    name: string;
    reportGroup: string;
    tests: Test[];
}

interface PatientDetails {
    sidNo: string;
    branch: string;
    patientId: string;
    patientName: string;
    age: string;
    sex: string;
    referredBy: string;
    collectedDate: string;
    receivedDate: string;
    reportedDate: string;
    comments: string;
}

export default function EditLabReportPage() {
    const router = useRouter();
    const params = useParams();
    const reportId = params?.id as string;
    const { doctorId } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loading, setLoading] = useState(true);

    const [patientDetails, setPatientDetails] = useState<PatientDetails>({
        sidNo: '',
        branch: '',
        patientId: '',
        patientName: '',
        age: '',
        sex: 'Male',
        referredBy: 'Self',
        collectedDate: new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().slice(0, 16),
        receivedDate: new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().slice(0, 16),
        reportedDate: new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().slice(0, 16),
        comments: '',
    });

    const [sections, setSections] = useState<Section[]>([]);

    useEffect(() => {
        if (reportId) {
            fetchReport();
        }
    }, [reportId]);

    // Update reference ranges when patient sex changes
    useEffect(() => {
        if (!patientDetails.sex) return;

        // Auto-update Name Prefix
        setPatientDetails(prev => {
            let newName = prev.patientName;
            // Remove existing prefixes to avoid duplication/conflicts
            newName = newName.replace(/^(Mr\.|Mrs\.|Ms\.|Miss\.|Master\.)\s*/i, '');

            if (newName.trim()) {
                if (patientDetails.sex === 'Male') {
                    newName = `Mr. ${newName}`;
                } else if (patientDetails.sex === 'Female') {
                    newName = `Mrs. ${newName}`;
                }
            }
            // Only update if changed to prevent loops
            if (newName !== prev.patientName) {
                return { ...prev, patientName: newName };
            }
            return prev;
        });

        setSections(currentSections =>
            currentSections.map(section => ({
                ...section,
                tests: section.tests.map(test => {
                    if (test.testName) {
                        // We need to look up template again to get the gender-specific range
                        // But here we rely on the helper which takes the current value.
                        // Wait, 'test.referenceRange' might be manual.
                        // Ideally we check if it matches the *previous* gender default.
                        // For now, let's just update if it looks like a template range.
                        const templateRaw = getTestsForGroup(section.reportGroup).find(t => t.name === test.testName);
                        if (templateRaw && templateRaw.template.referenceRange) {
                            const newRange = getReferenceRangeByGender(templateRaw.template.referenceRange, patientDetails.sex, patientDetails.age);
                            if (newRange && newRange !== test.referenceRange) {
                                return { ...test, referenceRange: newRange };
                            }
                        }
                    }
                    return test;
                })
            }))
        );
    }, [patientDetails.sex]);

    const fetchReport = async () => {
        try {
            const response = await fetch(`/api/lab-reports/${reportId}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch report');
            }

            const report = data.report;

            // Convert report data to form format
            setPatientDetails({
                sidNo: report.sid_no || '',
                branch: report.branch || '',
                patientId: report.patient_id || '',
                patientName: report.patient_name || '',
                age: report.age?.toString() || '',
                sex: report.sex || 'Male',
                referredBy: report.referred_by || 'Self',
                collectedDate: report.collected_date ? new Date(report.collected_date).toISOString().split('T')[0] : '',
                receivedDate: report.received_date ? new Date(report.received_date).toISOString().split('T')[0] : '',
                reportedDate: report.reported_date ? new Date(report.reported_date).toISOString().split('T')[0] : '',
                comments: report.comments || '',
            });

            // Convert sections
            const formattedSections = report.sections.map((section: any) => {
                const groupName = section.section_name; // Assuming this matches template keys
                // Check if this section name corresponds to a known report group template
                const templateTestsRaw = getTestsForGroup(groupName);
                const isKnownGroup = templateTestsRaw.length > 0;

                let finalTests: Test[] = [];

                if (isKnownGroup) {
                    // Create a map of existing tests for quick lookup by name (case-insensitive)
                    const existingTestsMap = new Map();
                    section.tests.forEach((t: any) => {
                        existingTestsMap.set(t.test_name.toLowerCase().trim(), t);
                    });

                    // 1. Map template tests, merging with existing data if present
                    finalTests = templateTestsRaw.map((t, index) => {
                        const existing = existingTestsMap.get(t.name.toLowerCase().trim());

                        if (existing) {
                            return {
                                id: existing.id,
                                testName: existing.test_name,
                                specimen: existing.specimen || t.template.specimen || '',
                                result: existing.result,
                                units: existing.units || t.template.units || '',
                                referenceRange: existing.reference_range || getReferenceRangeByGender(t.template.referenceRange, report.sex, report.age),
                                method: existing.method || t.template.method || '',
                                notes: existing.notes || '',
                                rowType: existing.row_type || 'test',
                                isHeader: t.template.type === 'group_header',
                            };
                        } else {
                            // New empty test from template
                            return {
                                id: Date.now().toString() + '-' + index + '-' + Math.random().toString(36).substr(2, 9), // Ensure unique ID
                                testName: t.name,
                                specimen: t.template.specimen || '',
                                result: t.template.defaultValue || '',
                                units: t.template.units || '',
                                referenceRange: getReferenceRangeByGender(t.template.referenceRange, report.sex, report.age),
                                method: t.template.method || '',
                                notes: '',
                                rowType: t.template.type === 'group_header' ? 'note' : 'test',
                                isHeader: t.template.type === 'group_header',
                            };
                        }
                    });

                    // 2. Identify and append any "custom" tests from DB that weren't in the template
                    // (User might have added a custom row in the past)
                    const templateTestNames = new Set(templateTestsRaw.map(t => t.name.toLowerCase().trim()));
                    const extraTests = section.tests.filter((t: any) => !templateTestNames.has(t.test_name.toLowerCase().trim()));

                    const formattedExtraTests = extraTests.map((t: any) => ({
                        id: t.id,
                        testName: t.test_name,
                        specimen: t.specimen || '',
                        result: t.result,
                        units: t.units || '',
                        referenceRange: t.reference_range || '',
                        method: t.method || '',
                        notes: t.notes || '',
                        rowType: t.row_type || 'test',
                        isHeader: false,
                    }));

                    finalTests = [...finalTests, ...formattedExtraTests];

                } else {
                    // Fallback: If not a known group, just load what we have
                    finalTests = section.tests.map((test: any) => ({
                        id: test.id,
                        testName: test.test_name,
                        specimen: test.specimen || '',
                        result: test.result,
                        units: test.units || '',
                        referenceRange: test.reference_range || '',
                        method: test.method || '',
                        notes: test.notes || '',
                        rowType: test.row_type || 'test',
                    }));
                }

                return {
                    id: section.id,
                    name: section.section_name,
                    reportGroup: isKnownGroup ? groupName : '',
                    tests: finalTests,
                };
            });

            setSections(formattedSections);
        } catch (error: any) {
            console.error('Error fetching report:', error);
            alert(error.message || 'Failed to load report');
            router.push('/dashboard/lab-reports/create');
        } finally {
            setLoading(false);
        }
    };

    const addSection = () => {
        const newSection: Section = {
            id: Date.now().toString(),
            name: '',
            reportGroup: '',
            tests: [
                {
                    id: Date.now().toString(),
                    testName: '',
                    specimen: '',
                    result: '',
                    units: '',
                    referenceRange: '',
                    method: '',
                    notes: '',
                },
            ],
        };
        setSections([...sections, newSection]);
    };

    const removeSection = (sectionId: string) => {
        setSections(sections.filter((s) => s.id !== sectionId));
    };

    const updateSectionName = (sectionId: string, name: string) => {
        setSections(
            sections.map((s) => (s.id === sectionId ? { ...s, name } : s))
        );
    };

    const updateSectionGroup = (sectionId: string, groupName: string) => {
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
        }));

        setSections(
            sections.map((s) => (s.id === sectionId ? {
                ...s,
                reportGroup: groupName,
                name: groupName,
                tests: newTests
            } : s))
        );
    };

    const addTest = (sectionId: string) => {
        setSections(
            sections.map((section) => {
                if (section.id === sectionId) {
                    const newTest: Test = {
                        id: Date.now().toString(),
                        testName: '',
                        specimen: '',
                        result: '',
                        units: '',
                        referenceRange: '',
                        method: '',
                        notes: '',
                        rowType: 'test',
                    };
                    return { ...section, tests: [...section.tests, newTest] };
                }
                return section;
            })
        );
    };

    const addNoteRow = (sectionId: string) => {
        setSections(
            sections.map((section) => {
                if (section.id === sectionId) {
                    const newTest: Test = {
                        id: Date.now().toString(),
                        testName: '',
                        specimen: '',
                        result: '',
                        units: '',
                        referenceRange: '',
                        method: '',
                        notes: '',
                        rowType: 'note',
                    };
                    return { ...section, tests: [...section.tests, newTest] };
                }
                return section;
            })
        );
    };

    const removeTest = (sectionId: string, testId: string) => {
        setSections(
            sections.map((section) => {
                if (section.id === sectionId) {
                    return {
                        ...section,
                        tests: section.tests.filter((t) => t.id !== testId),
                    };
                }
                return section;
            })
        );
    };



    const calculateDependentValues = (tests: Test[], sectionName?: string): Test[] => {
        let updatedTests = [...tests];

        // Helper to find test index
        const findIndex = (name: string) => updatedTests.findIndex(t => t.testName.toLowerCase() === name.toLowerCase() || t.testName.toLowerCase().includes(name.toLowerCase()));

        const getVal = (name: string) => {
            const index = findIndex(name);
            const t = index !== -1 ? updatedTests[index] : null;
            return t && t.result && !isNaN(parseFloat(t.result)) ? parseFloat(t.result) : null;
        };

        const setVal = (name: string, val: string) => {
            const index = findIndex(name);
            if (index !== -1) {
                // Update existing
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
            setVal('VLDL Cholesterol', vldl); // Legacy
        }

        const vldl = getVal('Cholesterol,VLDL') || getVal('VLDL Cholesterol');

        if (chol !== null && hdl !== null) {
            setVal('Non-HDLCholesterol', (chol - hdl).toFixed(1));
            setVal('Non-HDL Cholesterol', (chol - hdl).toFixed(1)); // Legacy
            if (hdl !== 0) {
                setVal('Cholesterol/HDLRatio', (chol / hdl).toFixed(1));
                setVal('Total Cholesterol/HDL Ratio', (chol / hdl).toFixed(1)); // Legacy
            }
        }

        if (chol !== null && hdl !== null && vldl !== null) {
            const ldlVal = (chol - hdl - vldl).toFixed(1);
            setVal('Cholesterol,LDL', ldlVal);
            setVal('LDL Cholesterol', ldlVal); // Legacy
        }

        const ldl = getVal('Cholesterol,LDL') || getVal('LDL Cholesterol');
        if (ldl !== null && hdl !== null) {
            if (hdl !== 0) {
                setVal('LDL/HDLRatio', (ldl / hdl).toFixed(1));
                setVal('LDL/HDL Ratio', (ldl / hdl).toFixed(1)); // Legacy
            }
            if (ldl !== 0) {
                setVal('HDL/LDLRatio', (hdl / ldl).toFixed(1));
                setVal('HDL/LDL Ratio', (hdl / ldl).toFixed(1)); // Legacy
            }
        }

        // --- DIABETES ---
        const hba1c = getVal('HbA1c') || getVal('Glycosylated Haemoglobin (HbA1c)');
        if (hba1c !== null) {
            setVal('Estimated Average Glucose (eAG)', ((28.7 * hba1c) - 46.7).toFixed(0));
            setVal('eAG', ((28.7 * hba1c) - 46.7).toFixed(0)); // Keep legacy support just in case
        }

        // --- LFT (Biochemistry) ---
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

        // --- ELECTROLYTES (KFT) ---
        // Calculation removed as per user request
        // const na = getVal('Sodium.') || getVal('Sodium');
        // const k = getVal('Potassium.') || getVal('Potassium');
        // const cl = getVal('Chloride.') || getVal('Chloride');
        // if (na !== null && k !== null && cl !== null) {
        //     setVal('Bicarbonate.', ((na + k - cl) / 2).toFixed(1));
        // }

        return updatedTests;
    };

    const updateTest = (
        sectionId: string,
        testId: string,
        field: keyof Test,
        value: string
    ) => {
        setSections(
            sections.map((section) => {
                if (section.id === sectionId) {
                    let newTests = section.tests.map((test) =>
                        test.id === testId ? { ...test, [field]: value } : test
                    );

                    // Run calculations if value (result) changed
                    if (field === 'result') {
                        newTests = calculateDependentValues(newTests);
                    }

                    return {
                        ...section,
                        tests: newTests,
                    };
                }
                return section;
            })
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!patientDetails.patientName || !patientDetails.patientId) {
            alert('Please fill in patient name and ID');
            return;
        }

        const validSections = sections.filter(
            (s) => s.name && s.tests.some((t) => (t.testName && t.result) || t.rowType === 'note')
        );

        if (validSections.length === 0) {
            alert('Please add at least one section with test results');
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await fetch(`/api/lab-reports/${reportId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    patientDetails: {
                        ...patientDetails,
                        age: parseInt(patientDetails.age) || null,
                        comments: patientDetails.comments,
                    },
                    sections: validSections.map((section) => {
                        // Check for Mantoux completion
                        const durationTest = section.tests.find(t => t.testName === 'Duration');
                        const indurationTest = section.tests.find(t => t.testName === 'Induration');
                        const isMantouxComplete = ((durationTest?.result?.trim() ?? '') !== '') && ((indurationTest?.result?.trim() ?? '') !== '');

                        // First, get all potential row candidates (tests with results or notes)
                        const candidates = section.tests.filter((t) => {
                            if (t.testName === 'TuberculinDose') {
                                return isMantouxComplete;
                            }
                            return (t.testName && t.result) || t.rowType === 'note';
                        });

                        // Then, filter out headers that don't have following content
                        const finalTests = candidates.filter((t, index) => {
                            // Check if this is a group header based on template
                            const template = getTestTemplate(section.name, t.testName);
                            const isGroupHeader = t.rowType === 'note' && template?.type === 'group_header';

                            if (isGroupHeader) {
                                // Look ahead for the next item
                                const nextItem = candidates[index + 1];
                                if (!nextItem) return false; // End of list, discard header

                                // Check if next item is also a group header
                                const nextTemplate = getTestTemplate(section.name, nextItem.testName);
                                const nextIsGroupHeader = nextItem.rowType === 'note' && nextTemplate?.type === 'group_header';

                                // Keep header only if the next item is NOT another group header
                                return !nextIsGroupHeader;
                            }
                            // Always keep real tests and manual notes
                            return true;
                        });

                        return {
                            name: section.name,
                            tests: finalTests,
                        };
                    }),
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to update report');
            }

            router.push(`/dashboard/lab-reports/view/${reportId}`);
        } catch (error: any) {
            console.error('Error updating report:', error);
            alert(error.message || 'Failed to update report');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-foreground">Loading report...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background p-6">
            <div className="max-w-6xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6"
                >
                    <h1 className="text-3xl font-bold text-foreground mb-2">
                        Edit Lab Report
                    </h1>
                    <p className="text-muted-foreground">
                        Update patient details and test results
                    </p>
                </motion.div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Patient Details Section */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-secondary rounded-lg p-6 border border-border"
                    >
                        <h2 className="text-xl font-semibold text-foreground mb-4">
                            Patient Details
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">
                                    SID Number *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={patientDetails.sidNo}
                                    onChange={(e) =>
                                        setPatientDetails({ ...patientDetails, sidNo: e.target.value })
                                    }
                                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">
                                    Branch
                                </label>
                                <input
                                    type="text"
                                    value={patientDetails.branch}
                                    onChange={(e) =>
                                        setPatientDetails({ ...patientDetails, branch: e.target.value })
                                    }
                                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">
                                    Patient ID *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={patientDetails.patientId}
                                    onChange={(e) =>
                                        setPatientDetails({ ...patientDetails, patientId: e.target.value })
                                    }
                                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-foreground mb-1">
                                    Patient Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={patientDetails.patientName}
                                    onChange={(e) =>
                                        setPatientDetails({ ...patientDetails, patientName: e.target.value })
                                    }
                                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">
                                    Age
                                </label>
                                <input
                                    type="number"
                                    value={patientDetails.age}
                                    onChange={(e) =>
                                        setPatientDetails({ ...patientDetails, age: e.target.value })
                                    }
                                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">
                                    Sex
                                </label>
                                <select
                                    value={patientDetails.sex}
                                    onChange={(e) =>
                                        setPatientDetails({ ...patientDetails, sex: e.target.value })
                                    }
                                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                                >
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">
                                    Referred By
                                </label>
                                <input
                                    type="text"
                                    value={patientDetails.referredBy}
                                    onChange={(e) =>
                                        setPatientDetails({ ...patientDetails, referredBy: e.target.value })
                                    }
                                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">
                                    Collected Date/Time
                                </label>
                                <input
                                    type="datetime-local"
                                    value={patientDetails.collectedDate}
                                    onChange={(e) =>
                                        setPatientDetails({ ...patientDetails, collectedDate: e.target.value })
                                    }
                                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">
                                    Received Date/Time
                                </label>
                                <input
                                    type="datetime-local"
                                    value={patientDetails.receivedDate}
                                    onChange={(e) =>
                                        setPatientDetails({ ...patientDetails, receivedDate: e.target.value })
                                    }
                                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">
                                    Reported Date/Time
                                </label>
                                <input
                                    type="datetime-local"
                                    value={patientDetails.reportedDate}
                                    onChange={(e) =>
                                        setPatientDetails({ ...patientDetails, reportedDate: e.target.value })
                                    }
                                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                                />
                            </div>

                            <div className="md:col-span-2 lg:col-span-3">
                                <label className="block text-sm font-medium text-foreground mb-1">
                                    Footer Note (Optional)
                                </label>
                                <textarea
                                    value={patientDetails.comments}
                                    onChange={(e) =>
                                        setPatientDetails({ ...patientDetails, comments: e.target.value })
                                    }
                                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                                    placeholder="Enter any note to appear at the bottom of the report..."
                                    rows={2}
                                />
                            </div>
                        </div>
                    </motion.div>

                    {/* Test Sections - Same as create page */}
                    <div className="space-y-4">
                        <AnimatePresence>
                            {sections.map((section, sectionIndex) => (
                                <motion.div
                                    key={section.id}
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="bg-secondary rounded-lg p-6 border border-border"
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex-1 mr-4 grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-foreground mb-1">
                                                    Report Group
                                                </label>
                                                <select
                                                    value={section.reportGroup}
                                                    onChange={(e) =>
                                                        updateSectionGroup(section.id, e.target.value)
                                                    }
                                                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                                                >
                                                    <option value="">-- Select Report Group --</option>
                                                    {getReportGroups().map((group) => (
                                                        <option key={group} value={group}>
                                                            {group}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-foreground mb-1">
                                                    Section Name *
                                                </label>
                                                <input
                                                    type="text"
                                                    value={section.name}
                                                    onChange={(e) =>
                                                        updateSectionName(section.id, e.target.value)
                                                    }
                                                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                                                    placeholder="e.g., Biochemistry, Hematology"
                                                />
                                            </div>
                                        </div>
                                        {sections.length > 1 && (
                                            <button
                                                onBlur={() => {
                                                    // Apply Name Prefix on Blur
                                                    setPatientDetails(prev => {
                                                        let newName = prev.patientName;
                                                        // Make sure to match the compound prefix "Mrs./Ms." FIRST before "Mrs."
                                                        newName = newName.replace(/^(Mrs\.\/Ms\.|Mr\.|Mrs\.|Ms\.|Miss\.|Master\.)\s*/i, '');

                                                        if (newName.trim()) {
                                                            if (prev.sex === 'Male') {
                                                                newName = `Mr. ${newName}`;
                                                            } else if (prev.sex === 'Female') {
                                                                newName = `Mrs./Ms. ${newName}`;
                                                            }
                                                        }

                                                        return newName !== prev.patientName ? { ...prev, patientName: newName } : prev;
                                                    });
                                                }} className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-md transition-colors mt-6"
                                            >
                                                Remove Section
                                            </button>
                                        )}
                                    </div>

                                    {/* Tests Table */}
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="border-b border-border">
                                                    <th className="text-left py-2 px-2 text-sm font-medium text-muted-foreground">
                                                        Test Name *
                                                    </th>
                                                    <th className="text-left py-2 px-2 text-sm font-medium text-muted-foreground">
                                                        Specimen
                                                    </th>
                                                    <th className="text-left py-2 px-2 text-sm font-medium text-muted-foreground">
                                                        Result *
                                                    </th>
                                                    <th className="text-left py-2 px-2 text-sm font-medium text-muted-foreground">
                                                        Units
                                                    </th>
                                                    <th className="text-left py-2 px-2 text-sm font-medium text-muted-foreground">
                                                        Reference Range
                                                    </th>
                                                    <th className="text-left py-2 px-2 text-sm font-medium text-muted-foreground">
                                                        Method
                                                    </th>
                                                    <th className="text-left py-2 px-2 text-sm font-medium text-muted-foreground w-10">

                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {section.tests.map((test) => (
                                                    test.rowType === 'note' ? (
                                                        <tr key={test.id} className="border-b border-border/50">
                                                            <td colSpan={6} className="py-2 px-2">
                                                                <input
                                                                    type="text"
                                                                    value={test.testName}
                                                                    onChange={(e) => updateTest(section.id, test.id, 'testName', e.target.value)}
                                                                    className="w-full px-2 py-1 bg-secondary border border-border rounded text-sm text-foreground font-bold not-italic placeholder:not-italic"
                                                                    placeholder="Enter note..."
                                                                />
                                                            </td>
                                                            <td className="py-2 px-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => removeTest(section.id, test.id)}
                                                                    className="text-red-400 hover:text-red-300"
                                                                    title="Remove note"
                                                                >
                                                                    ×
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        <tr key={test.id} className="border-b border-border/50">
                                                            <td className="py-2 px-2">
                                                                <input
                                                                    type="text"
                                                                    value={test.testName}
                                                                    onChange={(e) =>
                                                                        updateTest(
                                                                            section.id,
                                                                            test.id,
                                                                            'testName',
                                                                            e.target.value
                                                                        )
                                                                    }
                                                                    className="w-full px-2 py-1 bg-background border border-border rounded text-sm text-foreground focus:ring-1 focus:ring-primary"
                                                                />
                                                            </td>
                                                            <td className="py-2 px-2">
                                                                <input
                                                                    type="text"
                                                                    value={test.specimen}
                                                                    onChange={(e) =>
                                                                        updateTest(
                                                                            section.id,
                                                                            test.id,
                                                                            'specimen',
                                                                            e.target.value
                                                                        )
                                                                    }
                                                                    className="w-full px-2 py-1 bg-background border border-border rounded text-sm text-foreground focus:ring-1 focus:ring-primary"
                                                                />
                                                            </td>
                                                            <td className="py-2 px-2">
                                                                <input
                                                                    type="text"
                                                                    value={test.result}
                                                                    onChange={(e) =>
                                                                        updateTest(
                                                                            section.id,
                                                                            test.id,
                                                                            'result',
                                                                            e.target.value
                                                                        )
                                                                    }
                                                                    className="w-full px-2 py-1 bg-background border border-border rounded text-sm text-foreground focus:ring-1 focus:ring-primary"
                                                                />
                                                            </td>
                                                            <td className="py-2 px-2">
                                                                <input
                                                                    type="text"
                                                                    value={test.units}
                                                                    onChange={(e) =>
                                                                        updateTest(
                                                                            section.id,
                                                                            test.id,
                                                                            'units',
                                                                            e.target.value
                                                                        )
                                                                    }
                                                                    className="w-full px-2 py-1 bg-background border border-border rounded text-sm text-foreground focus:ring-1 focus:ring-primary"
                                                                />
                                                            </td>
                                                            <td className="py-2 px-2">
                                                                <input
                                                                    type="text"
                                                                    value={test.referenceRange}
                                                                    onChange={(e) =>
                                                                        updateTest(
                                                                            section.id,
                                                                            test.id,
                                                                            'referenceRange',
                                                                            e.target.value
                                                                        )
                                                                    }
                                                                    className="w-full px-2 py-1 bg-background border border-border rounded text-sm text-foreground focus:ring-1 focus:ring-primary"
                                                                />
                                                            </td>
                                                            <td className="py-2 px-2">
                                                                <input
                                                                    type="text"
                                                                    value={test.method}
                                                                    onChange={(e) =>
                                                                        updateTest(
                                                                            section.id,
                                                                            test.id,
                                                                            'method',
                                                                            e.target.value
                                                                        )
                                                                    }
                                                                    className="w-full px-2 py-1 bg-background border border-border rounded text-sm text-foreground focus:ring-1 focus:ring-primary"
                                                                />
                                                            </td>
                                                            <td className="py-2 px-2">
                                                                {section.tests.length > 1 && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => removeTest(section.id, test.id)}
                                                                        className="text-red-400 hover:text-red-300"
                                                                        title="Remove test"
                                                                    >
                                                                        ×
                                                                    </button>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    )
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="mt-4 flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => addTest(section.id)}
                                            className="px-4 py-2 bg-primary/20 hover:bg-primary/30 text-primary rounded-md transition-colors text-sm"
                                        >
                                            + Add Test
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => addNoteRow(section.id)}
                                            className="px-4 py-2 bg-secondary hover:bg-secondary/80 text-foreground rounded-md transition-colors text-sm border border-border"
                                        >
                                            + Add Note
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>

                        <button
                            type="button"
                            onClick={addSection}
                            className="w-full px-4 py-3 bg-primary/20 hover:bg-primary/30 text-primary rounded-md transition-colors font-medium"
                        >
                            + Add Section
                        </button>
                    </div>

                    {/* Form Actions */}
                    <div className="flex gap-4 justify-end">
                        <button
                            type="button"
                            onClick={() => router.push(`/dashboard/lab-reports/view/${reportId}`)}
                            className="px-6 py-3 bg-secondary hover:bg-secondary/80 text-foreground rounded-md transition-colors border border-border"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? 'Updating...' : 'Update Report'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
