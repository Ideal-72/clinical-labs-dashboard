// @ts-nocheck
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../../lib/auth';
import { motion, AnimatePresence } from 'framer-motion';
import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Add this after your imports
const getISTDateTime = () => {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
    const istTime = new Date(now.getTime() + istOffset);

    const day = istTime.getUTCDate().toString().padStart(2, '0');
    const month = (istTime.getUTCMonth() + 1).toString().padStart(2, '0');
    const year = istTime.getUTCFullYear();
    const hours = istTime.getUTCHours();
    const minutes = istTime.getUTCMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = (hours % 12 || 12).toString().padStart(2, '0');

    return {
        filename: `${day}-${month}-${year}-${displayHours}-${minutes}-${ampm}`,
        readable: `${day}/${month}/${year} ${displayHours}:${minutes} ${ampm}`
    };
};

interface TestGroup {
    id: number;
    name: string;
    method: string;
    specimen: string;
}

export default function TestGroupsManager() {
    const [testGroups, setTestGroups] = useState<TestGroup[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [editingGroup, setEditingGroup] = useState<TestGroup | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        method: '',
        specimen: ''
    });
    const [loading, setLoading] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState<number | null>(null);
    const [dropdownPosition, setDropdownPosition] = useState<{ top?: string, bottom?: string, left?: string, right?: string }>({});

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [pageDirection, setPageDirection] = useState(0);

    // Search filter state
    const [searchTerm, setSearchTerm] = useState('');

    // Export dropdown
    const [exportDropdownOpen, setExportDropdownOpen] = useState(false);

    const { doctorId } = useAuth();
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchTestGroups();
    }, [doctorId]);

    const fetchTestGroups = async () => {
        if (!doctorId) return;

        try {
            const response = await fetch('/api/test-groups', {
                headers: { authorization: doctorId.toString() }
            });
            const data = await response.json();
            setTestGroups(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching test groups:', error);
        }
    };

    // Sort and filter test groups
    const sortedAndFilteredTestGroups = useMemo(() => {
        let filtered = [...testGroups].sort((a, b) => a.name.localeCompare(b.name));

        if (searchTerm) {
            filtered = filtered.filter(group =>
                group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                group.method.toLowerCase().includes(searchTerm.toLowerCase()) ||
                group.specimen.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        return filtered;
    }, [testGroups, searchTerm]);

    // Pagination logic
    const totalPages = useMemo(() => {
        return pageSize === 0 ? 1 : Math.ceil(sortedAndFilteredTestGroups.length / pageSize);
    }, [sortedAndFilteredTestGroups.length, pageSize]);

    const paginatedData = useMemo(() => {
        if (pageSize === 0) return sortedAndFilteredTestGroups;
        const startIndex = (currentPage - 1) * pageSize;
        return sortedAndFilteredTestGroups.slice(startIndex, startIndex + pageSize);
    }, [sortedAndFilteredTestGroups, currentPage, pageSize]);

    useEffect(() => {
        setCurrentPage(1);
    }, [pageSize]);

    const calculateDropdownPosition = (buttonElement: HTMLElement, rowIndex: number) => {
        const isNearTop = rowIndex <= 1;
        const isNearBottom = rowIndex >= paginatedData.length - 2;

        let position: { top?: string, bottom?: string, left?: string, right?: string } = {};

        if (isNearTop) {
            position = { top: '100%', right: '0px' };
        } else if (isNearBottom) {
            position = { bottom: '100%', right: '0px' };
        } else {
            position = { top: '50%', right: '100%', transform: 'translateY(-50%)' };
        }

        return position;
    };

    const handleDropdownToggle = (groupId: number, buttonElement: HTMLElement, rowIndex: number) => {
        if (dropdownOpen === groupId) {
            setDropdownOpen(null);
        } else {
            const position = calculateDropdownPosition(buttonElement, rowIndex);
            setDropdownPosition(position);
            setDropdownOpen(groupId);
        }
    };

    const getPaginationText = () => {
        if (pageSize === 0) {
            return `Showing 1 to ${sortedAndFilteredTestGroups.length} of ${sortedAndFilteredTestGroups.length} entries`;
        }
        const startIndex = (currentPage - 1) * pageSize + 1;
        const endIndex = Math.min(currentPage * pageSize, sortedAndFilteredTestGroups.length);
        return `Showing ${startIndex} to ${endIndex} of ${sortedAndFilteredTestGroups.length} entries`;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const url = '/api/test-groups';
            const method = editingGroup ? 'PUT' : 'POST';
            const body = editingGroup
                ? { id: editingGroup.id, ...formData }
                : formData;

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    authorization: doctorId!.toString()
                },
                body: JSON.stringify(body)
            });

            if (response.ok) {
                await fetchTestGroups();
                setShowModal(false);
                setEditingGroup(null);
                setFormData({ name: '', method: '', specimen: '' });
            } else {
                const error = await response.json();
                alert('Error: ' + error.error);
            }
        } catch (error) {
            console.error('Error saving test group:', error);
            alert('Error saving test group');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (group: TestGroup) => {
        setEditingGroup(group);
        setFormData({
            name: group.name,
            method: group.method,
            specimen: group.specimen
        });
        setShowModal(true);
        setDropdownOpen(null);
    };

    const handleDelete = async (id: number) => {
        if (confirm('Are you sure you want to delete this test group?')) {
            try {
                const response = await fetch('/api/test-groups', {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        authorization: doctorId!.toString()
                    },
                    body: JSON.stringify({ id })
                });

                if (response.ok) {
                    await fetchTestGroups();
                } else {
                    const error = await response.json();
                    alert('Error: ' + error.error);
                }
            } catch (error) {
                console.error('Error deleting test group:', error);
                alert('Error deleting test group');
            }
        }
        setDropdownOpen(null);
    };

    const handleExport = async (format: string) => {
        const data = sortedAndFilteredTestGroups;
        const headers = ['Sl.No', 'Test Group Name', 'Method Used', 'Specimen Type'];

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

    const exportToCSV = (data: TestGroup[], headers: string[]) => {
        const dateTime = getISTDateTime();
        const BOM = '\uFEFF';
        const csvContent = [
            `"Test Groups Report"`,
            `"Generated on: ${dateTime.readable}"`,
            `"Total Records: ${data.length}"`,
            `""`,
            headers.map(header => `"${header}"`).join(','),
            ...data.map((group, index) => [
                index + 1,
                `"${group.name.replace(/"/g, '""')}"`,
                `"${group.method.replace(/"/g, '""')}"`,
                `"${group.specimen.replace(/"/g, '""')}"`
            ].join(','))
        ].join('\r\n');

        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `test-groups-${dateTime.filename}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const exportToExcel = async (data: TestGroup[], headers: string[]) => {
        const dateTime = getISTDateTime();
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Test Groups');

        worksheet.addRow(headers);
        worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };

        data.forEach((group, index) => {
            worksheet.addRow([index + 1, group.name, group.method, group.specimen]);
        });

        worksheet.columns.forEach(column => {
            column.width = 25;
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `test-groups-${dateTime.filename}.xlsx`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const exportToPDF = (data: TestGroup[], headers: string[]) => {
        const dateTime = getISTDateTime();
        const doc = new jsPDF();

        doc.setFontSize(20);
        doc.setTextColor(40, 40, 40);
        doc.text('Test Groups Report', 20, 25);

        doc.setFontSize(12);
        doc.setTextColor(80, 80, 80);
        doc.text(`Generated on: ${dateTime.readable}`, 20, 35);
        doc.text(`Total Records: ${data.length}`, 20, 42);

        const tableData = data.map((group, index) => [
            index + 1,
            group.name,
            group.method,
            group.specimen
        ]);

        autoTable(doc, {
            head: [headers],
            body: tableData,
            startY: 50,
            styles: { fontSize: 8, cellPadding: 2 },
            headStyles: { fillColor: [68, 114, 196], textColor: 255, fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [245, 245, 245] },
            columnStyles: {
                0: { halign: 'center', cellWidth: 15 },
                1: { cellWidth: 60 },
                2: { cellWidth: 50 },
                3: { cellWidth: 50 }
            }
        });

        doc.save(`test-groups-${dateTime.filename}.pdf`);
    };

    const generatePageNumbers = () => {
        const pages = [];
        const maxVisible = 5;
        let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
        let end = Math.min(totalPages, start + maxVisible - 1);

        if (end - start + 1 < maxVisible) {
            start = Math.max(1, end - maxVisible + 1);
        }

        for (let i = start; i <= end; i++) {
            pages.push(i);
        }
        return pages;
    };

    const truncateText = (text: string, maxLength: number = 30) => {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    };

    const handlePageChange = (newPage: number) => {
        if (newPage > currentPage) {
            setPageDirection(1);
        } else {
            setPageDirection(-1);
        }
        setCurrentPage(newPage);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Element;
            if (!target.closest('.dropdown-container')) {
                setDropdownOpen(null);
                setExportDropdownOpen(false);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const pageVariants = {
        initial: (direction: number) => ({ x: direction > 0 ? 200 : -200, opacity: 0 }),
        in: { x: 0, opacity: 1 },
        out: (direction: number) => ({ x: direction < 0 ? 200 : -200, opacity: 0 }),
    };

    const pageTransition = { type: 'tween', ease: 'anticipate', duration: 0.2 };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Test Groups</h1>
                    <p className="text-muted-foreground">Manage test categories and methods</p>
                </div>

                <div className="flex space-x-3">
                    {/* Export Dropdown */}
                    <div className="relative dropdown-container">
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setExportDropdownOpen(!exportDropdownOpen);
                            }}
                            className="bg-secondary text-foreground px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-2 cursor-pointer"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span>Export</span>
                        </button>
                        <AnimatePresence>
                            {exportDropdownOpen && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                    transition={{ duration: 0.15 }}
                                    className="absolute right-0 mt-2 w-48 bg-card rounded-md shadow-xl border border-border z-10"
                                >
                                    <div className="py-1">
                                        <button
                                            type="button"
                                            onClick={(e) => { e.preventDefault(); handleExport('csv'); }}
                                            className="block w-full text-left px-4 py-2 text-sm text-foreground hover:bg-secondary cursor-pointer transition-colors"
                                        >
                                            Export as CSV
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => { e.preventDefault(); handleExport('excel'); }}
                                            className="block w-full text-left px-4 py-2 text-sm text-foreground hover:bg-secondary cursor-pointer transition-colors"
                                        >
                                            Export as Excel
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => { e.preventDefault(); handleExport('pdf'); }}
                                            className="block w-full text-left px-4 py-2 text-sm text-foreground hover:bg-secondary cursor-pointer transition-colors"
                                        >
                                            Export as PDF
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); setShowModal(true); }}
                        className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-indigo-500 transition-colors flex items-center space-x-2 cursor-pointer"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span>Add Test Group</span>
                    </button>
                </div>
            </div>

            {/* Search Bar */}
            <div className="bg-card p-4 rounded-lg border border-border shadow-sm">
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <input
                        type="text"
                        placeholder="Search by name, method or specimen..."
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                        className="block w-full pl-10 pr-3 py-2 border border-input rounded-lg text-foreground placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    />
                </div>
            </div>

            {/* Page Size Selector */}
            <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                    <span className="text-sm text-foreground">Show</span>
                    <select
                        value={pageSize}
                        onChange={(e) => setPageSize(Number(e.target.value))}
                        className="border border-input rounded-md px-3 py-1 text-sm text-foreground cursor-pointer focus:outline-none focus:ring-primary focus:border-primary"
                    >
                        <option value={10}>10</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                        <option value={0}>All</option>
                    </select>
                    <span className="text-sm text-foreground">entries</span>
                </div>
                <div className="text-sm text-foreground">
                    {getPaginationText()}
                </div>
            </div>

            {/* Table */}
            <div className="bg-card shadow-sm rounded-lg border border-border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-border">
                        <thead className="bg-secondary/30">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-20">Sl.No</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Test Group Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Method Used</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Specimen Type</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider w-20">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-card divide-y divide-border">
                            <AnimatePresence mode="wait" custom={pageDirection}>
                                {paginatedData.map((group, index) => {
                                    const sequentialNumber = pageSize === 0 ? index + 1 : (currentPage - 1) * pageSize + index + 1;
                                    return (
                                        <motion.tr
                                            key={`${currentPage}-${group.id}`}
                                            custom={pageDirection}
                                            variants={pageVariants}
                                            initial="initial"
                                            animate="in"
                                            exit="out"
                                            transition={pageTransition}
                                            className="hover:bg-secondary/30"
                                        >
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">{sequentialNumber}</td>
                                            <td className="px-6 py-4 text-sm font-medium text-foreground">{truncateText(group.name)}</td>
                                            <td className="px-6 py-4 text-sm text-foreground">
                                                {group.method ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                        {truncateText(group.method)}
                                                    </span>
                                                ) : <span className="text-muted-foreground text-xs italic">Not specified</span>}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-foreground">
                                                {group.specimen ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                        {truncateText(group.specimen)}
                                                    </span>
                                                ) : <span className="text-muted-foreground text-xs italic">Not specified</span>}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <div className="relative dropdown-container">
                                                    <button
                                                        type="button"
                                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDropdownToggle(group.id, e.currentTarget, index); }}
                                                        className="text-muted-foreground hover:text-muted-foreground p-1 rounded-full hover:bg-secondary cursor-pointer transition-colors"
                                                    >
                                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                                        </svg>
                                                    </button>
                                                    <AnimatePresence>
                                                        {dropdownOpen === group.id && (
                                                            <motion.div
                                                                ref={dropdownRef}
                                                                initial={{ opacity: 0, scale: 0.95 }}
                                                                animate={{ opacity: 1, scale: 1 }}
                                                                exit={{ opacity: 0, scale: 0.95 }}
                                                                transition={{ duration: 0.15 }}
                                                                className="absolute w-32 bg-card rounded-md shadow-xl border border-border z-50"
                                                                style={dropdownPosition}
                                                            >
                                                                <div className="py-1">
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => { e.preventDefault(); handleEdit(group); }}
                                                                        className="block w-full text-left px-4 py-2 text-sm text-foreground hover:bg-secondary cursor-pointer transition-colors"
                                                                    >
                                                                        Edit
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => { e.preventDefault(); handleDelete(group.id); }}
                                                                        className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-secondary cursor-pointer transition-colors"
                                                                    >
                                                                        Delete
                                                                    </button>
                                                                </div>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    );
                                })}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination Controls */}
            {pageSize > 0 && totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            type="button"
                            onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-2 border border-input rounded-md text-sm font-medium text-foreground hover:bg-secondary/30 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
                        >
                            Previous
                        </motion.button>
                        <div className="flex space-x-1">
                            {generatePageNumbers().map((page) => (
                                <motion.button
                                    key={page}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    type="button"
                                    onClick={() => handlePageChange(page)}
                                    className={`px-3 py-2 border text-sm font-medium rounded-md cursor-pointer transition-colors ${currentPage === page ? 'bg-primary text-white border-blue-600' : 'border-input text-foreground hover:bg-secondary/30'
                                        }`}
                                >
                                    {page}
                                </motion.button>
                            ))}
                        </div>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            type="button"
                            onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-2 border border-input rounded-md text-sm font-medium text-foreground hover:bg-secondary/30 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
                        >
                            Next
                        </motion.button>
                    </div>
                    <div className="text-sm text-foreground">
                        Page {currentPage} of {totalPages}
                    </div>
                </div>
            )}

            {/* Modal */}
            <AnimatePresence>
                {showModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-transparent bg-opacity-30 backdrop-blur-md flex items-center justify-center p-4 z-50"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            transition={{ type: "spring", duration: 0.5 }}
                            className="bg-card bg-opacity-95 backdrop-blur-xl rounded-xl max-w-lg w-full p-6 shadow-2xl border border-border border-opacity-20"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-medium text-foreground">
                                    {editingGroup ? 'Edit Test Group' : 'Add New Test Group'}
                                </h3>
                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    type="button"
                                    onClick={() => {
                                        setShowModal(false);
                                        setEditingGroup(null);
                                        setFormData({ name: '', method: '', specimen: '' });
                                    }}
                                    className="text-muted-foreground hover:text-muted-foreground cursor-pointer transition-colors"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </motion.button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">
                                        Test Group Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                        placeholder="e.g., HEMATOLOGY"
                                        className="w-full border border-input rounded-lg px-3 py-2 text-foreground placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">
                                        Method Used
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.method}
                                        onChange={(e) => setFormData({ ...formData, method: e.target.value })}
                                        placeholder="e.g., ELIZA"
                                        className="w-full border border-input rounded-lg px-3 py-2 text-foreground placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">
                                        Specimen Type
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.specimen}
                                        onChange={(e) => setFormData({ ...formData, specimen: e.target.value })}
                                        placeholder="e.g., Blood"
                                        className="w-full border border-input rounded-lg px-3 py-2 text-foreground placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                                    />
                                </div>
                                <div className="flex justify-end space-x-3 pt-6">
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        type="button"
                                        onClick={() => {
                                            setShowModal(false);
                                            setEditingGroup(null);
                                            setFormData({ name: '', method: '', specimen: '' });
                                        }}
                                        className="px-4 py-2 border border-input rounded-lg text-foreground hover:bg-secondary/30 transition-colors cursor-pointer"
                                    >
                                        Cancel
                                    </motion.button>
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        type="submit"
                                        disabled={loading}
                                        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-indigo-500 disabled:opacity-50 transition-colors flex items-center space-x-2 cursor-pointer"
                                    >
                                        {loading && (
                                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                        )}
                                        <span>{loading ? 'Saving...' : (editingGroup ? 'Update' : 'Create')}</span>
                                    </motion.button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
