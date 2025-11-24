'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../../lib/auth';
import { useRouter } from 'next/navigation';

interface Stats {
    totalPatients: number;
    recentObservations: number;
    pendingReports: number;
    labTests: number;
}

interface Patient {
    id: number;
    name: string;
    opno: string;
}

interface RecentReport {
    id: number;
    patients: { name: string; opno: string };
    report_name: string;
    report_date: string;
}

interface TestFrequency {
    name: string;
    count: number;
    percentage: number;
}

const LoadingSpinner = () => (
    <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
);

const LoadingCard = () => (
    <div className="bg-card p-6 rounded-xl shadow-sm border border-border animate-pulse">
        <div className="flex items-center justify-between">
            <div className="w-12 h-12 bg-secondary rounded-xl"></div>
            <div className="text-right">
                <div className="w-16 h-8 bg-secondary rounded mb-2"></div>
                <div className="w-12 h-4 bg-secondary rounded"></div>
            </div>
        </div>
        <div className="mt-4">
            <div className="w-24 h-4 bg-secondary rounded"></div>
        </div>
    </div>
);

export default function HomePage() {
    const [stats, setStats] = useState<Stats>({
        totalPatients: 0,
        recentObservations: 0,
        pendingReports: 0,
        labTests: 0
    });

    const [recentReports, setRecentReports] = useState<RecentReport[]>([]);
    const [testFrequency, setTestFrequency] = useState<TestFrequency[]>([]);
    const [todaysReports, setTodaysReports] = useState(0);
    const [weeklyGrowth, setWeeklyGrowth] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<Patient[]>([]);
    const [showSearchResults, setShowSearchResults] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());

    const { doctorId, username } = useAuth();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (doctorId) {
            fetchDashboardData();
        }
    }, [doctorId]);

    // Update current time every minute
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 60000);
        return () => clearInterval(timer);
    }, []);

    const fetchDashboardData = async () => {
        setIsLoading(true);
        try {
            // Fetch basic stats
            const [patientsRes, observationsRes, labTestsRes, reportsRes] = await Promise.all([
                fetch('/api/patients', { headers: { authorization: doctorId!.toString() } }),
                fetch('/api/observations', { headers: { authorization: doctorId!.toString() } }),
                fetch('/api/lab-tests', { headers: { authorization: doctorId!.toString() } }),
                fetch('/api/reports', { headers: { authorization: doctorId!.toString() } })
            ]);

            const [patients, observations, labTests, reports] = await Promise.all([
                patientsRes.json(),
                observationsRes.json(),
                labTestsRes.json(),
                reportsRes.json()
            ]);

            // Calculate stats
            const totalPatients = Array.isArray(patients) ? patients.length : 0;
            const totalObservations = Array.isArray(observations) ? observations.length : 0;
            const totalReports = Array.isArray(reports) ? reports.length : 0;

            // Today's reports count
            const today = new Date().toISOString().split('T')[0];
            const todayReports = Array.isArray(reports) ?
                reports.filter((report: any) => report.report_date === today).length : 0;

            // Weekly growth calculation (mock - in real app, compare with last week)
            const growth = totalPatients > 0 ? Math.round((todayReports / totalPatients) * 100) : 0;

            setStats({
                totalPatients,
                recentObservations: totalObservations,
                pendingReports: totalReports,
                labTests: Array.isArray(labTests) ? labTests.length : 0
            });

            setTodaysReports(todayReports);
            setWeeklyGrowth(growth);

            // Set recent reports (last 5)
            if (Array.isArray(reports)) {
                const recent = reports
                    .sort((a: any, b: any) => new Date(b.report_date).getTime() - new Date(a.report_date).getTime())
                    .slice(0, 5);
                setRecentReports(recent);
            }

            // Calculate test frequency
            if (Array.isArray(observations)) {
                const frequency: { [key: string]: number } = {};
                observations.forEach((obs: any) => {
                    frequency[obs.report_name] = (frequency[obs.report_name] || 0) + 1;
                });

                const total = observations.length;
                const frequencyData = Object.entries(frequency)
                    .map(([name, count]) => ({
                        name,
                        count: count as number,
                        percentage: total > 0 ? Math.round(((count as number) / total) * 100) : 0
                    }))
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 5);

                setTestFrequency(frequencyData);
            }

        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearch = async (term: string) => {
        if (!term.trim()) {
            setShowSearchResults(false);
            return;
        }

        try {
            const response = await fetch('/api/patients', {
                headers: { authorization: doctorId!.toString() }
            });
            const patients = await response.json();

            if (Array.isArray(patients)) {
                const filtered = patients.filter((patient: Patient) =>
                    patient.name.toLowerCase().includes(term.toLowerCase()) ||
                    patient.opno.includes(term)
                ).slice(0, 5);

                setSearchResults(filtered);
                setShowSearchResults(true);
            }
        } catch (error) {
            console.error('Error searching patients:', error);
        }
    };

    const getGreeting = () => {
        const hour = currentTime.getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 17) return 'Good Afternoon';
        return 'Good Evening';
    };

    const getCurrentDate = () => {
        return currentTime.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const getCurrentTime = () => {
        return currentTime.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    const statCards = [
        {
            name: 'Total Patients',
            value: stats.totalPatients,
            icon: '👥',
            color: 'bg-blue-500/10 text-blue-500',
            trend: weeklyGrowth > 0 ? `+${weeklyGrowth}%` : '0%',
            trendColor: weeklyGrowth > 0 ? 'text-green-500' : 'text-muted-foreground'
        },
        {
            name: 'Total Observations',
            value: stats.recentObservations,
            icon: '📊',
            color: 'bg-green-500/10 text-green-500',
            trend: todaysReports > 0 ? `${todaysReports} today` : 'No reports today',
            trendColor: todaysReports > 0 ? 'text-blue-500' : 'text-muted-foreground'
        },
        {
            name: 'Total Reports',
            value: stats.pendingReports,
            icon: '📋',
            color: 'bg-yellow-500/10 text-yellow-500',
            trend: `${todaysReports} today`,
            trendColor: 'text-purple-500'
        },
        {
            name: 'Lab Test Types',
            value: stats.labTests,
            icon: '🧪',
            color: 'bg-purple-500/10 text-purple-500',
            trend: 'Available',
            trendColor: 'text-green-500'
        }
    ];

    const quickActions = [
        {
            name: 'New Patient',
            description: 'Register a new patient',
            icon: '👤',
            color: 'bg-blue-600 hover:bg-blue-700',
            action: () => router.push('/dashboard/patients')
        },
        {
            name: 'Add Observation',
            description: 'Record test results',
            icon: '🧪',
            color: 'bg-green-600 hover:bg-green-700',
            action: () => router.push('/dashboard/observations')
        },
        {
            name: 'View Reports',
            description: 'Browse daily reports',
            icon: '📊',
            color: 'bg-purple-600 hover:bg-purple-700',
            action: () => router.push('/dashboard/reports')
        },
        {
            name: 'Lab Settings',
            description: 'Manage test types',
            icon: '⚙️',
            color: 'bg-orange-600 hover:bg-orange-700',
            action: () => router.push('/dashboard/settings/lab-tests')
        },
        {
            name: 'Export Data',
            description: 'Backup & export',
            icon: '💾',
            color: 'bg-indigo-600 hover:bg-indigo-700',
            action: () => router.push('/dashboard/settings/system')
        },
        {
            name: 'Patient Search',
            description: 'Find patient records',
            icon: '🔍',
            color: 'bg-teal-600 hover:bg-teal-700',
            action: () => document.getElementById('patient-search')?.focus()
        }
    ];

    return (
        <div className="space-y-6">
            {/* Welcome Header with Live Time */}
            <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">{getGreeting()}, Dr. {username || 'Doctor'}!</h1>
                        <p className="text-muted-foreground mt-2 text-lg">{getCurrentDate()}</p>
                        <div className="flex items-center mt-3 space-x-4">
                            <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                <span className="text-muted-foreground">Live: {getCurrentTime()}</span>
                            </div>
                            <span className="text-muted-foreground/50">•</span>
                            <span className="text-primary font-medium">{todaysReports} reports today</span>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-6xl opacity-20 grayscale">🩺</div>
                        <p className="text-muted-foreground text-sm mt-2">Medical Dashboard</p>
                    </div>
                </div>

            </div>

            {/* Stats Grid with Trends */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {isLoading ? (
                    Array.from({ length: 4 }).map((_, index) => (
                        <LoadingCard key={index} />
                    ))
                ) : (
                    statCards.map((stat) => (

                        <div key={stat.name} className="bg-card p-6 rounded-xl shadow-sm border border-border hover:border-primary/50 transition-colors">
                            <div className="flex items-center justify-between">
                                <div className={`${stat.color} p-3 rounded-xl`}>
                                    <span className="text-3xl">{stat.icon}</span>
                                </div>
                                <div className="text-right">
                                    <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                                    <p className={`text-sm font-medium ${stat.trendColor}`}>{stat.trend}</p>
                                </div>
                            </div>
                            <div className="mt-4">
                                <p className="text-sm font-medium text-muted-foreground">{stat.name}</p>
                            </div>
                        </div>
                    ))
                )}
            </div>


            {/* Quick Patient Search */}
            <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">🔍 Quick Patient Search</h3>
                <div className="relative">
                    <input
                        id="patient-search"
                        type="text"
                        placeholder="Search by patient name or OP number..."
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            handleSearch(e.target.value);
                        }}
                        className="w-full pl-10 pr-4 py-3 bg-secondary/50 border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    />
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>

                    {/* Search Results Dropdown */}
                    {showSearchResults && searchResults.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-lg shadow-lg">
                            {searchResults.map((patient) => (
                                <div
                                    key={patient.id}
                                    onClick={() => {
                                        router.push(`/dashboard/observations`);
                                        setShowSearchResults(false);
                                        setSearchTerm('');
                                    }}
                                    className="p-3 hover:bg-secondary cursor-pointer border-b border-border last:border-b-0"
                                >
                                    <p className="font-medium text-foreground">{patient.name}</p>
                                    <p className="text-sm text-muted-foreground">OP: {patient.opno}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Reports */}
                <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-foreground">📋 Recent Reports</h3>
                        <button
                            onClick={() => router.push('/dashboard/reports')}
                            className="text-primary hover:text-indigo-400 text-sm font-medium"
                        >
                            View All →
                        </button>
                    </div>
                    <div className="space-y-3">
                        {isLoading ? (
                            <LoadingSpinner />
                        ) : recentReports.length > 0 ? (

                            recentReports.map((report) => (
                                <div key={report.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg border border-border/50">
                                    <div>
                                        <p className="font-medium text-foreground">{report.patients.name}</p>
                                        <p className="text-sm text-muted-foreground">OP: {report.patients.opno} • {report.report_name}</p>
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                        {new Date(report.report_date).toLocaleDateString()}
                                    </span>
                                </div>
                            ))
                        ) : (
                            <p className="text-muted-foreground text-center py-4">No recent reports</p>
                        )}
                    </div>
                </div>

                {/* Test Frequency Analysis */}
                <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                    <h3 className="text-lg font-semibold text-foreground mb-4">📈 Most Requested Tests</h3>
                    <div className="space-y-4">
                        {isLoading ? (
                            <LoadingSpinner />
                        ) : testFrequency.length > 0 ? (
                            testFrequency.map((test, index) => (
                                <div key={test.name} className="flex items-center space-x-3">
                                    <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                                        <span className="text-sm font-medium text-primary">{index + 1}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-center mb-1">
                                            <p className="text-sm font-medium text-foreground truncate">{test.name}</p>
                                            <span className="text-sm text-muted-foreground">{test.count}</span>
                                        </div>
                                        <div className="w-full bg-secondary rounded-full h-2">
                                            <div
                                                className="bg-primary h-2 rounded-full"
                                                style={{ width: `${test.percentage}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-muted-foreground text-center py-4">No test data available</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Enhanced Quick Actions */}
            <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                <h3 className="text-lg font-semibold text-foreground mb-6">⚡ Quick Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {quickActions.map((action) => (
                        <button
                            key={action.name}
                            onClick={action.action}
                            className={`${action.color} text-white p-4 rounded-xl transition-all duration-200 text-left group hover:shadow-lg shadow-md`}
                        >
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="text-3xl mb-2">{action.icon}</div>
                                    <h4 className="font-semibold text-lg">{action.name}</h4>
                                    <p className="text-sm opacity-90 group-hover:opacity-100">{action.description}</p>
                                </div>
                                <svg className="w-5 h-5 opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
