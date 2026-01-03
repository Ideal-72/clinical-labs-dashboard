'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../../lib/auth';
import Link from 'next/link';

const navigation = [
  { name: 'Home', href: '/dashboard/home', icon: '🏠' },
  { name: 'Patients', href: '/dashboard/patients', icon: '👥' },
  { name: 'Observations', href: '/dashboard/observations', icon: '📊' },
  { name: 'Reports by Date', href: '/dashboard/reports', icon: '📅' },
  { name: 'Lab Reports', href: '/dashboard/lab-reports/create', icon: '📄' },
];

const settingsNavigation = [
  { name: 'Test Groups', href: '/dashboard/settings/test-groups' },
  { name: 'Lab Tests', href: '/dashboard/settings/lab-tests' },
  { name: 'Report Groups', href: '/dashboard/settings/report-groups' },
  { name: 'System', href: '/dashboard/settings/system' },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { doctorId, username, logout, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !doctorId) {
      router.push('/login');
    }
  }, [doctorId, loading, router]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!doctorId) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background print:bg-white">
      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-card border-r border-border">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                onClick={() => setSidebarOpen(false)}
              >
                <span className="sr-only">Close sidebar</span>
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <SidebarContent
              navigation={navigation}
              settingsNavigation={settingsNavigation}
              settingsOpen={settingsOpen}
              setSettingsOpen={setSettingsOpen}
              pathname={pathname}
              username={username}
              onLogout={handleLogout}
            />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0">
        <SidebarContent
          navigation={navigation}
          settingsNavigation={settingsNavigation}
          settingsOpen={settingsOpen}
          setSettingsOpen={setSettingsOpen}
          pathname={pathname}
          username={username}
          onLogout={handleLogout}
        />
      </div>

      {/* Main content */}
      <div className="lg:pl-64 flex flex-col flex-1 print:pl-0">
        <div className="no-print sticky top-0 z-10 lg:hidden pl-1 pt-1 sm:pl-3 sm:pt-3 bg-card border-b border-border">
          <button
            className="-ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="sr-only">Open sidebar</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
        <main className="flex-1 print:bg-white">
          <div className="py-6 print:py-0 print:m-0">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 print:px-0 print:max-w-none print:m-0">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function SidebarContent({
  navigation,
  settingsNavigation,
  settingsOpen,
  setSettingsOpen,
  pathname,
  username,
  onLogout
}: any) {
  return (
    <div className="flex-1 flex flex-col min-h-0 bg-card border-r border-border">
      <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
        <div className="flex items-center flex-shrink-0 px-4">
          <h1 className="text-xl font-bold text-foreground">Clinical Dashboard</h1>
        </div>

        <div className="mt-8 flex-1 px-2 space-y-1">
          {navigation.map((item: any) => (
            <Link
              key={item.name}
              href={item.href}
              className={`${pathname === item.href
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                } group flex items-center px-2 py-2.5 text-sm font-medium rounded-lg transition-all duration-200`}
            >
              <span className="mr-3 text-lg opacity-70 group-hover:opacity-100 transition-opacity">{item.icon}</span>
              {item.name}
            </Link>
          ))}

          <div className="pt-4 mt-4 border-t border-border">
            <button
              onClick={() => setSettingsOpen(!settingsOpen)}
              className="text-muted-foreground hover:bg-secondary hover:text-foreground group w-full flex items-center px-2 py-2.5 text-sm font-medium rounded-lg transition-all duration-200"
            >
              <span className="mr-3 text-lg opacity-70 group-hover:opacity-100 transition-opacity">⚙️</span>
              Settings
              <svg
                className={`ml-auto h-4 w-4 transition-transform duration-200 ${settingsOpen ? 'rotate-90' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {settingsOpen && (
              <div className="ml-4 mt-1 space-y-1 border-l border-border pl-2">
                {settingsNavigation.map((item: any) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`${pathname === item.href
                      ? 'text-primary font-medium'
                      : 'text-muted-foreground hover:text-foreground'
                      } block px-2 py-2 text-sm rounded-md transition-colors`}
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-shrink-0 flex border-t border-border p-4 bg-secondary/30">
        <div className="flex-shrink-0 w-full group block">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                {username}
              </p>
              <p className="text-xs font-medium text-muted-foreground">
                Priya Clinical Lab
              </p>
              <div className="mt-2 flex items-center opacity-60 hover:opacity-100 transition-opacity">
                <span className="text-[10px] text-muted-foreground mr-1.5">Powered by</span>
                <img src="/arx-watermark-sidebar.png" alt="ARx" className="h-3 w-auto" />
              </div>
            </div>
            <button
              onClick={onLogout}
              className="ml-3 p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-all duration-200"
              title="Logout"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
