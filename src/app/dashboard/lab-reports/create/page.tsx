'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth';
import { getTestTemplate } from '@/lib/testTemplates';

interface Test {
    id: string;
    testName: string;
    specimen: string;
    result: string;
    units: string;
    referenceRange: string;
    method: string;
    notes: string;
}

interface Section {
    id: string;
    name: string;
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
}

export default function CreateLabReportPage() {
    const router = useRouter();
    const { doctorId } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [patientDetails, setPatientDetails] = useState<PatientDetails>({
        sidNo: '',
        branch: '',
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
    });

    const [sections, setSections] = useState<Section[]>([
        {
            id: '1',
            name: '',
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

    // Fetch existing patients on mount
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
    }, [doctorId]);


    // Handle patient selection from autocomplete

    const handlePatientSelect = (patient: any) => {

        setPatientDetails({

            ...patientDetails,

            sidNo: patient.opno,

            patientName: patient.name,

            patientId: patient.opno,

            age: patient.age.toString(),

            sex: patient.gender === 'M' ? 'Male' : patient.gender === 'F' ? 'Female' : 'Other',

        });

        setShowSuggestions(false);

    };


    const addSection = () => {
        const newSection: Section = {
            id: Date.now().toString(),
            name: '',
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

    const updateTest = (
        sectionId: string,
        testId: string,
        field: keyof Test,
        value: string
    ) => {
        setSections(
            sections.map((section) => {
                if (section.id === sectionId) {
                    return {
                        ...section,
                        tests: section.tests.map((test) => {
                            if (test.id === testId) {
                                const updatedTest = { ...test, [field]: value };

                                // Auto-fill when test name changes
                                if (field === 'testName' && value.trim()) {
                                    const template = getTestTemplate(section.name, value);
                                    if (template) {
                                        // Only auto-fill if fields are empty
                                        if (!test.units) updatedTest.units = template.units;
                                        if (!test.referenceRange) updatedTest.referenceRange = template.referenceRange;
                                        if (!test.specimen && template.specimen) updatedTest.specimen = template.specimen;
                                        if (!test.method && template.method) updatedTest.method = template.method;
                                    }
                                }

                                return updatedTest;
                            }
                            return test;
                        }),
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
            (s) => s.name && s.tests.some((t) => t.testName && t.result)
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
                    },
                    sections: validSections.map((section) => ({
                        name: section.name,
                        tests: section.tests.filter((t) => t.testName && t.result),
                    })),
                    doctorId,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to create report');
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
                                    placeholder="B2011759"
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
                                    placeholder="THIRUNELVELI"
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

                            <div className="md:col-span-2 relative">
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
                                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
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
                                        <div className="flex-1 mr-4">
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
                                                placeholder="e.g., Biochemistry, Hematology, Immunology"
                                            />
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
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => addTest(section.id)}
                                        className="mt-4 px-4 py-2 bg-primary/20 hover:bg-primary/30 text-primary rounded-md transition-colors text-sm"
                                    >
                                        + Add Test
                                    </button>
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
            </div>
        </div>
    );
}
