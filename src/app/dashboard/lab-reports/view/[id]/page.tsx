// @ts-nocheck
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import Barcode from 'react-barcode';
import html2canvas from 'html2canvas-pro';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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

const analyzeResult = (resultStr: string, rangeStr: string, patientSex?: string, patientAge?: number) => {
    if (!resultStr || !rangeStr) return { isAbnormal: false, direction: 'normal' };

    // Ignore Widal / Serology Dilution results (e.g. "POSITIVE 1:80 DILUTION")
    if (resultStr.toUpperCase().includes('DILUTION') || resultStr.includes('1:')) {
        return { isAbnormal: false, direction: 'normal' };
    }

    // Pre-clean result string: remove % and if it looks like a spaced number, remove spaces
    let cleanResultCandidate = resultStr.replace(/%/g, '').trim();
    if (/^[\d\.\s]+$/.test(cleanResultCandidate)) {
        cleanResultCandidate = cleanResultCandidate.replace(/\s/g, '');
    }

    // Extract numeric value from result
    const resultMatch = cleanResultCandidate.match(/(\d+(\.\d+)?)/);
    if (!resultMatch) return { isAbnormal: false, direction: 'normal' };
    const result = parseFloat(resultMatch[0]);

    let cleanRange = rangeStr.trim();

    // Handle Gender Specific Ranges (supports "M:", "F:", "Male:", "Female:")
    // Check if range contains gender indicators
    if (patientSex && (
        /M(ale)?\s*:/i.test(cleanRange) ||
        /F(emale)?\s*:/i.test(cleanRange)
    )) {
        const isMale = patientSex.toLowerCase().startsWith('m');
        // Regex to match "M:", "Male:", "F:", "Female:" (case insensitive)
        const maleRegex = /M(ale)?\s*:/i;
        const femaleRegex = /F(emale)?\s*:/i;

        // Split by comma, semicolon, OR newline
        const parts = cleanRange.split(/[,;\n]/);

        let genderPart;
        if (isMale) {
            genderPart = parts.find(p => maleRegex.test(p));
        } else {
            genderPart = parts.find(p => femaleRegex.test(p));
        }

        if (genderPart) {
            // Extract the range part (remove the gender prefix)
            cleanRange = genderPart.replace(isMale ? maleRegex : femaleRegex, '').trim();
        }
    }

    // Clean units from range (remove non-arithmetic chars except <, >, -, .)
    // This helps with " < 15 mm/hr " -> "< 15"
    // But be careful not to break "10-20"

    // Handle Age Specific Ranges
    if (patientAge !== undefined && patientAge !== null) {
        const lines = rangeStr.split(/[\n,;]/);
        for (const line of lines) {
            // Check for "min - max yrs" or "min - max years" pattern
            const ageMatch = line.match(/(\d+)\s*[-–]\s*(\d+)\s*(?:yrs|years?)/i);
            if (ageMatch) {
                const minAge = parseFloat(ageMatch[1]);
                const maxAge = parseFloat(ageMatch[2]);
                if (patientAge >= minAge && patientAge <= maxAge) {
                    // This is the correct line for this patient
                    // Extract the range values from this line (usually inside parents or just distinct numbers)
                    // e.g. "4 – 12 yrs (54 – 369)"

                    // Look for numbers NOT associated with the age part
                    // Helper to remove the age part and look for range
                    const lineWithoutAge = line.replace(ageMatch[0], '');

                    // Try to find "min - max" in the remaining string
                    const rangeMatch = lineWithoutAge.match(/(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)/);
                    if (rangeMatch) {
                        const min = parseFloat(rangeMatch[1]);
                        const max = parseFloat(rangeMatch[2]);
                        if (result < min) return { isAbnormal: true, direction: 'low' };
                        if (result > max) return { isAbnormal: true, direction: 'high' };
                        return { isAbnormal: false, direction: 'normal' }; // matched age, verified normal
                    }
                }
            }
        }
    }

    // Handle complex text-based ranges (e.g. Mantoux: "Lessthan 5 NEGATIVE", "6 - 14 POSITIVE")
    if (rangeStr.toUpperCase().includes('POSITIVE') || rangeStr.toUpperCase().includes('NEGATIVE')) {
        const lines = rangeStr.split(/[\n,;]/);
        // We only care if it falls into a POSITIVE bucket
        for (const line of lines) {
            const upperLine = line.toUpperCase().trim();
            if (upperLine.includes('POSITIVE') && !upperLine.includes('NEGATIVE')) {
                // Check for "min - max" format in this line
                const rangeMatch = line.match(/(\d+)\s*-\s*(\d+)/);
                if (rangeMatch) {
                    const min = parseFloat(rangeMatch[1]);
                    const max = parseFloat(rangeMatch[2]);
                    if (result >= min && result <= max) return { isAbnormal: true, direction: 'high' };
                }

                // Check for "min +" format (15 + STRONGLY POSITIVE)
                const plusMatch = line.match(/(\d+)\s*\+/);
                if (plusMatch) {
                    const min = parseFloat(plusMatch[1]);
                    if (result >= min) return { isAbnormal: true, direction: 'high' };
                }

                // Check for "> min" or "More than min"
                if (upperLine.startsWith('>') || upperLine.includes('MORE ')) {
                    const minMatch = line.match(/(\d+(\.\d+)?)/);
                    if (minMatch) {
                        const min = parseFloat(minMatch[0]);
                        if (result > min) return { isAbnormal: true, direction: 'high' };
                    }
                }
            }
        }
        // If it didn't match a positive line, it might be in a negative line or implied normal.
        // We don't mark NEGATIVE as abnormal usually (unless specifically asked).
        // For Mantoux, usually only Positive is highlighted.
    }

    // Handle Explicit "Low", "High", "Very High" labelled ranges (e.g. Triglycerides)
    // "Normal: <161\nHigh:161-199\nHypertriclyceridemic:200-499\nVery High : >499"
    if (/High|Low|Critical|Abnormal/i.test(rangeStr)) {
        const lines = rangeStr.split(/[\n,]/);
        for (const line of lines) {
            const cleanLine = line.trim();
            // Check for "High" or "Very High" or "Hypertriclyceridemic"
            if (/High|Hz|Hypertriclyceridemic|Critical|Abnormal/i.test(cleanLine) && !/Normal|Desirable/i.test(cleanLine)) {
                // It's an abnormal range definition. Check if result falls here.

                // Check "min - max" e.g. "161-199"
                const rangeMatch = cleanLine.match(/(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)/);
                if (rangeMatch) {
                    const min = parseFloat(rangeMatch[1]);
                    const max = parseFloat(rangeMatch[2]);
                    if (result >= min && result <= max) return { isAbnormal: true, direction: 'high' };
                }

                // Check "> min" e.g. "> 499"
                if (cleanLine.includes('>') || cleanLine.includes('More than')) {
                    const minMatch = cleanLine.match(/(\d+(?:\.\d+)?)/);
                    if (minMatch) {
                        const min = parseFloat(minMatch[0]);
                        if (result > min) return { isAbnormal: true, direction: 'high' };
                    }
                }
            }

            // Check for "Low"
            if (/Low/i.test(cleanLine) && !/Normal|Desirable/i.test(cleanLine)) {
                // Check "min - max" e.g. "Low: 10-20" unlikely but possible
                const rangeMatch = cleanLine.match(/(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)/);
                if (rangeMatch) {
                    const min = parseFloat(rangeMatch[1]);
                    const max = parseFloat(rangeMatch[2]);
                    if (result >= min && result <= max) return { isAbnormal: true, direction: 'low' };
                }

                // Check "< max" e.g. "Low: < 40"
                if (cleanLine.includes('<') || cleanLine.includes('Less than')) {
                    const maxMatch = cleanLine.match(/(\d+(?:\.\d+)?)/);
                    if (maxMatch) {
                        const max = parseFloat(maxMatch[0]);
                        if (result < max) return { isAbnormal: true, direction: 'low' };
                    }
                }
            }
        }
    }

    // Handle "min - max" format (e.g., "10.0 - 20.0" or "Healthy Adult : 70 - 110")

    // Handle "< max" format (e.g., "< 5.0") or "Lessthan35"
    if (cleanRange.startsWith('<') || cleanRange.replace(/\s/g, '').toUpperCase().includes('LESSTHAN')) {
        // Handle "Lessthan35" or "Less than 35"
        const lessThanMatch = cleanRange.match(/(?:<|LESS\s*THAN)\s*(\d+(\.\d+)?)/i);
        if (lessThanMatch) {
            const max = parseFloat(lessThanMatch[1]);
            if (!isNaN(max) && result >= max) return { isAbnormal: true, direction: 'high' }; // Generally if range is < max, then >= max is high
        }
        // Fallback for simple startsWith('<') if regex didn't catch it (though regex covers it)
        else if (cleanRange.startsWith('<')) {
            const maxStr = cleanRange.replace('<', '').trim();
            const maxMatch = maxStr.match(/(\d+(\.\d+)?)/);
            if (maxMatch) {
                const max = parseFloat(maxMatch[0]);
                if (!isNaN(max) && result >= max) return { isAbnormal: true, direction: 'high' };
            }
        }
    }
    // Handle "> min" format (e.g., "> 10.0")
    else if (cleanRange.startsWith('>')) {
        const minStr = cleanRange.replace('>', '').trim();
        const minMatch = minStr.match(/(\d+(\.\d+)?)/);
        if (minMatch) {
            const min = parseFloat(minMatch[0]);
            if (!isNaN(min) && result <= min) return { isAbnormal: true, direction: 'low' };
        }
    }

    // Handle "min - max" format (e.g., "10.0 - 20.0" or "Healthy Adult : 70 - 110")
    else if (cleanRange.includes('-') && !cleanRange.toUpperCase().includes('YEARS') && !cleanRange.toUpperCase().includes('YRS')) {
        const parts = cleanRange.split('-').map(p => parseFloat(p.trim()));
        // If simple parsing works (both are numbers)
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            if (result < parts[0]) return { isAbnormal: true, direction: 'low' };
            if (result > parts[1]) return { isAbnormal: true, direction: 'high' };
        } else {
            // Fallback: Try to extract numbers using regex if simple split failed (e.g. "Adult : 70 - 110")
            const rangeMatch = cleanRange.match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/);
            if (rangeMatch) {
                const min = parseFloat(rangeMatch[1]);
                const max = parseFloat(rangeMatch[2]);
                if (result < min) return { isAbnormal: true, direction: 'low' };
                if (result > max) return { isAbnormal: true, direction: 'high' };
            }
        }
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
            const PAGE_HEIGHT_PX = 1122;
            const docHeight = document.documentElement.scrollHeight;
            const totalPages = Math.ceil(docHeight / PAGE_HEIGHT_PX);
            const pagesArray = Array.from({ length: totalPages }, (_, i) => i + 1);
            setPages(pagesArray);
        };

        calculatePages();
        window.addEventListener('resize', calculatePages);
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
                        top: `${(page * 1122) - 40}px`,
                        right: '15mm',
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
    const [showHeader, setShowHeader] = useState(false);
    const [showNotes, setShowNotes] = useState(false);
    const [isSharing, setIsSharing] = useState(false);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    const handleSavePDF = async () => {
        if (!report) return;
        setIsGeneratingPdf(true);

        try {
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.width;
            const pageHeight = doc.internal.pageSize.height;
            const margin = 15;
            let currentY = margin;

            // Helper to load image
            const loadImage = (src: string): Promise<HTMLImageElement> => {
                return new Promise((resolve, reject) => {
                    const img = new Image();
                    img.crossOrigin = "Anonymous";
                    img.onload = () => resolve(img);
                    img.onerror = reject;
                    img.src = src;
                });
            };

            // 1. Header Images (if enabled)
            if (showHeader) {
                try {
                    // Try loading all header images
                    const [pclLogo, microscope, headerText] = await Promise.all([
                        loadImage('/pcl-spear-logo.png').catch(() => null),
                        loadImage('/microscope-icon.png').catch(() => null),
                        loadImage('/priya-header-v2.png').catch(() => null)
                    ]);

                    if (pclLogo) doc.addImage(pclLogo, 'PNG', 10, 10, 25, 25);
                    if (microscope) doc.addImage(microscope, 'PNG', pageWidth - 35, 10, 25, 25);
                    if (headerText) {
                        const aspect = headerText.width / headerText.height;
                        const w = 80;
                        const h = w / aspect;
                        doc.addImage(headerText, 'PNG', (pageWidth / 2) - (w / 2), 15, w, h);
                    }
                    currentY += 35;
                } catch (e) {
                    console.error("Error loading header images", e);
                }
            } else {
                // If no header, leave some space for pre-printed letterhead
                currentY += 35;
            }

            // 2. Patient Info Header
            // We use autoTable for layout, but invisible borders
            autoTable(doc, {
                startY: currentY,
                head: [],
                body: [
                    [
                        { content: `SID No: ${report.sid_no || '-'}`, styles: { fontStyle: 'bold' } },
                        { content: `Patient ID: ${report.patient_id || '-'}`, styles: { fontStyle: 'bold' } },
                        { content: `Branch: ${report.branch || 'Tiruchendur'}`, styles: { fontStyle: 'bold' } }
                    ],
                    [
                        { content: `Patient Name: ${report.patient_name}`, styles: { fontStyle: 'bold' } },
                        { content: `Age / Sex: ${report.age} Y / ${report.sex}`, styles: { fontStyle: 'bold' } },
                        { content: `Ref. By: ${report.referred_by || '-'}`, styles: { fontStyle: 'bold' } }
                    ],
                    [
                        { content: `Collected: ${formatDate(report.collected_date)}`, styles: { fontStyle: 'bold' } },
                        { content: `Received: ${formatDate(report.received_date)}`, styles: { fontStyle: 'bold' } },
                        { content: `Reported: ${formatDate(report.reported_date)}`, styles: { fontStyle: 'bold' } }
                    ]
                ],
                theme: 'plain',
                styles: { fontSize: 9, cellPadding: 1, overflow: 'visible' },
                columnStyles: {
                    0: { cellWidth: pageWidth / 3 - 10 },
                    1: { cellWidth: pageWidth / 3 - 10 },
                    2: { cellWidth: pageWidth / 3 - 10 }
                },
                margin: { left: margin, right: margin }
            });

            currentY = (doc as any).lastAutoTable.finalY + 5;

            // Divider Line
            doc.setLineWidth(0.1); // Thin line
            doc.setDrawColor(150, 150, 150); // Gray color
            doc.line(margin, currentY, pageWidth - margin, currentY);
            currentY += 10;

            // Title
            doc.setFontSize(14);
            doc.setTextColor(0, 0, 0); // Black
            doc.setFont("helvetica", "bold");
            doc.text("Final Test Report", pageWidth / 2, currentY, { align: 'center' });
            currentY += 8;

            // 3. Main Results Table Data Preparation
            const tableBody: any[] = [];

            report.sections.forEach(section => {
                if (!section.tests || section.tests.length === 0) return;

                // Section Header
                tableBody.push([{
                    content: section.section_name || 'SECTION',
                    colSpan: 4,
                    styles: { fillColor: [240, 240, 240], fontStyle: 'bold', halign: 'center' }
                }]);

                // Calculate Mantoux Validity for this section
                const hasDuration = section.tests.some(t => {
                    const tName = t.test_name ? t.test_name.trim().toLowerCase() : '';
                    const tResult = t.result ? t.result.trim() : '';
                    return tName === 'duration' && tResult.length > 0;
                });
                const hasInduration = section.tests.some(t => {
                    const tName = t.test_name ? t.test_name.trim().toLowerCase() : '';
                    const tResult = t.result ? t.result.trim() : '';
                    return tName === 'induration' && tResult.length > 0;
                });
                const isMantouxValid = hasDuration && hasInduration;

                section.tests.forEach(test => {
                    // 1. GLOBAL FILTER: Check Tuberculin Visibility First
                    const normalizedTestName = test.test_name ? test.test_name.trim().toLowerCase() : '';
                    const isTuberculinDose = normalizedTestName === 'tuberculindose';
                    const isTuberculinHeader = normalizedTestName === 'tuberculin skin (mantoux) test' || normalizedTestName.includes('mantoux');

                    if ((isTuberculinDose || isTuberculinHeader) && !isMantouxValid) {
                        return; // Skip rendering entirely
                    }

                    // Check special conditions like CROSS MATCHING empty result
                    if (test.test_name === 'CROSS MATCHING TEST' && (!test.result || !test.result.trim())) return;

                    // Clean result first for BOTH analysis and display
                    let cleanResult = test.result;
                    if (cleanResult) {
                        cleanResult = cleanResult.replace(/%/g, '').trim();
                        // Replace spaces and non-breaking spaces
                        if (/^[\d\.\s\u00A0]+$/.test(cleanResult)) {
                            cleanResult = cleanResult.replace(/[\s\u00A0]/g, '');
                        }
                    }

                    const analysis = analyzeResult(cleanResult, test.reference_range, report.sex, report.age);
                    const isBold = analysis.isAbnormal;

                    // Row Type Note
                    if (test.row_type === 'note') {
                        tableBody.push([{ content: test.test_name, colSpan: 4, styles: { fontStyle: 'bold', halign: 'left' } }]);
                        return;
                    }

                    let displayResult = cleanResult;
                    let displayUnits = test.units || '';

                    // Special handling for TuberculinDose: Result = "0.1 ml of 1 TU PPD", Units = ""
                    if (test.test_name === 'TuberculinDose') {
                        displayResult = `${cleanResult} ${test.units || ''}`.trim();
                        displayUnits = '';
                    }

                    // Regular Row
                    tableBody.push([
                        { content: `${test.test_name}\n${test.specimen ? `(${test.specimen})` : ''}`, styles: { fontStyle: 'bold' } },
                        {
                            // Pass indicator data to cell for custom drawing in didDrawCell
                            content: displayResult,
                            styles: { fontStyle: isBold ? 'bold' : 'normal', halign: 'center' },
                            indicator: analysis.isAbnormal ? analysis.direction : null
                        },
                        { content: displayUnits, styles: { halign: 'center' } },
                        { content: `${(test.reference_range || '').replace(/\\n/g, '\n')}\n${test.method ? `(${test.method})` : ''}`, styles: { fontSize: 8 } }
                    ]);

                    // Notes
                    if (test.notes) {
                        tableBody.push([{ content: `Note: ${test.notes}`, colSpan: 4, styles: { fontStyle: 'italic', fontSize: 8, textColor: [100, 100, 100] } }]);
                    }
                });
            });

            // 4. Generate Table
            autoTable(doc, {
                startY: currentY,
                head: [[
                    'Test Name / Specimen',
                    'Result',
                    'Units',
                    'Reference Range / Method'
                ]],
                body: tableBody,
                theme: 'grid',
                headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: 'bold' },
                styles: { fontSize: 9, cellPadding: 2, valign: 'middle', lineColor: [200, 200, 200] },
                columnStyles: {
                    0: { cellWidth: '40%' },
                    1: { cellWidth: '15%', halign: 'center' },
                    2: { cellWidth: '15%', halign: 'center' },
                    3: { cellWidth: '30%' }
                },
                rowPageBreak: 'avoid', // IMPORTANT: Avoid splitting rows
                margin: { top: 50, bottom: 40, left: margin, right: margin }, // Top margin for header space on every page
                didDrawCell: (data) => {
                    const cellRaw = data.cell.raw as any;
                    if (data.section === 'body' && cellRaw && cellRaw.indicator) {
                        const cell = data.cell;
                        const textWidth = cell.getTextPos().x - cell.x + doc.getTextWidth(cell.text[0] || '');
                        // The above calculation might be tricky depending on alignment. 
                        // Easier: Just put it to the right of the cell content, or fixed position?
                        // halign is center. 

                        const centerX = cell.x + cell.width / 2;
                        const textW = doc.getTextWidth(String(cell.text));
                        const arrowX = centerX + textW / 2 + 2; // 2mm padding
                        const arrowY = cell.y + cell.height / 2;

                        doc.setFillColor(0, 0, 0); // Black arrow

                        if (cellRaw.indicator === 'high') {
                            // Up Triangle
                            doc.triangle(arrowX, arrowY + 1, arrowX + 2, arrowY + 1, arrowX + 1, arrowY - 1, 'F');
                        } else {
                            // Down Triangle
                            doc.triangle(arrowX, arrowY - 1, arrowX + 2, arrowY - 1, arrowX + 1, arrowY + 1, 'F');
                        }
                    }
                },
                didDrawPage: async (data) => {
                    // Footer on every page
                    const footerY = pageHeight - 35;

                    // Signature removed from footer - moved to end of report
                    // Page Number
                    const pageNum = String((doc as any).internal.getNumberOfPages());
                    doc.setFontSize(8);
                    doc.text(pageNum, pageWidth - margin, pageHeight - 5, { align: 'right' });

                    if (showHeader) {
                        doc.setFontSize(8);
                        doc.text("Processing Location: 137/54 Ground Floor, Mela Ratha Veethi, Tiruchendur", pageWidth / 2, pageHeight - 10, { align: 'center' });
                    }
                }
            });

            // End of Report Note
            if (report.comments) {
                const finalY = (doc as any).lastAutoTable.finalY + 10;
                doc.setFontSize(10);
                doc.setFont("helvetica", "bold");
                doc.text(`NOTE: ${report.comments}`, margin, finalY);
            }

            // --- Signature Block (End of Report) ---
            let sigY = (doc as any).lastAutoTable.finalY + (report.comments ? 25 : 15);

            // Ensure space for signature
            if (sigY > pageHeight - 40) {
                doc.addPage();
                sigY = 40;
            }

            // "Verified by" (Removed from left)

            // Signature Image & Text on Right
            try {
                const signature = await loadImage('/signature-lalitha.jpg').catch(() => null);
                if (signature) {
                    doc.addImage(signature, 'JPEG', pageWidth - 50, sigY, 30, 15);
                }
            } catch (e) { }

            doc.setLineWidth(0.5);
            doc.line(pageWidth - 60, sigY + 16, pageWidth - 15, sigY + 16); // Line

            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            doc.text("Verified by", pageWidth - 37.5, sigY + 21, { align: 'center' }); // Added Verified by

            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            doc.text("K.LALITHA", pageWidth - 37.5, sigY + 26, { align: 'center' }); // Shifted down

            doc.setFontSize(8);
            doc.text("BSC (MLT)", pageWidth - 37.5, sigY + 30, { align: 'center' }); // Shifted down

            doc.setFont("helvetica", "normal");
            doc.text("Lab Incharge", pageWidth - 37.5, sigY + 34, { align: 'center' }); // Shifted down

            const endY = sigY + 40;
            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            doc.text("*** End of Report ***", pageWidth / 2, endY, { align: 'center' });

            doc.save(`Lab_Report_${report.sid_no || 'Draft'}.pdf`);

        } catch (error: any) {
            console.error('Error generating PDF:', error);
            alert('Failed to save PDF: ' + error.message);
        } finally {
            setIsGeneratingPdf(false);
        }
    };

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
                console.error('Fetch error details:', data);
                throw new Error(data.details || data.error || 'Failed to fetch report');
            }

            setReport(data.report);
            setShowHeader(data.report.include_header ?? false);
            setShowNotes(data.report.include_notes ?? false);
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

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this report? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await fetch(`/api/lab-reports/${reportId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Failed to delete report');
            }

            // Redirect to reports list
            router.push('/dashboard/reports');
        } catch (error: any) {
            console.error('Error deleting report:', error);
            alert('Failed to delete report: ' + error.message);
        }
    };

    const handleWhatsAppShare = async () => {
        setIsSharing(true);
        try {
            const element = reportRef.current;
            if (!element || !report) throw new Error('Report element not found');

            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff',
                height: element.scrollHeight,
                windowHeight: element.scrollHeight
            } as any);

            const imgData = canvas.toDataURL('image/jpeg', 0.9);
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
            const pdfBlob = pdf.output('blob');
            const fileName = `Lab_Report_${report.patient_name.replace(/\s+/g, '_')}.pdf`;
            const file = new File([pdfBlob], fileName, { type: 'application/pdf' });

            if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: `Lab Report - ${report.patient_name}`,
                    text: `Lab report for ${report.patient_name}`,
                });
            } else {
                const url = URL.createObjectURL(pdfBlob);
                const link = document.createElement('a');
                link.href = url;
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                alert('Success! The PDF report has been downloaded to your computer.\n\nNow opening WhatsApp - please attach the downloaded file to your chat.');
                const message = `Sharing lab report for ${report.patient_name}. (PDF downloaded, please attach)`;
                window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
            }
        } catch (error: any) {
            console.error('Detailed Error in PDF Generation:', error);
            alert('Error generating PDF: ' + (error.message || 'Unknown error'));
        } finally {
            setIsSharing(false);
        }
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', {
            day: '2-digit', month: '2-digit', year: 'numeric',
        }).replace(/\//g, '/') + ' / ' + date.toLocaleTimeString('en-GB', {
            hour: '2-digit', minute: '2-digit'
        });
    };

    if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="text-foreground">Loading report...</div></div>;
    if (!report) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="text-foreground">Report not found</div></div>;

    const renderTestRows = (testsToRender: Test[], allTests: Test[], sectionName: string, startIndex: number) => {
        return testsToRender.map((test, localIndex) => {
            const index = startIndex + localIndex;

            // Condition to hide CROSS MATCHING TEST if result is empty
            if (test.test_name === 'CROSS MATCHING TEST' && (!test.result || test.result.trim() === '')) {
                return null;
            }

            // Logic to conditionally hide Tuberculin/Mantoux test/header if Duration/Induration are missing
            const mantouxItems = ['TuberculinDose', 'Duration', 'Induration', 'Tuberculin skin (Mantoux) Test'];
            if (mantouxItems.includes(test.test_name)) {
                const durationTest = allTests.find(t => t.test_name === 'Duration');
                const indurationTest = allTests.find(t => t.test_name === 'Induration');
                const hasMantouxResults = (durationTest?.result && durationTest.result.trim() !== '') &&
                    (indurationTest?.result && indurationTest.result.trim() !== '');

                if (!hasMantouxResults) return null;
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

            const analysis = analyzeResult(test.result, test.reference_range, report.sex, report.age);
            const template = getTestTemplate(sectionName, test.test_name);

            // Helper to check if a header already exists as a physical row
            const hasGroupHeader = (name: string) => allTests.some(t => t.test_name.toUpperCase() === name.toUpperCase() && t.row_type === 'note');

            const prevTest = allTests[index - 1];

            // Header Logics
            const malariaTests = ['MP - CARD METHOD', 'MF - CARD METHOD', 'BLOOD GROUPING', 'RH - TYPING', 'CROSS MATCHING TEST'];
            const isMalariaTest = malariaTests.includes(test.test_name);
            const prevIsMalaria = prevTest && malariaTests.includes(prevTest.test_name);
            const showMalariaHeader = isMalariaTest && !prevIsMalaria && !hasGroupHeader('MALARIA PANEL');

            const isWidalTest = test.test_name.includes('SALMONELLA');
            const prevIsWidal = prevTest && prevTest.test_name.includes('SALMONELLA');
            const showWidalHeader = isWidalTest && !prevIsWidal && !hasGroupHeader('WIDAL-SLIDE METHOD');

            const denguePanelTests = ['DENGUE NS1 ANTIGEN', 'DENGUE ANTIBODY IgG', 'DENGUE ANTIBODY IgM'];
            const showDenguePanelHeader = denguePanelTests.includes(test.test_name) &&
                !denguePanelTests.includes(prevTest?.test_name || '') &&
                !hasGroupHeader('Dengue Panel');

            const showUrineHeader = sectionName === 'CLINICAL PATHOLOGY' && index === 0;
            const showMantouxHeader = test.test_name === 'TuberculinDose' && !hasGroupHeader('Tuberculin skin (Mantoux) Test');
            const showElectrolytesHeader = test.test_name === 'Sodium.' && !hasGroupHeader('ELECTROLYTES');
            const showLipidProfileHeader = test.test_name === 'Cholesterol,Total' && !hasGroupHeader('LIPID PROFILE');
            const showRFTHeader = test.test_name === 'Blood Urea' && !hasGroupHeader('RENAL FUNCTION TEST');

            const boneHealthTests = ['Calcium', 'Phosphorous'];
            const showBoneHealthHeader = boneHealthTests.includes(test.test_name) &&
                !boneHealthTests.includes(prevTest?.test_name || '') &&
                !hasGroupHeader('Bone Health');

            const showVDRLHeader = test.test_name === 'Syphilis Antibody' && !hasGroupHeader('VDRL');
            const showCardiacTroponin2Header = test.test_name === 'Troponin I' && !hasGroupHeader('Cardiac Troponin');

            const diabeticScreeningTests = ['Glucose, Fasting', 'GCT (75 GMS)', 'Glucose Random', 'Glucose Post Prandial'];
            const showDiabeticScreeningHeader = diabeticScreeningTests.includes(test.test_name) &&
                !diabeticScreeningTests.includes(prevTest?.test_name || '') &&
                !hasGroupHeader('DIABETIC SCREENING');

            const showPregnancyHeader = test.test_name === 'PREGNANCY CARD TEST' && !hasGroupHeader('PREGNANCY TEST');

            const hba1cTests = ['Glycosylated Haemoglobin (HbA1c)', 'Estimated Average Glucose (eAG)'];
            const showHbA1cHeader = hba1cTests.includes(test.test_name) &&
                !hba1cTests.includes(prevTest?.test_name || '') &&
                !hasGroupHeader('HbA1c');

            const isSpGravity = test.test_name.toUpperCase().includes('SP.GRAVITY') || test.test_name.toUpperCase().includes('SPECIFIC GRAVITY');

            let isHbA1cBold = false;
            if (test.test_name === 'Glycosylated Haemoglobin (HbA1c)' && test.result) {
                const val = parseFloat(test.result);
                if (!isNaN(val) && val >= 5.7) isHbA1cBold = true;
            }

            return (
                <React.Fragment key={test.id}>
                    {showUrineHeader && <tr className="border-b border-gray-400"><td colSpan={4} className="p-2 print:p-1 font-bold text-left text-black bg-gray-50 print:bg-transparent uppercase tracking-wider pl-4">Urine complete analysis</td></tr>}
                    {showMantouxHeader && <tr className="border-b border-gray-400"><td colSpan={4} className="p-2 print:p-1 font-bold text-left text-black bg-gray-50 print:bg-transparent uppercase tracking-wider pl-4">Tuberculin skin (Mantoux) Test</td></tr>}
                    {showPregnancyHeader && <tr className="border-b border-gray-400"><td colSpan={4} className="p-2 print:p-1 font-bold text-left text-black bg-gray-50 print:bg-transparent uppercase tracking-wider pl-4">PREGNANCY TEST</td></tr>}
                    {showBoneHealthHeader && <tr className="border-b border-gray-400"><td colSpan={4} className="p-2 print:p-1 font-bold text-left text-black bg-gray-50 print:bg-transparent uppercase tracking-wider pl-4">Bone Health</td></tr>}
                    {showLipidProfileHeader && <tr className="border-b border-gray-400"><td colSpan={4} className="p-2 print:p-1 font-bold text-left text-black bg-gray-50 print:bg-transparent uppercase tracking-wider pl-4">LIPID PROFILE</td></tr>}
                    {showRFTHeader && <tr className="border-b border-gray-400"><td colSpan={4} className="p-2 print:p-1 font-bold text-left text-black bg-gray-50 print:bg-transparent uppercase tracking-wider pl-4">RENAL FUNCTION TEST</td></tr>}
                    {showDiabeticScreeningHeader && <tr className="border-b border-gray-400"><td colSpan={4} className="p-2 print:p-1 font-bold text-left text-black bg-gray-50 print:bg-transparent uppercase tracking-wider pl-4">DIABETIC SCREENING</td></tr>}
                    {showHbA1cHeader && <tr className="border-b border-gray-400"><td colSpan={4} className="p-2 print:p-1 font-bold text-left text-black bg-gray-50 print:bg-transparent uppercase tracking-wider pl-4">HbA1c</td></tr>}
                    {showCardiacTroponin2Header && <tr className="border-b border-gray-400"><td colSpan={4} className="p-2 print:p-1 font-bold text-left text-black bg-gray-50 print:bg-transparent uppercase tracking-wider pl-4">Cardiac Troponin</td></tr>}
                    {showElectrolytesHeader && <tr className="border-b border-gray-400"><td colSpan={4} className="p-2 print:p-1 font-bold text-left text-black bg-gray-50 print:bg-transparent uppercase tracking-wider pl-4">ELECTROLYTES</td></tr>}
                    {showMalariaHeader && <tr className="border-b border-gray-400"><td colSpan={4} className="p-2 print:p-1 font-bold text-left text-black bg-gray-50 print:bg-transparent uppercase tracking-wider pl-4">Malaria Panel</td></tr>}
                    {showWidalHeader && <tr className="border-b border-gray-400"><td colSpan={4} className="p-2 print:p-1 font-bold text-left text-black bg-gray-50 print:bg-transparent uppercase tracking-wider pl-4">WIDAL-SLIDE METHOD</td></tr>}
                    {showVDRLHeader && <tr className="border-b border-gray-400"><td colSpan={4} className="p-2 print:p-1 font-bold text-left text-black bg-gray-50 print:bg-transparent uppercase tracking-wider pl-4">VDRL</td></tr>}
                    {showDenguePanelHeader && <tr className="border-b border-gray-400"><td colSpan={4} className="p-2 print:p-1 font-bold text-left text-black bg-gray-50 print:bg-transparent uppercase tracking-wider pl-4">Dengue Panel</td></tr>}

                    <tr className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="p-2 print:p-1 align-top border-r border-gray-300">
                            <div className="font-medium text-black">{test.test_name}</div>
                            {test.specimen && <div className="text-xs text-gray-600 mt-0.5">{test.specimen}</div>}
                        </td>
                        <td className={`p-2 print:p-1 align-top text-center border-r border-gray-300 relative ${analysis.isAbnormal || isHbA1cBold || isSpGravity ? 'font-bold' : 'font-normal'}`}>
                            <div className="flex items-center justify-center h-full relative w-full gap-1">
                                <span>{test.test_name === 'TuberculinDose' ? `${test.result} ${test.units}` : test.result}</span>
                                {analysis.isAbnormal && (
                                    <span className="text-xs font-bold absolute right-0 top-1/2 -translate-y-1/2 print:static print:translate-y-0 print:ml-1 flex items-center">
                                        {analysis.direction === 'high' ? (
                                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-gray-900" aria-hidden="true"><path d="M12 4l-8 8h16l-8-8z" /></svg> // Simple Triangle Up
                                        ) : (
                                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-gray-900" aria-hidden="true"><path d="M12 20l8-8H4l8 8z" /></svg> // Simple Triangle Down
                                        )}
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

                    {/* P-LCR Special Signature logic - Keep inside the row structure if possible, but for sticky footer we handle main signature separately */}
                    {test.test_name === 'P-LCR' && (
                        <tr>
                            <td colSpan={4} className="p-0 border-r border-l border-gray-300">
                                <div className="flex justify-between items-end mt-8 mb-4 px-4">
                                    <div className="text-sm">
                                        <div className="border-t border-gray-400 pt-1 w-48">
                                            <span className="text-xs text-black font-semibold">Verified by</span>
                                        </div>
                                    </div>
                                    <div className="text-sm flex flex-col items-center">
                                        <img src="/signature-lalitha.jpg" alt="Signature" className="h-10 mb-[-5px] object-contain" />
                                        <div className="border-t border-gray-400 pt-1 w-48 text-center text-black">
                                            <div className="font-bold uppercase">K.LALITHA</div>
                                            <div className="text-[10px] font-bold">BSC (MLT)</div>
                                            <div className="text-[10px] font-semibold">Lab Incharge</div>
                                        </div>
                                    </div>
                                </div>
                            </td>
                        </tr>
                    )}

                    {test.notes && (
                        <tr key={`${test.id}-note`} className="notes-section-row">
                            <td colSpan={4} className="border-b border-gray-300 p-1 text-xs text-black italic bg-gray-50/50">
                                <span className="font-bold not-italic">Note: </span>
                                <FormattedNote text={test.notes} />
                            </td>
                        </tr>
                    )}
                    {showNotes && template?.clinicalNote && (
                        <tr key={`${test.id}-clinical-note`} className="notes-section-row">
                            <td colSpan={4} className="border-b border-gray-300 p-2 text-[10px] text-black bg-gray-100/50">
                                <span className="font-bold">Note: </span>
                                <FormattedNote text={template.clinicalNote} />
                            </td>
                        </tr>
                    )}
                </React.Fragment>
            );
        });
    };

    return (
        <>
            <style jsx global>{`
                @media print {
                    .report-section { page-break-inside: auto; break-inside: auto; }
                    table thead { display: table-header-group; }
                    .section-header-row { page-break-after: avoid; break-after: avoid; }
                    /* Scope this to inner test tables only to prevent keeping the outer main row (entire report) on one page */
                    .report-section table tbody tr { page-break-inside: avoid; break-inside: avoid; }
                    tr:has(td[colspan="4"]) { page-break-after: avoid; break-after: avoid; }
                    table thead { page-break-inside: avoid; page-break-after: avoid; }
                    * { widows: 2; orphans: 2; }
/* .report-content-wrapper { display: flex; flex-direction: column; min-height: 100vh; } REMOVED */
                    .report-signature-footer { margin-top: auto; page-break-inside: avoid; }
                    
                    /* Sticky footer styles */
                    .sticky-footer-wrapper {
                        break-inside: avoid;
                        page-break-inside: avoid;
                        display: block;
                    }
                }
            `}</style>

            <div className="min-h-screen bg-background print:min-h-0 print:h-auto print:bg-white print:overflow-visible">
                {/* Action Bar */}
                <div className="no-print sticky top-0 z-50 bg-secondary border-b border-border p-4 flex items-center justify-between">
                    <button onClick={() => router.push('/dashboard/lab-reports/create')} className="px-4 py-2 bg-background hover:bg-background/80 text-foreground rounded-md transition-colors border border-border">← Back to Form</button>
                    <div className="flex gap-3">
                        <button onClick={() => router.push(`/dashboard/lab-reports/edit/${reportId}`)} className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-md transition-colors font-medium">✏️ Edit Report</button>
                        <button onClick={handleDelete} className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-500 rounded-md transition-colors font-medium">🗑️ Delete</button>
                        <button onClick={handlePrint} className="px-4 py-2 bg-primary/20 hover:bg-primary/30 text-primary rounded-md transition-colors font-medium">🖨️ Print</button>
                        <button onClick={handleSavePDF} disabled={isGeneratingPdf} className={`px-4 py-2 rounded-md transition-colors font-medium flex items-center gap-2 ${isGeneratingPdf ? 'bg-gray-500/20 text-gray-500 cursor-not-allowed' : 'bg-primary/20 hover:bg-primary/30 text-primary'}`}>{isGeneratingPdf ? '⏳ Saving...' : '💾 Save PDF'}</button>
                        <button onClick={() => setShowHeader(!showHeader)} className="px-4 py-2 bg-secondary hover:bg-secondary/80 text-foreground rounded-md transition-colors border border-border">{showHeader ? '👁️ Hide Header' : '🚫 Show Header'}</button>
                        <button onClick={() => setShowNotes(!showNotes)} className="px-4 py-2 bg-secondary hover:bg-secondary/80 text-foreground rounded-md transition-colors border border-border">{showNotes ? '📝 Hide Notes' : '📋 Show Notes'}</button>
                        <button onClick={handleWhatsAppShare} disabled={isSharing} className={`px-4 py-2 rounded-md transition-colors font-medium flex items-center gap-2 ${isSharing ? 'bg-gray-500/20 text-gray-500 cursor-not-allowed' : 'bg-green-500/20 hover:bg-green-500/30 text-green-500'}`}>{isSharing ? '⌛ Processing...' : '📱 Share on WhatsApp'}</button>
                    </div>
                </div>

                <div ref={reportRef} className={`report-container report-content-wrapper relative flex flex-col mx-auto bg-white text-black p-8 my-6 print:shadow-none print:m-0 print:my-0 print:p-0 print:block print:overflow-hidden ${report.sections.some(s => s.section_name?.toUpperCase().includes('RENAL')) ? 'multi-page-report' : ''}`}>
                    <table className="w-full">
                        <thead>
                            <tr>
                                <td>
                                    {showHeader && <div className="absolute top-0 bottom-0 left-0 w-8 flex items-center justify-center pointer-events-none print:left-0 z-10"><p className="-rotate-90 text-[10px] text-gray-500 tracking-[0.2em] font-medium whitespace-nowrap opacity-80 uppercase">www.priyalabs.in</p></div>}
                                    {showHeader ? (
                                        <div className="title-header mb-6 pb-10 border-b border-gray-300 flex justify-center relative print:mb-3 print:pb-6 min-h-[10rem]">
                                            <div className="absolute top-0 left-0"><img src="/pcl-spear-logo.png" alt="PCL Logo" className="h-40 w-auto" /></div>
                                            <div className="absolute top-0 right-0"><img src="/microscope-icon.png" alt="Microscope" className="h-40 w-auto mix-blend-multiply filter contrast-125" /></div>
                                            <div className="flex justify-center items-center mt-2"><img src="/priya-header-v2.png" alt="Priya Clinical Lab" className="h-[8.5rem] w-auto object-contain" /></div>
                                        </div>
                                    ) : <div className="mb-6 print:mb-0 w-full" style={{ height: '40mm' }} aria-hidden="true"></div>}
                                </td>
                            </tr>
                        </thead>
                        <tfoot>
                            <tr>
                                <td>
                                    <div className={`report-signature-footer mt-auto pt-4 border-t border-gray-300 bg-white relative ${!showHeader ? 'print:border-0' : ''}`} style={{ minHeight: showHeader ? '100px' : '22mm' }}>
                                        {showHeader && <div className="absolute left-0 top-4"><img src="/qr-code.png" alt="QR Code" className="h-16 w-16" /></div>}
                                        <div className="text-center text-sm pb-4">
                                            <p className="leading-tight" style={{ display: 'inline-block', width: '100%' }}>{showHeader && <><span className="text-xs block"><span className="font-semibold">Processing Location:</span> 137/54 Ground Floor, Mela Ratha Veethi, Tiruchendur, Tamil Nadu 628215, India</span><span className="text-xs block mt-1"><span className="font-semibold">Email:</span> clinicallaboratorypriya@gmail.com | <span className="font-semibold">Ph No:</span> +91 79042 26600</span></>}</p>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        </tfoot>
                        <tbody>
                            <tr>
                                <td>
                                    <div className="report-header mb-6 print:mb-3">
                                        <div className="text-sm border-b pb-4 border-gray-300">
                                            <div className="grid grid-cols-3 gap-4 mb-2"><div><strong>SID No:</strong> {report.sid_no}</div><div><strong>Patient ID:</strong> {report.patient_id}</div><div><strong>Branch:</strong> {report.branch || 'Tiruchendur'}</div></div>
                                            <div className="grid grid-cols-3 gap-4 mb-2"><div><strong>Patient Name:</strong> {report.patient_name}</div><div><strong>Age / Sex:</strong> {report.age} Y / {report.sex}</div><div><strong>Ref. By:</strong> {report.referred_by}</div></div>
                                            <div className="grid grid-cols-3 gap-4"><div><strong>Collected:</strong> {formatDate(report.collected_date)}</div><div><strong>Received:</strong> {formatDate(report.received_date)}</div><div><strong>Reported:</strong> {formatDate(report.reported_date)}</div></div>
                                        </div>
                                    </div>
                                    <div className="text-center my-4 print:my-2"><h1 className="text-xl font-bold">Final Test Report</h1></div>

                                    {report.sections.filter((section) => section.tests && section.tests.length > 0).map((section) => {
                                        // SPLIT LOGIC: Last 2 tests are sticky
                                        const splitIndex = Math.max(0, section.tests.length - 2);
                                        const mainTests = section.tests.slice(0, splitIndex);
                                        const stickyTests = section.tests.slice(splitIndex);

                                        return (
                                            <div key={section.id} className={`report-section ${section.section_name?.toUpperCase().includes('RENAL') ? 'page-break' : ''}`}>

                                                {/* Main Table (Non-sticky part) - Flows normally */}
                                                {mainTests.length > 0 && (
                                                    <table className="w-full border-collapse border-x border-b border-gray-400 text-sm print:text-xs mb-0">
                                                        <thead>
                                                            <tr className="hidden print:table-row h-6 bg-white"><th colSpan={4} className="bg-white" style={{ borderLeft: 'hidden', borderRight: 'hidden', borderTop: 'hidden' }}></th></tr>
                                                            <tr className="bg-gray-100 print:bg-gray-50 border-y border-gray-400">
                                                                <th className="p-2 print:p-1 text-left w-[40%] font-bold text-black border-r border-gray-300">Test Name / Specimen</th>
                                                                <th className="p-2 print:p-1 text-center w-[15%] font-bold text-black border-r border-gray-300">Result</th>
                                                                <th className="p-2 print:p-1 text-center w-[15%] font-bold text-black border-r border-gray-300">Units</th>
                                                                <th className="p-2 print:p-1 text-left w-[30%] font-bold text-black">Reference Range / Method</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            <tr className="border-b border-gray-400 section-header-row"><td colSpan={4} className="p-2 print:p-1 font-bold text-center text-black bg-gray-50 print:bg-transparent uppercase tracking-wider">{(() => { const name = section.section_name; const len = name.length; if (len > 0 && len % 2 === 0) { const half = len / 2; const first = name.substring(0, half); const second = name.substring(half); if (first.toLowerCase() === second.toLowerCase()) return first; } return name; })()}</td></tr>
                                                            {renderTestRows(mainTests, section.tests, section.section_name, 0)}

                                                            {mainTests.length === 0 && (
                                                                <tr className="border-b border-gray-400 section-header-row"><td colSpan={4} className="p-2 print:p-1 font-bold text-center text-black bg-gray-50 print:bg-transparent uppercase tracking-wider">{section.section_name}</td></tr>
                                                            )}
                                                        </tbody>
                                                    </table>
                                                )}

                                                {/* Sticky Footer Wrapper: Contains Sticky Tests + Signature ONLY */}
                                                <div className="sticky-footer-wrapper">
                                                    {/* Sticky Table (Last tests + Signature) */}
                                                    {/* We use a separate table but ensure column widths match. We hide header to keep alignment. */}
                                                    <div className="break-inside-avoid page-break-inside-avoid">
                                                        <table className="w-full border-collapse border-x border-b border-gray-400 text-sm print:text-xs">
                                                            {/* Invisible Header to enforce widths */}
                                                            {/* Render Header logic: If mainTests is empty, we MUST render the full header here. Otherwise invisible to enforce column widths. */}
                                                            {mainTests.length === 0 ? (
                                                                <thead>
                                                                    <tr className="bg-gray-100 print:bg-gray-50 border-y border-gray-400">
                                                                        <th className="p-2 print:p-1 text-left w-[40%] font-bold text-black border-r border-gray-300">Test Name / Specimen</th>
                                                                        <th className="p-2 print:p-1 text-center w-[15%] font-bold text-black border-r border-gray-300">Result</th>
                                                                        <th className="p-2 print:p-1 text-center w-[15%] font-bold text-black border-r border-gray-300">Units</th>
                                                                        <th className="p-2 print:p-1 text-left w-[30%] font-bold text-black">Reference Range / Method</th>
                                                                    </tr>
                                                                </thead>
                                                            ) : (
                                                                <thead className="invisible h-0 overflow-hidden leading-none">
                                                                    <tr className="h-0 p-0 m-0 border-0">
                                                                        <th className="p-0 m-0 w-[40%] border-0"></th>
                                                                        <th className="p-0 m-0 w-[15%] border-0"></th>
                                                                        <th className="p-0 m-0 w-[15%] border-0"></th>
                                                                        <th className="p-0 m-0 w-[30%] border-0"></th>
                                                                    </tr>
                                                                </thead>
                                                            )}
                                                            <tbody>
                                                                {/* Only render header if main table was empty (unlikely, but safe) */}
                                                                {mainTests.length === 0 && (
                                                                    <tr className="border-b border-gray-400 section-header-row"><td colSpan={4} className="p-2 print:p-1 font-bold text-center text-black bg-gray-50 print:bg-transparent uppercase tracking-wider">{section.section_name}</td></tr>
                                                                )}
                                                                {renderTestRows(stickyTests, section.tests, section.section_name, splitIndex)}
                                                            </tbody>
                                                        </table>

                                                        {/* Signature inside same container - Only show if P-LCR is NOT the last test (if it is, it handles its own signature) */}
                                                        {!section.tests[section.tests.length - 1]?.test_name.includes('P-LCR') && (
                                                            <div className="flex justify-between items-end mt-2 mb-2 px-2">
                                                                <div className="text-xs"><div className="border-t border-gray-400 pt-1 w-32"><span className="text-[10px] text-black font-bold">Verified by</span></div></div>
                                                                <div className="text-xs flex flex-col items-center">
                                                                    <img src="/signature-lalitha.jpg" alt="Signature" className="h-12 mb-[-5px] object-contain" />
                                                                    <div className="border-t border-gray-400 pt-1 w-32 text-center text-black">
                                                                        <p className="font-bold text-xs">K.LALITHA</p>
                                                                        <p className="text-[10px] font-bold">BSC (MLT)</p>
                                                                        <p className="text-[10px]">Lab Incharge</p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                        );
                                    })}

                                    {report.comments && <div className="mt-8 mb-4 px-2 text-left"><p className="font-bold text-sm uppercase">NOTE: {report.comments}</p></div>}
                                    <div className="text-center text-sm pb-4 mt-8 print:mt-1 break-inside-avoid page-break-inside-avoid"><p className="font-bold">*** End of Report ***</p></div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div >
            </div >
            <PrintPageNumbers />
        </>
    );
}
