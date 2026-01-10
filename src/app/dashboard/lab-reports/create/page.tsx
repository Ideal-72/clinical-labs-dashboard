'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
    isHeader?: boolean;
    rowType?: 'test' | 'note';
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
    referralType: string;
    doctorName: string;
    collectedDate: string;
    receivedDate: string;
    reportedDate: string;
    includeHeader: boolean;
    includeNotes: boolean;
    comments: string;
}

export default function CreateLabReportPage() {
    const router = useRouter();
    const { doctorId } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);

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
        collectedDate: new Date().toISOString().split('T')[0],
        receivedDate: new Date().toISOString().split('T')[0],
        reportedDate: new Date().toISOString().split('T')[0],
        includeHeader: true,
        includeNotes: true,
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

    // Patient autocomplete state
    const [existingPatients, setExistingPatients] = useState<any[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [filteredSuggestions, setFilteredSuggestions] = useState<any[]>([]);

    // Fetch existing patients and next SID/Patient ID on mount
    useEffect(() => {
        const fetchPatients = async () => {
            if (!doctorId) return;
            try {
                const response = await fetch('/api/patients', {
                    headers: { authorization: doctorId.toString() }
                });
                const data = await response.json();
                setExistingPatients(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error('Error fetching patients:', error);
                setExistingPatients([]);
            }
        };

        fetchPatients();
        fetchNextSid();
        fetchNextPatientId();
    }, [doctorId]);

    // Handle patient selection from autocomplete
    // ... (existing code)

    // Update reference ranges when patient sex changes
    useEffect(() => {
        if (!patientDetails.sex) return;

        setSections(currentSections =>
            currentSections.map(section => ({
                ...section,
                tests: section.tests.map(test => {
                    if (test.testName) {
                        const template = getTestTemplate(section.name, test.testName);
                        if (template && template.referenceRange) {
                            const newRange = getReferenceRangeByGender(template.referenceRange, patientDetails.sex, patientDetails.age);
                            // Only update if it's different to avoid unnecessary renders/changes
                            if (newRange !== test.referenceRange) {
                                return { ...test, referenceRange: newRange };
                            }
                        }
                    }
                    return test;
                })
            }))
        );
    }, [patientDetails.sex]);



    const fetchNextSid = async () => {
        try {
            const response = await fetch('/api/lab-reports/next-sid');
            if (response.ok) {
                const data = await response.json();
                if (data.nextSid) {
                    setPatientDetails(prev => ({ ...prev, sidNo: data.nextSid }));
                }
            }
        } catch (error) {
            console.error('Error fetching next SID:', error);
        }
    };

    const fetchNextPatientId = async () => {
        try {
            const url = doctorId ? `/api/patients/next-id?doctorId=${doctorId}` : '/api/patients/next-id';
            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                if (data.nextPatientId) {
                    setPatientDetails(prev => ({ ...prev, patientId: data.nextPatientId }));
                }
            }
        } catch (error) {
            console.error('Error fetching next Patient ID:', error);
        }
    };

    const handlePatientSelect = (patient: any) => {

        setPatientDetails({

            ...patientDetails,



            patientName: patient.name,

            patientId: patient.opno,

            age: patient.age.toString(),

            sex: patient.gender === 'M' ? 'Male' : patient.gender === 'F' ? 'Female' : 'Other',

        });

        // Auto-fetch SID if not present (or always, based on requirement "unique for every patient")
        fetchNextSid();

        setShowSuggestions(false);

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
            isHeader: t.template.type === 'group_header',
            rowType: t.template.type === 'group_header' ? 'note' : 'test'
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
                        testName: '', // Will store the note content
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



    const calculateDependentValues = (tests: Test[]): Test[] => {
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
        const chol = getVal('Cholesterol Total') || getVal('Total Cholesterol');
        const hdl = getVal('HDL Cholesterol') || getVal('HDL');

        if (trig !== null) {
            const vldl = (trig / 5).toFixed(1);
            setVal('VLDL Cholesterol', vldl);
        }

        const vldl = getVal('VLDL Cholesterol') || getVal('VLDL'); // Re-fetch

        if (chol !== null && hdl !== null) {
            setVal('Non-HDL Cholesterol', (chol - hdl).toFixed(1));
            if (hdl !== 0) setVal('Total Cholesterol/HDL Ratio', (chol / hdl).toFixed(1));
        }

        if (chol !== null && hdl !== null && vldl !== null) {
            const ldlVal = (chol - hdl - vldl).toFixed(1);
            setVal('LDL Cholesterol', ldlVal);
        }

        const ldl = getVal('LDL Cholesterol') || getVal('LDL');
        if (ldl !== null && hdl !== null) {
            if (hdl !== 0) setVal('LDL/HDL Ratio', (ldl / hdl).toFixed(1));
            if (ldl !== 0) setVal('HDL/LDL Ratio', (hdl / ldl).toFixed(1));
        }

        // --- DIABETES ---
        const hba1c = getVal('HbA1c');
        if (hba1c !== null) {
            setVal('eAG', ((28.7 * hba1c) - 46.7).toFixed(0));
        }

        // --- LFT (Biochemistry) ---
        const tp = getVal('Total Protein');
        const alb = getVal('Albumin.') || getVal('Albumin');
        if (tp !== null && alb !== null) {
            const glob = (tp - alb).toFixed(1);
            setVal('Globulin.', glob);
            if (parseFloat(glob) !== 0) setVal('Albumin/Globulin', (alb / parseFloat(glob)).toFixed(1));
        }

        const sgot = getVal('SGOT/AST') || getVal('SGOT');
        const sgpt = getVal('SGPT/ALT') || getVal('SGPT');
        if (sgot !== null && sgpt !== null && sgpt !== 0) {
            setVal('SGOT/SGPT Ratio', (sgot / sgpt).toFixed(1));
        }

        // --- ELECTROLYTES (KFT) ---
        // Calculation removed as per user request
        // const na = getVal('Sodium');
        // const k = getVal('Potassium');
        // const cl = getVal('Chloride');
        // if (na !== null && k !== null && cl !== null) {
        //    setVal('Bicarbonate', ((na + k - cl) / 2).toFixed(1));
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
                    let newTests = section.tests.map((test) => {
                        if (test.id === testId) {
                            const updatedTest = { ...test, [field]: value };

                            // Auto-fill when test name changes
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

        // Validation
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
            const response = await fetch('/api/lab-reports', {
                method: 'POST',
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
                        // First, get all potential row candidates (tests with results or notes)
                        const candidates = section.tests.filter((t) => (t.testName && t.result) || t.rowType === 'note');

                        // Then, filter out headers that don't have following content
                        const finalTests = candidates.filter((t, index) => {
                            if (t.isHeader) {
                                // Look ahead for the next item
                                const nextItem = candidates[index + 1];
                                // Keep header only if there is a next item and it's NOT another header
                                // (meaning it's a test result or a manual note)
                                return nextItem && !nextItem.isHeader;
                            }
                            // Always keep real tests and manual notes
                            return true;
                        });

                        return {
                            name: section.name,
                            tests: finalTests,
                        };
                    }),
                    doctorId,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.details || data.error || 'Failed to create report');
            }

            router.push(`/dashboard/lab-reports/view/${data.report.id}`);
        } catch (error: any) {
            console.error('Error creating report:', error);
            alert(error.message || 'Failed to create report');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-background p-6">
            <div className="max-w-6xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6"
                >
                    <h1 className="text-3xl font-bold text-foreground mb-2">
                        Create Lab Report
                    </h1>
                    <p className="text-muted-foreground">
                        Fill in patient details and test results to generate a professional lab report
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


                            <div className="md:col-span-2 lg:col-span-3 relative">
                                <label className="block text-sm font-medium text-foreground mb-1">
                                    Patient Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={patientDetails.patientName}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setPatientDetails({ ...patientDetails, patientName: value });
                                        if (value.trim()) {
                                            const filtered = existingPatients.filter(p =>
                                                p.name.toLowerCase().includes(value.toLowerCase())
                                            );
                                            setFilteredSuggestions(filtered);
                                            setShowSuggestions(filtered.length > 0);
                                        } else {
                                            setShowSuggestions(false);
                                        }
                                    }}
                                    onBlur={() => {
                                        setTimeout(() => setShowSuggestions(false), 200);
                                        // Auto-fetch SID if name is filled and SID is empty
                                        if (patientDetails.patientName && !patientDetails.sidNo) {
                                            fetchNextSid();
                                        }
                                    }}
                                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                                    placeholder="Enter patient name"
                                />
                                {showSuggestions && (
                                    <div className="absolute z-10 w-full bg-background border border-border rounded-md mt-1 max-h-48 overflow-y-auto shadow-lg">
                                        {filteredSuggestions.map(patient => (
                                            <div
                                                key={patient.id}
                                                onClick={() => handlePatientSelect(patient)}
                                                className="px-3 py-2 hover:bg-secondary cursor-pointer border-b border-border last:border-b-0"
                                            >
                                                <div className="font-medium text-foreground">{patient.name}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    ID: {patient.opno} | Age: {patient.age} | {patient.gender === 'M' ? 'Male' : patient.gender === 'F' ? 'Female' : 'Other'}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="md:col-span-1">
                                <label className="block text-sm font-medium text-foreground mb-1">
                                    SID No
                                </label>
                                <input
                                    type="text"
                                    value={patientDetails.sidNo}
                                    onChange={(e) =>
                                        setPatientDetails({ ...patientDetails, sidNo: e.target.value })
                                    }
                                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                                    placeholder="SID123..."
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
                                    placeholder="Tiruchendur"
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
                                    placeholder="8200070095"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">
                                    Age
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    max="120"
                                    value={patientDetails.age}
                                    onChange={(e) => {
                                        const value = parseInt(e.target.value);
                                        if (value <= 120 || e.target.value === '') {
                                            setPatientDetails({ ...patientDetails, age: e.target.value });
                                        }
                                    }}
                                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                                    placeholder="19"
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
                                <select
                                    value={patientDetails.referralType}
                                    onChange={(e) => {
                                        const type = e.target.value;
                                        setPatientDetails({
                                            ...patientDetails,
                                            referralType: type,
                                            referredBy: type === 'self' ? 'Self' : `Dr. ${patientDetails.doctorName}`,
                                            doctorName: type === 'self' ? '' : patientDetails.doctorName
                                        });
                                    }}
                                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                                >
                                    <option value="self">Self</option>
                                    <option value="doctor">Doctor</option>
                                </select>
                            </div>
                            {patientDetails.referralType === 'doctor' && (
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1">
                                        Doctor Name
                                    </label>
                                    <div className="flex items-center">
                                        <span className="text-muted-foreground mr-2 text-sm">Dr.</span>
                                        <input
                                            type="text"
                                            value={patientDetails.doctorName}
                                            onChange={(e) => setPatientDetails({
                                                ...patientDetails,
                                                doctorName: e.target.value,
                                                referredBy: `Dr. ${e.target.value}`
                                            })}
                                            className="flex-1 px-3 py-2 bg-background border border-border rounded-md text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                                            placeholder="Enter doctor's name"
                                        />
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">
                                    Collected Date
                                </label>
                                <input
                                    type="date"
                                    value={patientDetails.collectedDate}
                                    onChange={(e) =>
                                        setPatientDetails({ ...patientDetails, collectedDate: e.target.value })
                                    }
                                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">
                                    Received Date
                                </label>
                                <input
                                    type="date"
                                    value={patientDetails.receivedDate}
                                    onChange={(e) =>
                                        setPatientDetails({ ...patientDetails, receivedDate: e.target.value })
                                    }
                                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">
                                    Reported Date
                                </label>
                                <input
                                    type="date"
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

                    {/* Test Sections */}
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
                                                    value={section.reportGroup || ''}
                                                    onChange={(e) =>
                                                        updateSectionGroup(section.id, e.target.value)
                                                    }
                                                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                                                >
                                                    <option value="">Select Group</option>
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
                                                    placeholder="e.g., Biochemistry"
                                                />
                                            </div>
                                        </div>
                                        {sections.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeSection(section.id)}
                                                className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-md transition-colors mt-6"
                                            >
                                                Remove Section
                                            </button>
                                        )}
                                    </div>

                                    {/* Tests Grid or Table */}
                                    {section.reportGroup ? (
                                        <>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-4">
                                                {section.tests.map((test) => (
                                                    test.isHeader ? (
                                                        <div key={test.id} className="col-span-full mt-4 mb-2 border-b border-border pb-1">
                                                            <h4 className="font-bold text-foreground uppercase tracking-wide">
                                                                {test.testName}
                                                            </h4>
                                                        </div>
                                                    ) : test.rowType === 'note' ? (
                                                        <div key={test.id} className="col-span-full mt-2 mb-2">
                                                            <input
                                                                type="text"
                                                                value={test.testName} // Note content stored in testName
                                                                onChange={(e) => updateTest(section.id, test.id, 'testName', e.target.value)}
                                                                className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-foreground italic focus:ring-2 focus:ring-primary focus:border-transparent placeholder:not-italic"
                                                                placeholder="Enter note..."
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div key={test.id} className="flex flex-col">
                                                            <label className="text-sm font-medium text-foreground mb-1 truncate" title={test.testName}>
                                                                {test.testName}
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={test.result}
                                                                onChange={(e) => updateTest(section.id, test.id, 'result', e.target.value)}
                                                                className="w-full border-b border-border bg-transparent px-0 py-1 focus:border-primary focus:outline-none text-foreground"
                                                                placeholder={test.units ? `(${test.units})` : ''}
                                                            />
                                                        </div>
                                                    )
                                                ))}
                                            </div>
                                            {/* Add Note/Test Buttons for Grid View */}
                                            <div className="mt-6 flex gap-2">
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
                                        </>
                                    ) : (
                                        <>
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
                                                                            placeholder="e.g., APOLIPOPROTEIN A1"
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
                                                                            placeholder="Serum"
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
                                                                            placeholder="120.0"
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
                                                                            placeholder="mg/dL"
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
                                                                            placeholder="104.0 - 202.0"
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
                                                                            placeholder="Immunoturbidimetric"
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
                                        </>
                                    )}
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

                    {/* Header/Footer Options */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-secondary rounded-lg p-6 border border-border"
                    >
                        <h2 className="text-xl font-semibold text-foreground mb-4">
                            Print Options
                        </h2>
                        <div className="space-y-4">
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Header & Footer Visibility
                            </label>
                            <div className="flex gap-6">
                                <label className="flex items-center space-x-3 cursor-pointer p-3 border border-border rounded-lg hover:bg-background/50 transition-colors flex-1">
                                    <input
                                        type="radio"
                                        checked={patientDetails.includeHeader === true}
                                        onChange={() => setPatientDetails({ ...patientDetails, includeHeader: true })}
                                        className="w-4 h-4 text-primary focus:ring-primary border-gray-300"
                                    />
                                    <div>
                                        <div className="font-medium text-foreground">With Header & Footer</div>
                                        <div className="text-xs text-muted-foreground">Standard report with logo and footer</div>
                                    </div>
                                </label>
                                <label className="flex items-center space-x-3 cursor-pointer p-3 border border-border rounded-lg hover:bg-background/50 transition-colors flex-1">
                                    <input
                                        type="radio"
                                        checked={patientDetails.includeHeader === false}
                                        onChange={() => setPatientDetails({ ...patientDetails, includeHeader: false })}
                                        className="w-4 h-4 text-primary focus:ring-primary border-gray-300"
                                    />
                                    <div>
                                        <div className="font-medium text-foreground">Without Header & Footer</div>
                                        <div className="text-xs text-muted-foreground">Plain report for pre-printed letterheads</div>
                                    </div>
                                </label>
                            </div>

                            <label className="block text-sm font-medium text-foreground mb-2 mt-6">
                                Clinical Notes
                            </label>
                            <div className="flex gap-6">
                                <label className="flex items-center space-x-3 cursor-pointer p-3 border border-border rounded-lg hover:bg-background/50 transition-colors flex-1">
                                    <input
                                        type="radio"
                                        checked={patientDetails.includeNotes === true}
                                        onChange={() => setPatientDetails({ ...patientDetails, includeNotes: true })}
                                        className="w-4 h-4 text-primary focus:ring-primary border-gray-300"
                                    />
                                    <div>
                                        <div className="font-medium text-foreground">Include Clinical Notes</div>
                                        <div className="text-xs text-muted-foreground">Show interpretation notes for complex tests</div>
                                    </div>
                                </label>
                                <label className="flex items-center space-x-3 cursor-pointer p-3 border border-border rounded-lg hover:bg-background/50 transition-colors flex-1">
                                    <input
                                        type="radio"
                                        checked={patientDetails.includeNotes === false}
                                        onChange={() => setPatientDetails({ ...patientDetails, includeNotes: false })}
                                        className="w-4 h-4 text-primary focus:ring-primary border-gray-300"
                                    />
                                    <div>
                                        <div className="font-medium text-foreground">Exclude Clinical Notes</div>
                                        <div className="text-xs text-muted-foreground">Show only test results without notes</div>
                                    </div>
                                </label>
                            </div>
                        </div>
                    </motion.div>

                    {/* Form Actions */}
                    <div className="flex gap-4 justify-end">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="px-6 py-3 bg-secondary hover:bg-secondary/80 text-foreground rounded-md transition-colors border border-border"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? 'Creating...' : 'Generate Report'}
                        </button>
                    </div>
                </form>
            </div >
        </div >
    );
}
