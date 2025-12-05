'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import Barcode from 'react-barcode';

interface Test {
    id: string;
    test_name: string;
    specimen: string;
    result: string;
    units: string;
    reference_range: string;
    method: string;
    notes: string;
}

interface Section {
    id: string;
    section_name: string;
    tests: Test[];
}

interface Report {
    id: string;
    sid_no: string;
    branch: string;
    patient_id: string;
    patient_name: string;
    age: number;
    sex: string;
    referred_by: string;
    collected_date: string;
    received_date: string;
    reported_date: string;
    sections: Section[];
}

const analyzeResult = (resultStr: string, rangeStr: string, patientSex?: string) => {
    if (!resultStr || !rangeStr) return { isAbnormal: false, direction: 'normal' };

    // Extract numeric value from result
    const resultMatch = resultStr.match(/(\d+(\.\d+)?)/);
    if (!resultMatch) return { isAbnormal: false, direction: 'normal' };
    const result = parseFloat(resultMatch[0]);

    let cleanRange = rangeStr.trim();

    // Handle Gender Specific Ranges (e.g., "M: 13.5-17.5, F: 12-15.5")
    if (patientSex && (cleanRange.includes('M:') || cleanRange.includes('F:'))) {
        const isMale = patientSex.toLowerCase().startsWith('m');
        const genderKey = isMale ? 'M:' : 'F:';

        // Try to find the specific part
        const parts = cleanRange.split(/[,;]/); // Split by comma or semicolon
        const genderPart = parts.find(p => p.trim().toUpperCase().startsWith(genderKey));

        if (genderPart) {
            // Extract the range part (remove "M:" or "F:")
            cleanRange = genderPart.replace(new RegExp(genderKey, 'i'), '').trim();
        }
    }

    // Handle "min - max" format (e.g., "10.0 - 20.0")
    if (cleanRange.includes('-')) {
        const parts = cleanRange.split('-').map(p => parseFloat(p.trim()));
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            if (result < parts[0]) return { isAbnormal: true, direction: 'low' };
            if (result > parts[1]) return { isAbnormal: true, direction: 'high' };
        }
    }
    // Handle "< max" format (e.g., "< 5.0")
    else if (cleanRange.startsWith('<')) {
        const max = parseFloat(cleanRange.replace('<', '').trim());
        if (!isNaN(max) && result >= max) return { isAbnormal: true, direction: 'high' };
    }
    // Handle "> min" format (e.g., "> 10.0")
    else if (cleanRange.startsWith('>')) {
        const min = parseFloat(cleanRange.replace('>', '').trim());
        if (!isNaN(min) && result <= min) return { isAbnormal: true, direction: 'low' };
    }

    return { isAbnormal: false, direction: 'normal' };
};

export default function ViewLabReportPage() {
    const router = useRouter();
    const params = useParams();
    const reportId = params?.id as string;

    const [report, setReport] = useState<Report | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (reportId) {
            fetchReport();
        }
    }, [reportId]);

    const fetchReport = async () => {
        try {
            const response = await fetch(`/api/lab-reports/${reportId}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch report');
            }

            setReport(data.report);
        } catch (error: any) {
            console.error('Error fetching report:', error);
            alert(error.message || 'Failed to load report');
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const handleWhatsAppShare = () => {
        const url = window.location.href;
        const message = `Here is your lab test report: ${url}`;
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        }).replace(/\//g, '/') + ' / ' + date.toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-foreground">Loading report...</div>
            </div>
        );
    }

    if (!report) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-foreground">Report not found</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Action Bar - Hidden in print */}
            <div className="no-print sticky top-0 z-50 bg-secondary border-b border-border p-4 flex items-center justify-between">
                <button
                    onClick={() => router.push('/dashboard/lab-reports/create')}
                    className="px-4 py-2 bg-background hover:bg-background/80 text-foreground rounded-md transition-colors border border-border"
                >
                    ← Back to Form
                </button>

                <div className="flex gap-3">
                    <button
                        onClick={() => router.push(`/dashboard/lab-reports/edit/${reportId}`)}
                        className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-md transition-colors font-medium"
                    >
                        ✏️ Edit Report
                    </button>
                    <button
                        onClick={handlePrint}
                        className="px-4 py-2 bg-primary/20 hover:bg-primary/30 text-primary rounded-md transition-colors font-medium"
                    >
                        🖨️ Print / PDF
                    </button>
                    <button
                        onClick={handleWhatsAppShare}
                        className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-md transition-colors font-medium"
                    >
                        📱 Share on WhatsApp
                    </button>
                </div>
            </div>

            {/* Report Container - A4 size: 210mm x 297mm */}
            <div className="report-container mx-auto bg-white text-black p-8 my-6 shadow-lg print:shadow-none print:m-0" style={{ width: '210mm' }}>
                {/* Title Header */}
                <div className="title-header mb-6 pb-6 border-b-2 border-gray-800 flex justify-center relative">
                    {/* PCL Spear Logo - Top Left */}
                    <div className="absolute top-0 left-0">
                        <img src="/pcl-spear-logo.png" alt="PCL Logo" className="h-36 w-auto" />
                    </div>

                    {/* Microscope Icon - Top Right */}
                    <div className="absolute top-0 right-0">
                        <img src="/microscope-icon.png" alt="Microscope" className="h-36 w-auto opacity-80" />
                    </div>

                    {/* Main Title */}
                    <img src="/priya-lab-header.png" alt="Priya Clinical Lab" className="h-32 w-auto" />
                </div>

                {/* Report Header */}
                <div className="report-header mb-6">
                    <div className="flex items-start justify-between">
                        {/* Patient Details - Left Side */}
                        <div className="text-sm">
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                <div><strong>SID No:</strong> {report.sid_no}</div>
                                <div><strong>Patient ID:</strong> {report.patient_id}</div>
                                <div><strong>Branch:</strong> {report.branch}</div>
                                <div><strong>Mr. {report.patient_name}</strong></div>
                                <div><strong>Age / Sex:</strong> {report.age} Y / {report.sex}</div>
                                <div><strong>Ref. By:</strong> {report.referred_by}</div>
                            </div>
                        </div>

                        {/* Barcode */}
                        <div className="flex flex-col items-end">
                            <Barcode
                                value={report.patient_id}
                                width={1.5}
                                height={50}
                                fontSize={10}
                                margin={0}
                            />
                            <div className="text-xs mt-2">
                                <div><strong>Collected Date:</strong> {formatDate(report.collected_date)}</div>
                                <div><strong>Received Date:</strong> {formatDate(report.received_date)}</div>
                                <div><strong>Reported Date:</strong> {formatDate(report.reported_date)}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Final Test Report Title */}
                <div className="text-center my-4">
                    <h1 className="text-xl font-bold">Final Test Report</h1>
                    <p className="text-xs text-gray-500">Page 1 of 1</p>
                </div>

                {/* Sections - Each with own table and signatures */}
                {report.sections
                    .filter((section) => section.tests && section.tests.length > 0)
                    .map((section) => (
                        <div key={section.id} className="mb-8">
                            <table className="w-full border-collapse border border-gray-300 text-sm">
                                <thead>
                                    <tr className="bg-gray-50">
                                        <th className="border border-gray-300 p-2 text-left w-[35%]">Test Name / Specimen</th>
                                        <th className="border border-gray-300 p-2 text-left w-[15%]">Result</th>
                                        <th className="border border-gray-300 p-2 text-left w-[15%]">Units</th>
                                        <th className="border border-gray-300 p-2 text-left w-[35%]">Reference Range / Method</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {/* Section Header */}
                                    <tr className="bg-gray-50/50">
                                        <td colSpan={4} className="border border-gray-300 p-2 font-bold uppercase text-center tracking-wider">
                                            {section.section_name}
                                        </td>
                                    </tr>

                                    {/* Tests */}
                                    {section.tests.map((test) => {
                                        const analysis = analyzeResult(test.result, test.reference_range, report.sex);

                                        return (
                                            <React.Fragment key={test.id}>
                                                <tr className="hover:bg-gray-50/30">
                                                    <td className="border border-gray-300 p-2 align-top">
                                                        <div className="font-semibold">{test.test_name}</div>
                                                        {test.specimen && (
                                                            <div className="text-xs text-gray-500 mt-0.5">{test.specimen}</div>
                                                        )}
                                                    </td>
                                                    <td className={`border border-gray-300 p-2 align-top ${analysis.isAbnormal ? 'font-bold' : ''}`}>
                                                        <div className="flex items-center gap-2">
                                                            <span>{test.result}</span>
                                                            {analysis.isAbnormal && (
                                                                <span className="text-xs">
                                                                    {analysis.direction === 'high' ? '⬆' : '⬇'}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="border border-gray-300 p-2 align-top">
                                                        {test.units}
                                                    </td>
                                                    <td className="border border-gray-300 p-2 align-top">
                                                        {test.reference_range && (
                                                            <div className="text-sm text-gray-700 whitespace-pre-line">{test.reference_range}</div>
                                                        )}
                                                        {test.method && (
                                                            <div className="text-xs text-gray-500 mt-1">{test.method}</div>
                                                        )}
                                                    </td>
                                                </tr>
                                                {test.notes && (
                                                    <tr key={`${test.id}-note`}>
                                                        <td colSpan={4} className="border border-gray-300 p-2 text-xs bg-gray-50/50">
                                                            <span className="font-bold">Note: </span>
                                                            {test.notes}
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>

                            {/* Signature Row - Outside table */}
                            <div className="flex justify-between items-end mt-6 mb-4">
                                {/* Verified by - Left */}
                                <div className="text-sm">
                                    <div className="border-t border-gray-400 pt-1 w-48">
                                        <span className="text-xs text-gray-600">Verified by</span>
                                    </div>
                                </div>

                                {/* Lab Incharge - Right */}
                                <div className="text-sm">
                                    <div className="border-t border-gray-400 pt-1 w-48 text-right">
                                        <span className="text-xs text-gray-600">Lab Incharge</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                {/* Report Footer */}
                <div className="report-footer mt-8 pt-4 border-t border-gray-300">
                    <div className="text-center text-sm">
                        <p className="font-semibold">End of report</p>
                        <p className="text-xs text-gray-500 mt-2">
                            Processing Location: 137/54 Ground Floor, Mela Ratha Veethi, Tiruchendur, Tamil Nadu 628215, India
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
