// @ts-nocheck
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../lib/auth';
import { motion, AnimatePresence } from 'framer-motion';
import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Report {
    id: string;
    sid_no: string;
    patient_id: string;
    branch: string;
    patient_name: string;
    age: string;
    sex: string;
    referred_by: string;
    collected_date: string;
    received_date: string;
    reported_date: string;
    created_at: string;
    report_name?: string; // Might not exist in new schema, treated as generic "Lab Report"
}

// Function to get current IST date and time
const getISTDateTime = () => {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(now.getTime() + istOffset);

    return {
        date: istTime.toISOString().split('T')[0],
        time: istTime.toISOString().split('T')[1].split('.')[0],
        readable: istTime.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
        filename: istTime.toISOString().replace(/[:.]/g, '-').split('T')[0]
    };
};

export default function ReportsPage() {
    const { doctorId } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const patientIdParam = searchParams.get('patientId');

    // Default to today's date if no patient ID is provided
    const [selectedDate, setSelectedDate] = useState(() => {
        if (patientIdParam) return '';
        return getISTDateTime().date;
    });

    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(false);
    const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    useEffect(() => {
        if (debouncedSearch) {
            setSelectedDate('');
        }
        fetchReports();
    }, [debouncedSearch, selectedDate, doctorId, patientIdParam]);

    const fetchReports = async () => {
        if (!doctorId) return;

        if (!selectedDate && !patientIdParam && !debouncedSearch) return;

        setLoading(true);
        try {
            let url = `/api/lab-reports?doctorId=${doctorId}`;

            // Priority: Search > PatientID > Date
            if (debouncedSearch) {
                url += `&search=${encodeURIComponent(debouncedSearch)}`;
            } else if (patientIdParam) {
                url += `&patientId=${patientIdParam}`;
            } else if (selectedDate) {
                url += `&date=${selectedDate}`;
            }

            const response = await fetch(url);
            const data = await response.json();

            if (data.reports) {
                setReports(data.reports);
            } else {
                setReports([]);
            }
        } catch (error) {
            console.error('Error fetching reports:', error);
            setReports([]);
        } finally {
            setLoading(false);
        }
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setExportDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleViewReport = (reportId: string) => {
        router.push(`/dashboard/lab-reports/view/${reportId}`);
    };

    const handleExport = async (format: string) => {
        const data = reports;
        const headers = ['Sl.No', 'SID No', 'Patient ID', 'Name', 'Age/Sex', 'Referred By', 'Reported Date'];

        switch (format) {
            case 'csv':
                exportToCSV(data, headers);
                break;
            case 'excel':
                await exportToExcel(data, headers);
                break;
            case 'pdf':
                exportToPDF(data, headers);
                break;
        }
        setExportDropdownOpen(false);
    };

    const exportToCSV = (data: Report[], headers: string[]) => {
        const dateTime = getISTDateTime();
        const BOM = '\uFEFF';
        const csvContent = [
            `"Reports - ${selectedDate || 'Search Results'}"`,
            `"Generated on: ${dateTime.readable}"`,
            `"Total Records: ${data.length}"`,
            `""`,
            headers.map(header => `"${header}"`).join(','),
            ...data.map((report, index) => [
                index + 1,
                `"${report.sid_no || '-'}"`,
                `"${report.patient_id}"`,
                `"${report.patient_name.replace(/"/g, '""')}"`,
                `"${report.age} / ${report.sex}"`,
                `"${report.referred_by || '-'}"`,
                `"${new Date(report.reported_date).toLocaleDateString()}"`,
            ].join(','))
        ].join('\r\n');

        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `reports-${selectedDate || 'search'}-${dateTime.filename}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const exportToExcel = async (data: Report[], headers: string[]) => {
        const dateTime = getISTDateTime();
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Reports');

        worksheet.addRow([`Reports - ${selectedDate || 'Search Results'}`]);
        worksheet.addRow([`Generated on: ${dateTime.readable}`]);
        worksheet.addRow([`Total Records: ${data.length}`]);
        worksheet.addRow([]);

        worksheet.getRow(1).font = { bold: true, size: 16 };
        worksheet.getRow(2).font = { italic: true };
        worksheet.getRow(3).font = { italic: true };

        worksheet.addRow(headers);

        const headerRow = worksheet.getRow(5);
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF4472C4' }
        };

        data.forEach((report, index) => {
            worksheet.addRow([
                index + 1,
                report.sid_no || '-',
                report.patient_id,
                report.patient_name,
                `${report.age} / ${report.sex}`,
                report.referred_by || '-',
                new Date(report.reported_date).toLocaleDateString()
            ]);
        });

        worksheet.columns.forEach(column => {
            column.width = 20;
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `reports-${selectedDate || 'search'}-${dateTime.filename}.xlsx`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const exportToPDF = (data: Report[], headers: string[]) => {
        const dateTime = getISTDateTime();
        const doc = new jsPDF();

        doc.setFontSize(20);
        doc.setTextColor(40, 40, 40);
        doc.text(`Reports - ${selectedDate || 'Search Results'}`, 20, 25);

        doc.setFontSize(12);
        doc.setTextColor(80, 80, 80);
        doc.text(`Generated on: ${dateTime.readable}`, 20, 35);
        doc.text(`Total Records: ${data.length}`, 20, 42);

        const tableData = data.map((report, index) => [
            index + 1,
            report.sid_no || '-',
            report.patient_id,
            report.patient_name,
            `${report.age} / ${report.sex}`,
            report.referred_by || '-',
            new Date(report.reported_date).toLocaleDateString()
        ]);

        autoTable(doc, {
            head: [headers],
            body: tableData,
            startY: 50,
            styles: { fontSize: 10 },
            headStyles: { fillColor: [68, 114, 196] },
        });

        doc.save(`reports-${selectedDate || 'search'}-${dateTime.filename}.pdf`);
    };

    const totalPages = useMemo(() => {
        return pageSize === 0 ? 1 : Math.ceil(reports.length / pageSize);
    }, [reports.length, pageSize]);

    const paginatedData = useMemo(() => {
        if (pageSize === 0) return reports;
        const startIndex = (currentPage - 1) * pageSize;
        return reports.slice(startIndex, startIndex + pageSize);
    }, [reports, currentPage, pageSize]);

    return (
        <div className="flex-1 p-8 bg-background min-h-screen">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-7xl mx-auto"
            >
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">Lab Reports</h1>
                        <p className="text-muted-foreground mt-1">View, search, and manage patient lab reports</p>
                    </div>

                    <div className="flex gap-4 items-center">
                        {/* Search Input */}
                        {!patientIdParam && (
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </span>
                                <input
                                    type="text"
                                    placeholder="Search SID, Name, ID..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10 pr-4 py-2 bg-secondary/50 border border-border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm w-64 text-foreground placeholder-muted-foreground transition-all"
                                />
                            </div>
                        )}

                        {!patientIdParam && !searchQuery && (
                            <div className="bg-card p-2 rounded-lg shadow-sm border border-border flex items-center">
                                <span className="text-sm text-muted-foreground mr-2 ml-2">Date:</span>
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className="outline-none text-foreground bg-transparent font-medium text-sm p-1 rounded hover:bg-secondary/50 cursor-pointer"
                                />
                            </div>
                        )}

                        <div className="relative" ref={dropdownRef}>
                            <button
                                onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
                                className="px-4 py-2 bg-card border border-border rounded-lg shadow-sm text-foreground hover:bg-secondary/80 flex items-center gap-2 transition-colors"
                            >
                                <span>Export</span>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            <AnimatePresence>
                                {exportDropdownOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                        className="absolute right-0 mt-2 w-48 bg-card rounded-lg shadow-xl border border-border z-50 overflow-hidden"
                                    >
                                        <button
                                            onClick={() => handleExport('csv')}
                                            className="w-full text-left px-4 py-3 hover:bg-secondary/50 text-sm text-foreground border-b border-border flex items-center gap-2"
                                        >
                                            <span className="text-green-500 font-bold">CSV</span> Download as CSV
                                        </button>
                                        <button
                                            onClick={() => handleExport('excel')}
                                            className="w-full text-left px-4 py-3 hover:bg-secondary/50 text-sm text-foreground border-b border-border flex items-center gap-2"
                                        >
                                            <span className="text-emerald-500 font-bold">XLSX</span> Download as Excel
                                        </button>
                                        <button
                                            onClick={() => handleExport('pdf')}
                                            className="w-full text-left px-4 py-3 hover:bg-secondary/50 text-sm text-foreground flex items-center gap-2"
                                        >
                                            <span className="text-red-500 font-bold">PDF</span> Download as PDF
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-card rounded-xl shadow-sm border border-border overflow-hidden"
                >
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-secondary/30 border-b border-border">
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sl.No</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">SID No</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Patient ID</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Patient Name</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Age / Sex</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Reported Date</th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {loading ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                                            <div className="flex justify-center items-center gap-3">
                                                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                                Fetching reports...
                                            </div>
                                        </td>
                                    </tr>
                                ) : reports.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                                            {searchQuery ? `No reports found matching "${searchQuery}"` : 'No reports found for the selected date'}
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedData.map((report, index) => (
                                        <tr key={report.id} className="hover:bg-secondary/30 transition-colors">
                                            <td className="px-6 py-4 text-sm text-muted-foreground">
                                                {(currentPage - 1) * pageSize + index + 1}
                                            </td>
                                            <td className="px-6 py-4 text-sm font-medium text-foreground">
                                                {report.sid_no || '-'}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-muted-foreground">
                                                {report.patient_id}
                                            </td>
                                            <td className="px-6 py-4 text-sm font-medium text-foreground">
                                                {report.patient_name}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-muted-foreground">
                                                {report.age} / {report.sex}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-muted-foreground">
                                                {new Date(report.reported_date).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => handleViewReport(report.id)}
                                                    className="inline-flex items-center px-3 py-1.5 border border-primary text-primary text-xs font-medium rounded-md hover:bg-primary/10 transition-colors"
                                                >
                                                    View Report
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="bg-secondary/10 px-6 py-4 border-t border-border flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">
                            Showing <span className="font-medium text-foreground">{reports.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}</span> to <span className="font-medium text-foreground">{Math.min(currentPage * pageSize, reports.length)}</span> of <span className="font-medium text-foreground">{reports.length}</span> results
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1 border border-border rounded-md text-sm disabled:opacity-50 hover:bg-secondary text-foreground transition-colors"
                            >
                                Previous
                            </button>
                            <span className="px-3 py-1 text-sm font-medium text-foreground bg-secondary/50 border border-border rounded-md">
                                {currentPage} / {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1 border border-border rounded-md text-sm disabled:opacity-50 hover:bg-secondary text-foreground transition-colors"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </div>
    );
}
