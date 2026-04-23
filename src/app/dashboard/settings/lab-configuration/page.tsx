'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import TestGroupsManager from '../../../../components/settings/TestGroupsManager';
import LabTestsManager from '../../../../components/settings/LabTestsManager';
import ReportGroupsManager from '../../../../components/settings/ReportGroupsManager';

export default function LabConfigurationPage() {
    const searchParams = useSearchParams();
    const initialTab = searchParams?.get('tab') as 'test-groups' | 'lab-tests' | 'report-groups' | null;
    const [activeTab, setActiveTab] = useState<'test-groups' | 'lab-tests' | 'report-groups'>(initialTab || 'test-groups');

    const tabs = [
        { id: 'test-groups', label: 'Test Groups', component: TestGroupsManager },
        { id: 'lab-tests', label: 'Lab Tests', component: LabTestsManager },
        { id: 'report-groups', label: 'Report Groups', component: ReportGroupsManager },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-foreground">Lab Configuration</h1>
                <p className="text-muted-foreground">Manage your laboratory settings, tests, and grouping configurations.</p>
            </div>

            {/* Tabs */}
            <div className="border-b border-border">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors cursor-pointer
                ${activeTab === tab.id
                                    ? 'border-primary text-primary'
                                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'}
              `}
                            aria-current={activeTab === tab.id ? 'page' : undefined}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Content Area */}
            <div className="mt-6">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                    >
                        {tabs.map((tab) => (
                            activeTab === tab.id ? <tab.component key={tab.id} /> : null
                        ))}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}
