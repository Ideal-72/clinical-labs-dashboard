'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import Barcode from 'react-barcode';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { getReferenceRangeByGender } from '@/lib/getReferenceRangeByGender';
import { getTestTemplate } from '@/lib/testTemplates';

interface Test {
    id: string;
    test_name: string;
    specimen: string;
    result: string;
    units: string;
    reference_range: string;
    method: string;
    notes: string;
    row_type?: string;
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
    include_header?: boolean;
    include_notes?: boolean;
    comments?: string;
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

const FormattedNote = ({ text }: { text: string }) => {
    if (!text) return null;

    // Split by ** for bolding
    const parts = text.split(/(\*\*.*?\*\*)/g);

    return (
        <span className="text-justify inline-block leading-normal">
            {parts.map((part, i) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    return <strong key={i} className="font-bold whitespace-pre-wrap">{part.slice(2, -2)}</strong>;
                }
                return part;
            })}
        </span>
    );
};

const PrintPageNumbers = () => {
    const [pages, setPages] = useState<number[]>([]);

    useEffect(() => {
        const calculatePages = () => {
            // A4 height in pixels at 96 DPI is approx 1123px.
            // We subtract some buffer to ensure it stays within the page.
            // With margin: 0, the browser cuts exactly at the paper size.
            const PAGE_HEIGHT_PX = 1122;
            const docHeight = document.documentElement.scrollHeight;
            const totalPages = Math.ceil(docHeight / PAGE_HEIGHT_PX);

            // Create array [1, 2, ..., totalPages]
            const pagesArray = Array.from({ length: totalPages }, (_, i) => i + 1);
            setPages(pagesArray);
        };

        // Calculate initially
        calculatePages();

        // Recalculate on window resize or before print (if possible)
        window.addEventListener('resize', calculatePages);

        // Try to handle dynamic content loading
        const observer = new MutationObserver(calculatePages);
        observer.observe(document.body, { childList: true, subtree: true });

        return () => {
            window.removeEventListener('resize', calculatePages);
            observer.disconnect();
        };
    }, []);

    return (
        <div className="hidden print:block pointer-events-none">
            {pages.map((page) => (
                <div
                    key={page}
                    style={{
                        position: 'absolute',
                        top: `${(page * 1122) - 40}px`, // 40px from bottom of each page slice
                        right: '15mm', // Match padding
                        fontSize: '10px',
                        color: 'black',
                        fontWeight: 'normal',
                        zIndex: 9999
                    }}
                >
                    {page}
                </div>
            ))}
        </div>
    );
};

export default function ViewLabReportPage() {
    const router = useRouter();
    const params = useParams();
    const reportId = params?.id as string;
    const reportRef = React.useRef<HTMLDivElement>(null);

    const [report, setReport] = useState<Report | null>(null);
    const [loading, setLoading] = useState(true);
    const [showHeader, setShowHeader] = useState(true);
    const [showNotes, setShowNotes] = useState(true);
    const [isSharing, setIsSharing] = useState(false);

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
            // Initialize visibility based on saved preference (default to true)
            setShowHeader(data.report.include_header ?? true);
            setShowNotes(data.report.include_notes ?? true);
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

    const handleWhatsAppShare = async () => {
        setIsSharing(true);
        try {
            console.log('Starting PDF generation...');
            const element = reportRef.current;
            if (!element || !report) {
                throw new Error('Report element not found');
            }

            // Capture the element as a canvas
            const canvas = await html2canvas(element, {
                scale: 2, // High quality
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff',
                // Ensure we capture the full height even if it overflows
                height: element.scrollHeight,
                windowHeight: element.scrollHeight
            } as any);

            console.log('Canvas captured successfully');
            const imgData = canvas.toDataURL('image/jpeg', 0.9);

            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);

            const pdfBlob = pdf.output('blob');
            console.log('PDF Blob generated, size:', pdfBlob.size);

            const fileName = `Lab_Report_${report.patient_name.replace(/\s+/g, '_')}.pdf`;
            const file = new File([pdfBlob], fileName, { type: 'application/pdf' });

            // Check for Web Share API
            if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                console.log('Using Web Share API');
                await navigator.share({
                    files: [file],
                    title: `Lab Report - ${report.patient_name}`,
                    text: `Lab report for ${report.patient_name}`,
                });
            } else {
                console.log('Web Share API not available or file share not supported, falling back to download');
                // Download fallback
                const url = URL.createObjectURL(pdfBlob);
                const link = document.createElement('a');
                link.href = url;
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);

                // Alert the user on Desktop that they need to attach the file manually
                alert('Success! The PDF report has been downloaded to your computer.\n\nNow opening WhatsApp - please attach the downloaded file to your chat.');

                const message = `Sharing lab report for ${report.patient_name}. (PDF downloaded, please attach)`;
                const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
                window.open(whatsappUrl, '_blank');
            }
        } catch (error: any) {
            console.error('Detailed Error in PDF Generation:', error);
            alert('Error generating PDF: ' + (error.message || 'Unknown error') + '. Attempting to share as a link instead.');

            // Final fallback to link
            const url = window.location.href;
            const message = `Priya Clinical Lab Report - ${report?.patient_name}: ${url}`;
            const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
            window.open(whatsappUrl, '_blank');
        } finally {
            setIsSharing(false);
        }
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
        <>
            {/* Print-specific CSS for pagination */}
            <style jsx global>{`
                @media print {
                    /* Allow sections to break, but control how */
                    .report-section {
                        page-break-inside: auto;
                        break-inside: auto;
                    }

                    /* Keep table headers with at least some content */
                    table thead {
                        display: table-header-group;
                    }

                    /* Prevent page breaks immediately after section headers */
                    .section-header-row {
                        page-break-after: avoid;
                        break-after: avoid;
                    }

                    /* Prevent orphan rows */
                    table tbody tr {
                        page-break-inside: avoid;
                        break-inside: avoid;
                    }

                    /* Keep group headers (LFT, MALARIA PANEL, etc.) with next row */
                    tr:has(td[colspan="4"]) {
                        page-break-after: avoid;
                        break-after: avoid;
                    }

                    /* Keep table header with at least first row */
                    table thead {
                        page-break-inside: avoid;
                        page-break-after: avoid;
                    }

                    /* Prevent widows and orphans for better readability */
                    * {
                        widows: 2;
                        orphans: 2;
                    }

                    /* Push signature and footer to bottom of last page */
                    .report-content-wrapper {
                        display: flex;
                        flex-direction: column;
                        min-height: 100vh;
                    }


                    .report-signature-footer {
                        margin-top: auto;
                        page-break-inside: avoid;
                    }
                }
            `}</style>





            <div className="min-h-screen bg-background print:min-h-0 print:h-auto print:bg-white print:overflow-visible">
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
                            onClick={() => setShowHeader(!showHeader)}
                            className="px-4 py-2 bg-secondary hover:bg-secondary/80 text-foreground rounded-md transition-colors border border-border"
                            title="Toggle Header/Footer visibility for printing"
                        >
                            {showHeader ? '👁️ Hide Header' : '🚫 Show Header'}
                        </button>
                        <button
                            onClick={() => setShowNotes(!showNotes)}
                            className="px-4 py-2 bg-secondary hover:bg-secondary/80 text-foreground rounded-md transition-colors border border-border"
                            title="Toggle Notes/Methodology visibility for printing"
                        >
                            {showNotes ? '📝 Hide Notes' : '📋 Show Notes'}
                        </button>
                        <button
                            onClick={handleWhatsAppShare}
                            disabled={isSharing}
                            className={`px-4 py-2 rounded-md transition-colors font-medium flex items-center gap-2 ${isSharing
                                ? 'bg-gray-500/20 text-gray-500 cursor-not-allowed'
                                : 'bg-green-500/20 hover:bg-green-500/30 text-green-500'
                                }`}
                            title="Generate PDF and Share on WhatsApp"
                        >
                            {isSharing ? '⌛ Processing...' : '📱 Share on WhatsApp'}
                        </button>
                    </div>
                </div>


                {/* Report Container - A4 size: 210mm x 297mm */}
                {/* Report Container - A4 size: 210mm x 297mm */}
                {/* Report Container - A4 size: 210mm x 297mm */}
                <div
                    ref={reportRef}
                    className={`report-container report-content-wrapper relative flex flex-col mx-auto bg-white text-black p-8 my-6 print:shadow-none print:m-0 print:my-0 print:p-0 print:block print:overflow-hidden ${report.sections.some(s => s.section_name?.toUpperCase().includes('RENAL')) ? 'multi-page-report' : ''
                        }`}>

                    {/* Global Table Wrapper for Repeating Headers/Footers */}
                    <table className="w-full">
                        {/* Header Spacer - Repeats on every page */}
                        <thead>
                            <tr>
                                <td>
                                    {/* Vertical Website Watermark - Hidden when 'Hide Header' is active */}
                                    {showHeader && (
                                        <div className="absolute top-0 bottom-0 left-0 w-8 flex items-center justify-center pointer-events-none print:left-0 z-10">
                                            <p className="-rotate-90 text-[10px] text-gray-500 tracking-[0.2em] font-medium whitespace-nowrap opacity-80 uppercase">
                                                www.priyalabs.in
                                            </p>
                                        </div>
                                    )}
                                    {/* Title Header or Spacer */}
                                    {showHeader ? (
                                        <div className="title-header mb-6 pb-10 border-b border-gray-300 flex justify-center relative print:mb-3 print:pb-6 min-h-[10rem]">
                                            {/* PCL Spear Logo - Top Left */}
                                            <div className="absolute top-0 left-0">
                                                <img src="/pcl-spear-logo.png" alt="PCL Logo" className="h-40 w-auto" />
                                            </div>

                                            {/* Microscope Icon - Top Right */}
                                            <div className="absolute top-0 right-0">
                                                <img src="/microscope-icon.png" alt="Microscope" className="h-40 w-auto mix-blend-multiply filter contrast-125" />
                                            </div>

                                            {/* Main Title Center */}
                                            <div className="flex justify-center items-center mt-2">
                                                <img src="/priya-header-v2.png" alt="Priya Clinical Lab" className="h-[8.5rem] w-auto object-contain" />
                                            </div>
                                        </div>
                                    ) : (
                                        /* Spacer for pre-printed letterhead & vertical alignment */
                                        /* Spacer for pre-printed letterhead & vertical alignment (43mm) */
                                        <div className="mb-6 print:mb-0 w-full" style={{ height: '43mm' }} aria-hidden="true"></div>
                                    )}
                                </td>
                            </tr>
                        </thead>

                        {/* Footer Spacer - Repeats on every page */}
                        <tfoot>
                            <tr>
                                <td>
                                    <div className={`report-signature-footer mt-auto pt-4 border-t border-gray-300 bg-white relative ${!showHeader ? 'print:border-0' : ''}`} style={{ minHeight: showHeader ? '100px' : '22mm' }}>
                                        {showHeader && (
                                            <div className="absolute left-0 top-4">
                                                <img src="/qr-code.png" alt="QR Code" className="h-16 w-16" />
                                            </div>
                                        )}
                                        <div className="text-center text-sm pb-4">
                                            <p className="leading-tight" style={{ display: 'inline-block', width: '100%' }}>
                                                {showHeader && (
                                                    <>
                                                        <span className="text-xs block"><span className="font-semibold">Processing Location:</span> 137/54 Ground Floor, Mela Ratha Veethi, Tiruchendur, Tamil Nadu 628215, India</span>
                                                        <span className="text-xs block mt-1">
                                                            <span className="font-semibold">Email:</span> clinicallaboratorypriya@gmail.com | <span className="font-semibold">Ph No:</span> +91 79042 26600
                                                        </span>
                                                    </>
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        </tfoot>

                        {/* Main Content Body */}
                        <tbody>
                            <tr>
                                <td>
                                    <div className="report-header mb-6 print:mb-3">
                                        <div className="text-sm border-b pb-4 border-gray-300">
                                            {/* Row 1: Identifiers */}
                                            <div className="grid grid-cols-3 gap-4 mb-2">
                                                <div><strong>SID No:</strong> {report.sid_no}</div>
                                                <div><strong>Patient ID:</strong> {report.patient_id}</div>
                                                <div><strong>Branch:</strong> {report.branch || 'Tiruchendur'}</div>
                                            </div>

                                            {/* Row 2: Patient Info */}
                                            <div className="grid grid-cols-3 gap-4 mb-2">
                                                <div><strong>Patient Name:</strong> {report.patient_name}</div>
                                                <div><strong>Age / Sex:</strong> {report.age} Y / {report.sex}</div>
                                                <div><strong>Ref. By:</strong> {report.referred_by}</div>
                                            </div>

                                            {/* Row 3: Dates */}
                                            <div className="grid grid-cols-3 gap-4">
                                                <div><strong>Collected:</strong> {formatDate(report.collected_date)}</div>
                                                <div><strong>Received:</strong> {formatDate(report.received_date)}</div>
                                                <div><strong>Reported:</strong> {formatDate(report.reported_date)}</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Final Test Report Title */}
                                    <div className="text-center my-4 print:my-2">
                                        <h1 className="text-xl font-bold">Final Test Report</h1>
                                    </div>

                                    {/* Sections - Each with own table and signatures */}
                                    {report.sections
                                        .filter((section) => section.tests && section.tests.length > 0)
                                        .map((section) => (
                                            <div
                                                key={section.id}
                                                className={`report-section ${section.section_name?.toUpperCase().includes('RENAL') ? 'page-break' : ''}`}
                                            >
                                                <table className="w-full border-collapse border-x border-b border-gray-400 text-sm print:text-xs">
                                                    <thead>
                                                        {/* Print Spacer Row: Pushes table down on new pages */}
                                                        <tr className="hidden print:table-row h-6 bg-white">
                                                            <th colSpan={4} className="bg-white" style={{ borderLeft: 'hidden', borderRight: 'hidden', borderTop: 'hidden' }}></th>
                                                        </tr>
                                                        <tr className="bg-gray-100 print:bg-gray-50 border-y border-gray-400">
                                                            <th className="p-2 print:p-1 text-left w-[40%] font-bold text-black border-r border-gray-300">Test Name / Specimen</th>
                                                            <th className="p-2 print:p-1 text-center w-[15%] font-bold text-black border-r border-gray-300">Result</th>
                                                            <th className="p-2 print:p-1 text-center w-[15%] font-bold text-black border-r border-gray-300">Units</th>
                                                            <th className="p-2 print:p-1 text-left w-[30%] font-bold text-black">Reference Range / Method</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {/* Section Header */}
                                                        <tr className="border-b border-gray-400 section-header-row">
                                                            <td colSpan={4} className="p-2 print:p-1 font-bold text-center text-black bg-gray-50 print:bg-transparent uppercase tracking-wider">
                                                                {(() => {
                                                                    const name = section.section_name;
                                                                    const len = name.length;
                                                                    if (len > 0 && len % 2 === 0) {
                                                                        const half = len / 2;
                                                                        const first = name.substring(0, half);
                                                                        const second = name.substring(half);
                                                                        if (first.toLowerCase() === second.toLowerCase()) {
                                                                            return first;
                                                                        }
                                                                    }
                                                                    return name;
                                                                })()}
                                                            </td>
                                                        </tr>

                                                        {/* Tests */}
                                                        {section.tests.map((test, index) => {
                                                            // Condition to hide CROSS MATCHING TEST if result is empty
                                                            if (test.test_name === 'CROSS MATCHING TEST' && (!test.result || test.result.trim() === '')) {
                                                                return null;
                                                            }

                                                            // Handle Manual Notes
                                                            if (test.row_type === 'note') {
                                                                return (
                                                                    <tr key={test.id} className="border-b border-gray-200 min-h-[1.5rem]">
                                                                        <td colSpan={4} className="p-2 print:p-1 text-black font-bold text-left pl-4">
                                                                            {test.test_name}
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            }

                                                            const analysis = analyzeResult(test.result, test.reference_range, report.sex);
                                                            const template = getTestTemplate(section.section_name, test.test_name);

                                                            // Helper to check if a header already exists as a physical row
                                                            const hasGroupHeader = (name: string) => section.tests.some(t => t.test_name.toUpperCase() === name.toUpperCase() && t.row_type === 'note');

                                                            // Logic to automatically insert "Malaria Panel" header
                                                            const malariaTests = ['MP - CARD METHOD', 'MF - CARD METHOD', 'BLOOD GROUPING', 'RH - TYPING', 'CROSS MATCHING TEST'];
                                                            const isMalariaTest = malariaTests.includes(test.test_name);
                                                            const prevTest = section.tests[index - 1];
                                                            const prevIsMalaria = prevTest && malariaTests.includes(prevTest.test_name);
                                                            const showMalariaHeader = isMalariaTest && !prevIsMalaria && !hasGroupHeader('MALARIA PANEL');

                                                            // ... (other headers logic)
                                                            const isWidalTest = test.test_name.includes('SALMONELLA');
                                                            const prevIsWidal = prevTest && prevTest.test_name.includes('SALMONELLA');
                                                            const showWidalHeader = isWidalTest && !prevIsWidal && !hasGroupHeader('WIDAL-SLIDE METHOD');

                                                            const isDengueAntibody = ['DENGUE ANTIBODY IgG', 'DENGUE ANTIBODY IgM'].includes(test.test_name);
                                                            const denguePanelTests = ['DENGUE NS1 ANTIGEN', 'DENGUE ANTIBODY IgG', 'DENGUE ANTIBODY IgM'];
                                                            const showDenguePanelHeader = denguePanelTests.includes(test.test_name) &&
                                                                !denguePanelTests.includes(prevTest?.test_name || '') &&
                                                                !hasGroupHeader('Dengue Panel');

                                                            const showUrineHeader = section.section_name === 'CLINICAL PATHOLOGY' && index === 0;

                                                            const showMantouxHeader = test.test_name === 'TuberculinDose' && !hasGroupHeader('Tuberculin skin (Mantoux) Test');

                                                            const showElectrolytesHeader = test.test_name === 'Sodium.' && !hasGroupHeader('ELECTROLYTES');

                                                            const showLipidProfileHeader = test.test_name === 'Cholesterol,Total' && !hasGroupHeader('LIPID PROFILE');

                                                            const showRFTHeader = test.test_name === 'Blood Urea' && !hasGroupHeader('RENAL FUNCTION TEST');

                                                            const boneHealthTests = ['Calcium', 'Phosphorous'];
                                                            const showBoneHealthHeader = boneHealthTests.includes(test.test_name) &&
                                                                !boneHealthTests.includes(prevTest?.test_name || '') &&
                                                                !hasGroupHeader('Bone Health');

                                                            const showVDRLHeader = test.test_name === 'Syphilis Antibody' && !hasGroupHeader('VDRL');

                                                            const showCardiacTroponin2Header = test.test_name === 'Troponin I' && !hasGroupHeader('Cardiac Troponin 2');

                                                            const diabeticScreeningTests = ['Glucose, Fasting', 'GCT (75 GMS)', 'Glucose Random', 'Glucose PP'];
                                                            const showDiabeticScreeningHeader = diabeticScreeningTests.includes(test.test_name) &&
                                                                !diabeticScreeningTests.includes(prevTest?.test_name || '') &&
                                                                !hasGroupHeader('DIABETIC SCREENING');

                                                            const hba1cTests = ['Glycosylated Haemoglobin (HbA1c)', 'Estimated Average Glucose (eAG)'];
                                                            const showHbA1cHeader = hba1cTests.includes(test.test_name) &&
                                                                !hba1cTests.includes(prevTest?.test_name || '') &&
                                                                !hasGroupHeader('HbA1c');
                                                            const isSpGravity = test.test_name.toUpperCase().includes('SP.GRAVITY') || test.test_name.toUpperCase().includes('SPECIFIC GRAVITY');

                                                            // Custom logic for HbA1c bolding (Prediabetic 5.7-6.4 and Diabetic >= 6.5)
                                                            let isHbA1cBold = false;
                                                            if (test.test_name === 'Glycosylated Haemoglobin (HbA1c)' && test.result) {
                                                                const val = parseFloat(test.result);
                                                                if (!isNaN(val) && val >= 5.7) {
                                                                    isHbA1cBold = true;
                                                                }
                                                            }

                                                            return (
                                                                <React.Fragment key={test.id}>
                                                                    {showUrineHeader && (
                                                                        <tr className="border-b border-gray-400">
                                                                            <td colSpan={4} className="p-2 print:p-1 font-bold text-left text-black bg-gray-50 print:bg-transparent uppercase tracking-wider pl-4">
                                                                                Urine complete analysis
                                                                            </td>
                                                                        </tr>
                                                                    )}
                                                                    {showMantouxHeader && (
                                                                        <tr className="border-b border-gray-400">
                                                                            <td colSpan={4} className="p-2 print:p-1 font-bold text-left text-black bg-gray-50 print:bg-transparent uppercase tracking-wider pl-4">
                                                                                Tuberculin skin (Mantoux) Test
                                                                            </td>
                                                                        </tr>
                                                                    )}
                                                                    {showBoneHealthHeader && (
                                                                        <tr className="border-b border-gray-400">
                                                                            <td colSpan={4} className="p-2 print:p-1 font-bold text-left text-black bg-gray-50 print:bg-transparent uppercase tracking-wider pl-4">
                                                                                Bone Health
                                                                            </td>
                                                                        </tr>
                                                                    )}
                                                                    {showLipidProfileHeader && (
                                                                        <tr className="border-b border-gray-400">
                                                                            <td colSpan={4} className="p-2 print:p-1 font-bold text-left text-black bg-gray-50 print:bg-transparent uppercase tracking-wider pl-4">
                                                                                LIPID PROFILE
                                                                            </td>
                                                                        </tr>
                                                                    )}
                                                                    {showRFTHeader && (
                                                                        <tr className="border-b border-gray-400">
                                                                            <td colSpan={4} className="p-2 print:p-1 font-bold text-left text-black bg-gray-50 print:bg-transparent uppercase tracking-wider pl-4">
                                                                                RENAL FUNCTION TEST
                                                                            </td>
                                                                        </tr>
                                                                    )}
                                                                    {showDiabeticScreeningHeader && (
                                                                        <tr className="border-b border-gray-400">
                                                                            <td colSpan={4} className="p-2 print:p-1 font-bold text-left text-black bg-gray-50 print:bg-transparent uppercase tracking-wider pl-4">
                                                                                DIABETIC SCREENING
                                                                            </td>
                                                                        </tr>
                                                                    )}
                                                                    {showHbA1cHeader && (
                                                                        <tr className="border-b border-gray-400">
                                                                            <td colSpan={4} className="p-2 print:p-1 font-bold text-left text-black bg-gray-50 print:bg-transparent uppercase tracking-wider pl-4">
                                                                                HbA1c
                                                                            </td>
                                                                        </tr>
                                                                    )}
                                                                    {showCardiacTroponin2Header && (
                                                                        <tr className="border-b border-gray-400">
                                                                            <td colSpan={4} className="p-2 print:p-1 font-bold text-left text-black bg-gray-50 print:bg-transparent uppercase tracking-wider pl-4">
                                                                                Cardiac Troponin 2
                                                                            </td>
                                                                        </tr>
                                                                    )}
                                                                    {showElectrolytesHeader && (
                                                                        <tr className="border-b border-gray-400">
                                                                            <td colSpan={4} className="p-2 print:p-1 font-bold text-left text-black bg-gray-50 print:bg-transparent uppercase tracking-wider pl-4">
                                                                                ELECTROLYTES
                                                                            </td>
                                                                        </tr>
                                                                    )}
                                                                    {showMalariaHeader && (
                                                                        <tr className="border-b border-gray-400">
                                                                            <td colSpan={4} className="p-2 print:p-1 font-bold text-left text-black bg-gray-50 print:bg-transparent uppercase tracking-wider pl-4">
                                                                                Malaria Panel
                                                                            </td>
                                                                        </tr>
                                                                    )}
                                                                    {showWidalHeader && (
                                                                        <tr className="border-b border-gray-400">
                                                                            <td colSpan={4} className="p-2 print:p-1 font-bold text-left text-black bg-gray-50 print:bg-transparent uppercase tracking-wider pl-4">
                                                                                WIDAL-SLIDE METHOD
                                                                            </td>
                                                                        </tr>
                                                                    )}
                                                                    {showVDRLHeader && (
                                                                        <tr className="border-b border-gray-400">
                                                                            <td colSpan={4} className="p-2 print:p-1 font-bold text-left text-black bg-gray-50 print:bg-transparent uppercase tracking-wider pl-4">
                                                                                VDRL
                                                                            </td>
                                                                        </tr>
                                                                    )}
                                                                    {showDenguePanelHeader && (
                                                                        <tr className="border-b border-gray-400">
                                                                            <td colSpan={4} className="p-2 print:p-1 font-bold text-left text-black bg-gray-50 print:bg-transparent uppercase tracking-wider pl-4">
                                                                                Dengue Panel
                                                                            </td>
                                                                        </tr>
                                                                    )}
                                                                    <tr className="border-b border-gray-200 hover:bg-gray-50">
                                                                        <td className="p-2 print:p-1 align-top border-r border-gray-300">
                                                                            <div className="font-medium text-black">{test.test_name}</div>
                                                                            {test.specimen && (
                                                                                <div className="text-xs text-gray-600 mt-0.5">{test.specimen}</div>
                                                                            )}
                                                                        </td>
                                                                        <td className={`p-2 print:p-1 align-top text-center border-r border-gray-300 relative ${analysis.isAbnormal || isHbA1cBold || isSpGravity ? 'font-bold' : 'font-medium'}`}>
                                                                            <div className="flex items-center justify-center h-full relative w-full">
                                                                                <span>{test.test_name === 'TuberculinDose' ? `${test.result} ${test.units}` : test.result}</span>
                                                                                {analysis.isAbnormal && (
                                                                                    <span className="text-xs font-bold absolute right-1 top-1/2 -translate-y-1/2">
                                                                                        {analysis.direction === 'high' ? '⬆' : '⬇'}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </td>
                                                                        <td className="p-2 print:p-1 align-top text-center font-medium border-r border-gray-300">
                                                                            {test.test_name === 'TuberculinDose' ? '' : test.units}
                                                                        </td>
                                                                        <td className="p-2 print:p-1 align-top border-r border-gray-300">
                                                                            {test.reference_range && (
                                                                                <div className="text-sm print:text-xs text-black whitespace-pre-line font-medium leading-tight">{getReferenceRangeByGender(test.reference_range, report.sex, report.age)}</div>
                                                                            )}
                                                                            {test.method && (
                                                                                <div className="text-[10px] text-gray-600 mt-1 uppercase tracking-tight">{test.method}</div>
                                                                            )}
                                                                        </td>
                                                                    </tr>
                                                                    {test.test_name === 'P-LCR' && (
                                                                        <tr>
                                                                            <td colSpan={4} className="p-0 border-r border-l border-gray-300">
                                                                                <div className="flex justify-between items-end mt-8 mb-4 px-4">
                                                                                    <div className="text-sm">
                                                                                        <div className="border-t border-gray-400 pt-1 w-48">
                                                                                            <span className="text-xs text-black font-semibold">Verified by</span>
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="text-sm">
                                                                                        <div className="border-t border-gray-400 pt-1 w-48 text-right">
                                                                                            <span className="text-xs text-black font-semibold">Lab Incharge</span>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            </td>
                                                                        </tr>
                                                                    )}
                                                                    {test.notes && (
                                                                        <tr key={`${test.id}-note`}>
                                                                            <td colSpan={4} className="border-b border-gray-300 p-1 text-xs text-black italic bg-gray-50/50">
                                                                                <span className="font-bold not-italic">Note: </span>
                                                                                <FormattedNote text={test.notes} />
                                                                            </td>
                                                                        </tr>
                                                                    )}
                                                                    {(() => {
                                                                        // Only show if showNotes toggle is enabled
                                                                        return showNotes && template?.clinicalNote ? (
                                                                            <tr key={`${test.id}-clinical-note`}>
                                                                                <td colSpan={4} className="border-b border-gray-300 p-2 text-[10px] text-black bg-gray-100/50">
                                                                                    <span className="font-bold">Note: </span>
                                                                                    <FormattedNote text={template.clinicalNote} />
                                                                                </td>
                                                                            </tr>
                                                                        ) : null;
                                                                    })()}
                                                                </React.Fragment>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>

                                                {/* Signature Block - Per Section */}
                                                <div className="flex justify-between items-end mt-4 mb-4 px-2 break-inside-avoid">
                                                    {/* Verified by - Left */}
                                                    <div className="text-sm">
                                                        <div className="border-t border-gray-400 pt-1 w-48">
                                                            <span className="text-xs text-black font-semibold">Verified by</span>
                                                        </div>
                                                    </div>

                                                    {/* Lab Incharge - Right */}
                                                    <div className="text-sm">
                                                        <div className="border-t border-gray-400 pt-1 w-48 text-right">
                                                            <span className="text-xs text-black font-semibold">Lab Incharge</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}

                                    {report.comments && (
                                        <div className="mt-8 mb-4 px-2 text-left">
                                            <p className="font-bold text-sm uppercase">NOTE: {report.comments}</p>
                                        </div>
                                    )}
                                    {/* End of Report Marker - Appears only at the end of content */}
                                    <div className="text-center text-sm pb-4 mt-8 print:mt-1 break-inside-avoid page-break-inside-avoid">
                                        <p className="font-bold">*** End of Report ***</p>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
            <PrintPageNumbers />
        </>
    );
}
