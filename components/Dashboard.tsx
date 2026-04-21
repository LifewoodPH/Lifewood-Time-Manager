
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { User, AttendanceRecord, IdleRecord, IncidentReport } from '../types';
import { supabase } from '../services/supabaseClient';
import logo from '../public/lifewood.png';
import logo3 from '../public/timeadmin.png';
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


  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Fetch all user-related records concurrently
      const [attendanceRes, idleRes, incidentsRes] = await Promise.all([
        (supabase as any)
          .from('attendance')
          .select('*')
          .eq('user_id', user.userid)
          .order('created_at', { ascending: false }),
        (supabase as any)
          .from('idle_time')
          .select('*')
          .eq('user_id', user.userid)
          .order('created_at', { ascending: false }),
        (supabase as any)
          .from('incident_reports')
          .select('*')
          .eq('user_id', user.userid)
          .order('created_at', { ascending: false }),
      ]);

      if (attendanceRes.error) throw attendanceRes.error;
      if (idleRes.error) throw idleRes.error;
      if (incidentsRes.error) throw incidentsRes.error;

      const safeAttendanceData = (attendanceRes.data || []) as AttendanceRecord[];
      setRecords(safeAttendanceData);
      setIdleRecords((idleRes.data || []) as IdleRecord[]);
      setIncidentReports((incidentsRes.data || []) as IncidentReport[]);

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

          // 8 hours = 28800 seconds
          if (durationSeconds >= 28800) {
            handleForceClockOut("8 hours trigger auto clock out, clock in again for overtime.");
            if (timer) clearInterval(timer);
          }
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

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isClockedIn) {
        const message = 'You are currently clocked in. Refreshing or closing this page will automatically clock you out. Are you sure you want to continue?';
        event.preventDefault();
        event.returnValue = message; // For legacy browsers
        return message; // For modern browsers
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isClockedIn]);

  useEffect(() => {
    const handlePageHide = () => {
      if (isClockedIn) {
        const openRecord = records.find(r => r.clock_out === null);
        if (!openRecord) return;

        // Prepare data for clocking out.
        const clockOutTime = formatDateForDB(new Date());
        const totalTime = calculateDuration(openRecord.clock_in, clockOutTime);
        const payload = {
          clock_out: clockOutTime,
          total_time: totalTime,
          notes: SYSTEM_INTERRUPTION_NOTE,
        };

        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        const updateUrl = `${supabaseUrl}/rest/v1/attendance?id=eq.${openRecord.id}`;

        const headers = {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`, // Use anon key
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        };

        // Use `fetch` with `keepalive: true` to ensure the request is sent
        // even after the page is closed/hidden. This is a "fire and forget" request.
        try {
          fetch(updateUrl, {
            method: 'PATCH',
            headers,
            body: JSON.stringify(payload),
            keepalive: true,
          });
        } catch (e) {
          console.error("Fetch with keepalive failed during page hide.", e);
        }
      }
    };

    window.addEventListener('pagehide', handlePageHide);

    return () => {
      window.removeEventListener('pagehide', handlePageHide);
    };
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
          const { error: updateError } = await (supabase as any)
            .from('attendance')
            .update({
              clock_out: clockOutTime,
              total_time: totalTime,
              notes: SYSTEM_INTERRUPTION_NOTE,
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

      const { error: updateError } = await (supabase as any)
        .from('attendance')
        .update({
          clock_out: clockOutTime,
          total_time: totalTime,
          notes: note.trim(),
        } as any)
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
    <header className="flex items-center justify-between p-2 sm:p-3 liquid-glass sticky top-0 z-50 border-b-0 m-2 sm:m-3 rounded-2xl sm:rounded-[2rem] mx-2 sm:mx-8 lg:mx-10 xl:mx-12 flex-shrink-0">
      <div className="flex items-center space-x-2 sm:space-x-3 flex-1">
        <img src={logo3} alt="LifeTime Logo" className="h-10 w-10 sm:h-[3.25rem] sm:w-[3.25rem] object-cover mix-blend-multiply rounded-full animate-[spin_10s_linear_infinite]" />
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-bold text-text-primary truncate">LifeTime</h1>
          <p className="text-xs sm:text-sm text-text-secondary truncate">Hi, {user.name}!</p>
        </div>
      </div>

      <div
        className="hidden md:flex justify-center flex-shrink-0 px-4 cursor-pointer transition-transform hover:scale-105 active:scale-95"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        title="Scroll to top"
      >
        <img src={logo} alt="Lifewood Logo" className="h-10 w-auto object-contain mix-blend-multiply" />
      </div>

      <div className="flex justify-end flex-1">
        <button
          onClick={() => setIsConfirmingSignOut(true)}
          disabled={isLoggingOut}
          className="px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-white bg-primary rounded-lg sm:rounded-md hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors disabled:opacity-50"
        >
          Sign Out
        </button>
      </div>
    </header>
  );

  const Footer = () => (
    <footer className="flex flex-col justify-center items-center bg-transparent mt-auto py-3 border-t border-gray-100 flex-shrink-0">
      <div className="flex items-center justify-center mb-1">
        <img src={logo} alt="Logo" className="h-6 w-auto object-contain mix-blend-multiply" />
      </div>
      <p className="text-[10px] font-bold">
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
        className={`px-5 py-2.5 text-sm font-semibold rounded-full transition-all focus:outline-none ${isActive
          ? 'bg-primary text-white shadow-md transform scale-105'
          : 'text-text-secondary hover:text-text-primary hover:bg-gray-100'
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
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#F8FAFC] to-[#ECFDF5] relative overflow-x-hidden">
      <Header />
      <main className="px-2 sm:px-8 lg:px-10 xl:px-12 pb-6 flex-1 flex flex-col">
        <div className="w-full flex-1 flex flex-col min-w-0">


          {error && <div className="mb-4 p-4 text-center text-red-700 bg-red-100 border border-red-200 rounded-lg flex-shrink-0">{error}</div>}

          {isLoading ? (
            <div className="flex justify-center items-center h-full">
              <div className="w-14 h-14 border-[5px] border-accent border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="flex flex-col gap-4 lg:gap-6 flex-1">
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 lg:gap-6 w-full flex-1">
                  
                  {/* Left Column (Span 8) */}
                  <div className="xl:col-span-8 flex flex-col gap-4 h-full min-h-0">
                      <div className="w-full">
                         <SummaryCards records={records} />
                      </div>

                      <div className="w-full">
                        <DateFilter
                          dateRange={dateRange}
                          onDateRangeChange={setDateRange}
                          onClear={() => setDateRange({ start: '', end: '' })}
                        />
                      </div>

                      {(dateRange.start || dateRange.end) && (
                        <div className="liquid-glass p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] flex items-center space-x-4 sm:space-x-6 border border-white/60 shadow-lg">
                          <div className="p-3 sm:p-4 rounded-full bg-icon-bg shadow-inner shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 sm:h-8 sm:w-8 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          </div>
                          <div>
                            <p className="text-text-secondary text-[0.65rem] sm:text-sm font-bold tracking-wide uppercase">
                              Total time for {formatDateRangeForDisplay(dateRange.start, dateRange.end)}
                            </p>
                            <p className="text-2xl sm:text-4xl font-extrabold text-text-primary mt-0.5 sm:mt-1.5">{filteredDateSummary}</p>
                          </div>
                        </div>
                      )}

                      {/* History Section Moved Here to fill the gap */}
                      <div className="w-full xl:flex-1 min-h-0">
                          <div className="liquid-glass p-4 sm:p-6 md:px-10 md:py-4 rounded-[1.5rem] sm:rounded-[2rem] shadow-[0_12px_40px_rgba(4,98,65,0.08)] border border-white/60 flex flex-col overflow-hidden">
                            <div className="flex flex-wrap items-center justify-between gap-4 mb-2 flex-shrink-0">
                              <h2 className="text-xl sm:text-[1.75rem] font-extrabold text-gray-900 tracking-tight">
                                <ActiveTabTitle />
                              </h2>
                            </div>
                            <div className="border-b border-gray-200/60 pb-2 mb-3 flex-shrink-0">
                              <nav className="-mb-px flex space-x-2 sm:space-x-6 overflow-x-auto no-scrollbar" aria-label="Tabs">
                                <TabButton tabName="attendance" label="Attendance" />
                                <TabButton tabName="idle" label="Idle" />
                                <TabButton tabName="incidents" label="Incidents" />
                              </nav>
                            </div>
                            <div className="overflow-y-auto no-scrollbar pb-2 min-h-[300px] xl:flex-1">
                              {activeTab === 'attendance' && <HistoryTable records={filteredRecords} />}
                              {activeTab === 'idle' && <IdleHistoryTable records={filteredIdleRecords} />}
                              {activeTab === 'incidents' && <IncidentReports user={user} initialReports={incidentReports} onUpdate={fetchData} />}
                            </div>
                          </div>
                      </div>
                  </div>

                  {/* Right Tall Area (Span 4) */}
                  <div className="xl:col-span-4 flex flex-col min-w-0 h-full">
                      <div className="h-full liquid-glass rounded-[2rem] shadow-[0_8px_32px_rgba(4,98,65,0.06)] border border-white/60 flex flex-col relative overflow-hidden p-6 sm:p-8">
                          {/* Top decor */}
                          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-accent/20 to-transparent rounded-bl-full pointer-events-none"></div>
                          
                          <div className="flex justify-between items-center mb-6 relative z-10">
                            <h3 className="font-extrabold text-gray-900 text-lg sm:text-xl">Current Session</h3>
                            <div className="w-2.5 h-2.5 rounded-full bg-accent animate-pulse shadow-[0_0_10px_rgba(255,195,112,0.8)]"></div>
                          </div>
 
                          <div className="flex-1 flex flex-col justify-start items-start w-full">
                              <RealTimeClock elapsedTime={elapsedTime} />
                          </div>
 
                          <div className="mt-8 w-full relative z-10 font-bold">
                            <ClockButtons
                                user={user}
                                isClockedIn={isClockedIn}
                                onUpdate={fetchData}
                              />
                          </div>
                      </div>
                  </div>
              </div>
            </div>
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