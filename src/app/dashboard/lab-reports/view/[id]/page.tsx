'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import Barcode from 'react-barcode';
import { TestResultChart } from '@/components/TestResultChart';

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

            {/* Report Container */}
            {/* Report Container - A4 size: 210mm x 297mm */}
            <div className="report-container mx-auto bg-white text-black p-8 my-6 shadow-lg print:shadow-none print:m-0" style={{ width: '210mm', minHeight: '297mm' }}>
                {/* Report Header */}
                <div className="report-header mb-6">
                    <div className="flex items-start justify-between">
                        {/* PCL Logo */}
                        <div className="w-32 h-16 flex items-center justify-center">
                            <img src="/pcl-logo.png" alt="PCL" className="h-full w-auto object-contain" />
                        </div>

                        {/* Patient Details */}
                        <div className="flex-1 px-6 text-sm">
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

                {/* Column Headers */}
                <div className="grid grid-cols-12 gap-2 text-xs font-bold border-b-2 border-black pb-2 mb-4">
                    <div className="col-span-4">Test Name / Specimen</div>
                    <div className="col-span-2">Result</div>
                    <div className="col-span-2">Units</div>
                    <div className="col-span-4">Reference Range / Method</div>
                </div>

                {/* Sections */}
                {report.sections
                    .filter((section) => section.tests && section.tests.length > 0)
                    .map((section) => (
                        <div key={section.id} className="report-section mb-6">
                            <h2 className="report-section-title text-base font-bold uppercase mb-3 pb-1 border-b border-gray-400">
                                {section.section_name}
                            </h2>

                            {/* Tests */}
                            <div className="space-y-3">
                                {section.tests.map((test) => (
                                    <div key={test.id}>
                                        <div className="grid grid-cols-12 gap-2 text-sm">
                                            <div className="col-span-4">
                                                <div className="font-semibold">{test.test_name}</div>
                                                {test.specimen && (
                                                    <div className="text-xs text-gray-600">{test.specimen}</div>
                                                )}
                                            </div>
                                            <div className="col-span-2 font-semibold">{test.result}</div>
                                            <div className="col-span-2 text-sm">{test.units}</div>
                                            <div className="col-span-4">
                                                {test.reference_range && (
                                                    <div className="text-sm">{test.reference_range}</div>
                                                )}
                                                {test.method && (
                                                    <div className="text-xs text-gray-600">{test.method}</div>
                                                )}
                                            </div>
                                        </div>
                                        {test.notes && (
                                            <div className="col-span-12 text-xs text-gray-700 mt-1 ml-4 italic">
                                                Note: {test.notes}
                                            </div>
                                        )}

                                        {/* Visual Chart Comparison */}
                                        <div className="col-span-12 mt-2">
                                            <TestResultChart
                                                testName={test.test_name}
                                                result={test.result}
                                                units={test.units}
                                                referenceRange={test.reference_range}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}

                {/* Report Footer */}
                <div className="report-footer mt-8 pt-4 border-t border-gray-300 text-center text-sm">
                    <p className="font-semibold">End of report</p>
                    <p className="text-xs text-gray-500 mt-2">
                        Processing Location: 43-B1, COWLEY BROWN ROAD, R.S PURAM, COIMBATORE - 641002 TAMILNADU
                    </p>
                </div>
            </div>
        </div>
    );
}
