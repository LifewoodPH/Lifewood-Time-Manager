
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { User, AttendanceRecord, IdleRecord, IncidentReport } from '../types';
import { supabase } from '../services/supabaseClient';
import logo from '../Public/logof.jpeg';
import SummaryCards from './SummaryCards';
import HistoryTable from './HistoryTable';
import IdleHistoryTable from './IdleHistoryTable';
import IncidentReports from './IncidentReports';
import DateFilter from './DateFilter';
import RealTimeClock from './RealTimeClock';
import IdleAlarm from './IdleAlarm';
import ClockButtons from './ClockButtons';
import ConfirmationModal from './ConfirmationModal';
import { formatSecondsToHHMMSS, formatDateForDB, calculateDuration, parseDurationToMinutes, formatMinutesToHoursMinutes } from '../utils/time';

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

const OFFLINE_CLOCK_OUT_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
const SYSTEM_INTERRUPTION_NOTE = 'System clock out due to interruption';

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [idleRecords, setIdleRecords] = useState<IdleRecord[]>([]);
  const [incidentReports, setIncidentReports] = useState<IncidentReport[]>([]);
  const [isClockedIn, setIsClockedIn] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isConfirmingSignOut, setIsConfirmingSignOut] = useState(false);
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [activeTab, setActiveTab] = useState<'attendance' | 'idle' | 'incidents'>('attendance');
  const [showOfflineWarning, setShowOfflineWarning] = useState<boolean>(false);
  const offlineSinceRef = useRef<Date | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Fetch all user-related records concurrently
      const [attendanceRes, idleRes, incidentsRes] = await Promise.all([
        supabase
          .from('attendance')
          .select('*')
          .eq('user_id', user.userid)
          .order('created_at', { ascending: false }),
        supabase
          .from('idle_time')
          .select('*')
          .eq('user_id', user.userid)
          .order('created_at', { ascending: false }),
        supabase
          .from('incident_reports')
          .select('*')
          .eq('user_id', user.userid)
          .order('created_at', { ascending: false }),
      ]);

      if (attendanceRes.error) throw attendanceRes.error;
      if (idleRes.error) throw idleRes.error;
      if (incidentsRes.error) throw incidentsRes.error;

      const safeAttendanceData = attendanceRes.data || [];
      setRecords(safeAttendanceData);
      setIdleRecords(idleRes.data || []);
      setIncidentReports(incidentsRes.data || []);

      if (safeAttendanceData.length > 0) {
        const latestRecord = safeAttendanceData[0];
        setIsClockedIn(latestRecord.clock_out === null);
      } else {
        setIsClockedIn(false);
      }
    } catch (err: any) {
      setError('Failed to fetch data. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [user.userid]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;

    if (isClockedIn && records.length > 0) {
      const openRecord = records.find(r => r.clock_out === null);
      if (openRecord) {
        const clockInTime = new Date(openRecord.clock_in).getTime();

        timer = setInterval(() => {
          const now = new Date().getTime();
          const durationSeconds = Math.floor((now - clockInTime) / 1000);
          setElapsedTime(formatSecondsToHHMMSS(durationSeconds));
        }, 1000);
      }
    } else {
      setElapsedTime(null);
    }

    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [isClockedIn, records]);

  // Constants for specific clock-out reasons
  const BROWSER_CLOSE_NOTE = 'Browser session ended';
  const USER_SIGNOUT_NOTE = 'User signed out';

  // Check for recent browser close clock-out and RESUME session if it was just a refresh
  useEffect(() => {
    const checkAndResumeSession = async () => {
      // 1. Fetch the most recent attendance record
      const { data, error: fetchError } = await supabase
        .from('attendance')
        .select('*')
        .eq('user_id', user.userid) // Ensure we check THIS user's records
        .order('clock_out', { ascending: false }) // Get most recently closed
        .limit(1);

      if (fetchError || !data || data.length === 0) return;

      const latestRecords = data as AttendanceRecord[];
      const lastRecord = latestRecords[0];

      // 2. Check if it was a "Browser Close" event
      if (lastRecord.clock_out && lastRecord.notes === BROWSER_CLOSE_NOTE) {
        const clockOutTime = new Date(lastRecord.clock_out).getTime();
        const now = new Date().getTime();
        const timeDiff = now - clockOutTime;

        // 3. If it was closed very recently (< 60 seconds), assume it was a refresh -> RESUME
        if (timeDiff < 60000) {
          console.log('Detecting page refresh: Resuming session...');

          try {
            const { error: resumeError } = await (supabase
              .from('attendance') as any)
              .update({
                clock_out: null,
                total_time: null,
                notes: null // Clear the note
              } as any)
              .eq('id', lastRecord.id);

            if (resumeError) throw resumeError;

            // Update local state to reflect clocked-in status immediately
            setIsClockedIn(true);
            setRecords(prev => {
              // Optimistically update the record in the list
              return prev.map(r => r.id === lastRecord.id ? { ...r, clock_out: null, total_time: null, notes: null } : r);
            });
            console.log('Session resumed successfully');

            // Re-fetch to ensure sync
            fetchData();
          } catch (err) {
            console.error('Failed to resume session:', err);
          }
        }
      }
    };

    checkAndResumeSession();
  }, [user.userid, fetchData]); // Run strictly on mount/user change

  // Always clock out on page hide (Close or Refresh)
  // If it's a refresh, the logic above will resume it immediately on load.
  useEffect(() => {
    const handlePageHide = () => {
      if (isClockedIn) {
        // We use the "records" state, but since this runs on unmount, we need the latest
        // However, referencing "records" in dependency array causes re-attachments.
        // It's fine here as we want the latest ID.

        const openRecord = records.find(r => r.clock_out === null);
        if (!openRecord) return;

        const clockOutTime = formatDateForDB(new Date());
        const totalTime = calculateDuration(openRecord.clock_in, clockOutTime);
        const payload = {
          clock_out: clockOutTime,
          total_time: totalTime,
          notes: BROWSER_CLOSE_NOTE, // Specific note for resume logic
        };

        const supabaseUrl = 'https://szifmsvutxcrcwfjbvsi.supabase.co';
        const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6aWZtc3Z1dHhjcmN3ZmpidnNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwMjcwNzEsImV4cCI6MjA3NTYwMzA3MX0.hvZKMI0NDQ8IdWaDonqmiyvQu-NkCN0nRHPjn0isoCA';
        const updateUrl = `${supabaseUrl}/rest/v1/attendance?id=eq.${openRecord.id}`;

        const headers = {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        };

        // Standard robust clock-out
        try {
          fetch(updateUrl, {
            method: 'PATCH',
            headers,
            body: JSON.stringify(payload),
            keepalive: true,
          });
        } catch (e) {
          console.error("Auto clockout failed", e);
        }
      }
    };

    window.addEventListener('pagehide', handlePageHide);
    return () => window.removeEventListener('pagehide', handlePageHide);
  }, [isClockedIn, records]);

  const handleSignOut = async () => {
    setIsLoggingOut(true);
    setError(null);

    const performSignOut = () => {
      onLogout();
    };

    if (isClockedIn) {
      const openRecord = records.find(r => r.clock_out === null);
      if (openRecord) {
        const clockOutTime = formatDateForDB(new Date());
        const totalTime = calculateDuration(openRecord.clock_in, clockOutTime);

        try {
          const { error: updateError } = await (supabase
            .from('attendance') as any)
            .update({
              clock_out: clockOutTime,
              total_time: totalTime,
              notes: USER_SIGNOUT_NOTE,
            } as any)
            .eq('id', openRecord.id);

          if (updateError) throw updateError;
          performSignOut();

        } catch (error) {
          console.error("Failed to clock out during sign out:", error);
          setError("Could not clock you out. Please check your connection and try again.");
          setIsLoggingOut(false);
          setIsConfirmingSignOut(false);
        }
      } else {
        console.warn("isClockedIn is true, but no open record was found. Signing out anyway.");
        performSignOut();
      }
    } else {
      performSignOut();
    }
  };

  const handleForceClockOut = async (note: string, clockOutDate: Date = new Date()) => {
    const openRecord = records.find(r => r.clock_out === null);
    if (!openRecord) {
      console.warn("Attempted to force clock out, but no open record was found.");
      return;
    }

    setError(null);
    try {
      const clockOutTime = formatDateForDB(clockOutDate);
      const totalTime = calculateDuration(openRecord.clock_in, clockOutTime);

      const { error: updateError } = await (supabase
        .from('attendance') as any)
        .update({
          clock_out: clockOutTime,
          total_time: totalTime,
          notes: note.trim(),
        })
        .eq('id', openRecord.id);

      if (updateError) throw updateError;

      // After successfully clocking out, refresh all data
      await fetchData();

    } catch (err: any) {
      const message = (err && typeof (err as any).message === 'string')
        ? (err as any).message
        : 'An unexpected error occurred during automatic clock-out.';
      setError(message);
      console.error(err);
    }
  };

  // Effect to handle online/offline status for automatic clock-out
  useEffect(() => {
    const handleOnline = () => {
      setShowOfflineWarning(false);

      if (offlineSinceRef.current && isClockedIn) {
        const offlineDuration = new Date().getTime() - offlineSinceRef.current.getTime();
        if (offlineDuration >= OFFLINE_CLOCK_OUT_THRESHOLD_MS) {
          console.log(`Offline for ${offlineDuration / 1000}s. Auto-clocking out.`);
          handleForceClockOut(
            SYSTEM_INTERRUPTION_NOTE,
            offlineSinceRef.current // Use the time when connection was lost
          );
        }
      }
      // Always reset the ref on reconnection
      offlineSinceRef.current = null;
    };

    const handleOffline = () => {
      if (isClockedIn) {
        setShowOfflineWarning(true);
        // Only set the timestamp if it's the first time we've detected being offline
        if (!offlineSinceRef.current) {
          offlineSinceRef.current = new Date();
          console.log('Connection lost, started offline timer at:', offlineSinceRef.current);
        }
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check in case the app loads while offline
    if (!navigator.onLine) {
      handleOffline();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isClockedIn, fetchData]);

  // Heartbeat Effect: Update last_heartbeat every 30 seconds while clocked in
  // Works in background tabs (browser throttles to ~60s, which is acceptable)
  useEffect(() => {
    let heartbeatInterval: ReturnType<typeof setInterval>;

    if (isClockedIn) {
      const sendHeartbeat = async () => {
        // Only send heartbeat if online
        if (!navigator.onLine) return;

        const openRecord = records.find(r => r.clock_out === null);
        if (openRecord) {
          try {
            await (supabase
              .from('attendance') as any)
              .update({ last_heartbeat: new Date().toISOString() })
              .eq('id', openRecord.id);
            console.log('Heartbeat sent at', new Date().toISOString());
          } catch (error) {
            console.error("Failed to send heartbeat:", error);
          }
        }
      };

      // Send immediately on mount/clock-in
      sendHeartbeat();

      // Then every 30 seconds (browser may throttle to ~60s when tab is hidden)
      heartbeatInterval = setInterval(sendHeartbeat, 30000);

      // Page Visibility API: Send heartbeat when tab becomes visible again
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          console.log('Tab became visible, sending catch-up heartbeat');
          sendHeartbeat();
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        if (heartbeatInterval) clearInterval(heartbeatInterval);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }

    return () => {
      if (heartbeatInterval) clearInterval(heartbeatInterval);
    };
  }, [isClockedIn, records]);


  const filterRecordsByDateRange = <T extends { clock_in?: string; idle_start?: string }>(recordsToFilter: T[], dateRange: { start: string; end: string }): T[] => {
    const { start, end } = dateRange;
    if (!start && !end) {
      return recordsToFilter;
    }

    let startDate: Date | null = null;
    if (start) {
      const [year, month, day] = start.split('-').map(Number);
      startDate = new Date(year, month - 1, day, 0, 0, 0, 0);
    }

    let endDate: Date | null = null;
    if (end) {
      const [year, month, day] = end.split('-').map(Number);
      endDate = new Date(year, month - 1, day, 23, 59, 59, 999);
    }

    return recordsToFilter.filter(record => {
      const recordDateStr = record.clock_in || record.idle_start;
      if (!recordDateStr) return false;

      const recordDate = new Date(recordDateStr);
      const isAfterStart = startDate ? recordDate >= startDate : true;
      const isBeforeEnd = endDate ? recordDate <= endDate : true;
      return isAfterStart && isBeforeEnd;
    });
  };

  const filteredRecords = useMemo(() => {
    return filterRecordsByDateRange<AttendanceRecord>(records, dateRange);
  }, [records, dateRange]);

  const filteredIdleRecords = useMemo(() => {
    return filterRecordsByDateRange<IdleRecord>(idleRecords, dateRange);
  }, [idleRecords, dateRange]);


  const filteredDateSummary = useMemo(() => {
    if (!dateRange.start && !dateRange.end) return null;
    const totalMinutes = filteredRecords.reduce((acc, record) => {
      return acc + parseDurationToMinutes(record.total_time);
    }, 0);
    return formatMinutesToHoursMinutes(totalMinutes);
  }, [filteredRecords, dateRange]);

  const formatDateRangeForDisplay = (start: string, end: string): string => {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' };
    const startDate = start ? new Date(start).toLocaleDateString('en-US', options) : null;
    const endDate = end ? new Date(end).toLocaleDateString('en-US', options) : null;

    if (startDate && endDate) {
      if (startDate === endDate) return startDate;
      return `${startDate} to ${endDate}`;
    }
    if (startDate) return `from ${startDate}`;
    if (endDate) return `until ${endDate}`;
    return 'the selected period';
  }

  const currentAttendanceId = useMemo(() => {
    if (!isClockedIn) return null;
    const openRecord = records.find(r => r.clock_out === null);
    return openRecord ? openRecord.id : null;
  }, [isClockedIn, records]);

  const Header = () => (
    <header className="flex items-center justify-between p-4 bg-white border-b border-border-color shadow-sm sticky top-0 z-10">
      <div className="flex items-center space-x-3 flex-1">
        <svg className="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        <div>
          <h1 className="text-xl font-bold text-text-primary">LifeTime</h1>
          <p className="text-sm text-text-secondary">Welcome, {user.name}!</p>
        </div>
      </div>

      <div
        className="flex justify-center flex-shrink-0 px-4 cursor-pointer transition-transform hover:scale-105 active:scale-95"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        title="Scroll to top"
      >
        <img src={logo} alt="Lifewood Logo" className="h-10 w-auto object-contain" />
      </div>

      <div className="flex justify-end flex-1">
        <button
          onClick={() => setIsConfirmingSignOut(true)}
          disabled={isLoggingOut}
          className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors disabled:opacity-50"
        >
          Sign Out
        </button>
      </div>
    </header>
  );

  const Footer = () => (
    <footer className="flex flex-col justify-center items-center bg-transparent mt-auto py-6 border-t border-gray-100">
      <div className="bg-white border border-border-color rounded-lg px-6 py-2 shadow-sm flex items-center justify-center mb-2">
        <img src={logo} alt="Logo" className="h-8 w-auto object-contain" />
      </div>
      <p className="text-xs font-bold">
        <span className="text-primary">Powered by </span>
        <span className="text-accent">Lifewood PH</span>
      </p>
    </footer>
  );

  const TabButton: React.FC<{ tabName: 'attendance' | 'idle' | 'incidents', label: string }> = ({ tabName, label }) => {
    const isActive = activeTab === tabName;
    return (
      <button
        onClick={() => setActiveTab(tabName)}
        className={`px-4 py-2 text-sm font-semibold rounded-t-md transition-colors focus:outline-none ${isActive
          ? 'border-b-2 border-primary text-primary'
          : 'text-text-secondary hover:text-text-primary'
          }`}
        aria-current={isActive ? 'page' : undefined}
      >
        {label}
      </button>
    )
  }

  const ActiveTabTitle = () => {
    switch (activeTab) {
      case 'attendance': return 'Attendance History';
      case 'idle': return 'Idle Time History';
      case 'incidents': return 'Incident Reports';
      default: return 'History';
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="p-4 sm:p-6 lg:p-8 flex-grow">
        <div className="max-w-7xl mx-auto space-y-8">

          {showOfflineWarning && (
            <div className="p-4 text-center text-amber-800 bg-amber-100 border border-amber-200 rounded-lg flex items-center justify-center space-x-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>
                Connection lost. If you remain offline for over 5 minutes, you will be automatically clocked out.
              </span>
            </div>
          )}
          {error && <div className="p-4 text-center text-red-700 bg-red-100 border border-red-200 rounded-lg">{error}</div>}

          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="w-12 h-12 border-4 border-accent border-dashed rounded-full animate-spin"></div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-2">
                  <SummaryCards records={records} />
                </div>
                <div className="lg:col-span-1">
                  <RealTimeClock elapsedTime={elapsedTime} />
                </div>
              </div>

              <DateFilter
                dateRange={dateRange}
                onDateRangeChange={setDateRange}
                onClear={() => setDateRange({ start: '', end: '' })}
              />

              {(dateRange.start || dateRange.end) && (
                <div className="bg-white p-6 rounded-xl border border-primary-hover shadow-lg flex items-center space-x-4">
                  <div className="p-3 rounded-full bg-icon-bg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  </div>
                  <div>
                    <p className="text-text-secondary text-sm">
                      Total time for {formatDateRangeForDisplay(dateRange.start, dateRange.end)}
                    </p>
                    <p className="text-2xl font-bold text-text-primary">{filteredDateSummary}</p>
                  </div>
                </div>
              )}

              <div className="bg-white p-4 sm:p-6 rounded-xl border border-border-color shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                  <h2 className="text-xl font-semibold text-text-primary">
                    <ActiveTabTitle />
                  </h2>
                  {activeTab !== 'incidents' && (
                    <ClockButtons
                      user={user}
                      isClockedIn={isClockedIn}
                      onUpdate={fetchData}
                    />
                  )}
                </div>
                <div className="border-b border-border-color">
                  <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    <TabButton tabName="attendance" label="Attendance" />
                    <TabButton tabName="idle" label="Idle Time" />
                    <TabButton tabName="incidents" label="Incident Reports" />
                  </nav>
                </div>
                <div className="mt-4">
                  {activeTab === 'attendance' && <HistoryTable records={filteredRecords} />}
                  {activeTab === 'idle' && <IdleHistoryTable records={filteredIdleRecords} />}
                  {activeTab === 'incidents' && <IncidentReports user={user} initialReports={incidentReports} onUpdate={fetchData} />}
                </div>
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
      <IdleAlarm
        isActive={isClockedIn}
        user={user}
        currentAttendanceId={currentAttendanceId}
        onForceClockOut={handleForceClockOut}
      />
      <ConfirmationModal
        isOpen={isConfirmingSignOut}
        onClose={() => setIsConfirmingSignOut(false)}
        onConfirm={handleSignOut}
        title="Confirm Sign Out"
        message={isClockedIn ? "You are currently clocked in and will be clocked out. Are you sure you want to sign out?" : "Are you sure you want to sign out?"}
        isLoading={isLoggingOut}
        confirmText="Yes, Sign Out"
        cancelText="Cancel"
        intent="destructive"
      />
    </div>
  );
};

export default Dashboard;