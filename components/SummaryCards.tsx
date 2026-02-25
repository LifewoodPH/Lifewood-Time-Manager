import React, { useMemo } from 'react';
import type { AttendanceRecord } from '../types';
import { parseDurationToMinutes, formatMinutesToHoursMinutes } from '../utils/time';

interface SummaryCardsProps {
  records: AttendanceRecord[];
}

const SummaryCards: React.FC<SummaryCardsProps> = ({ records }) => {

  const summaries = useMemo(() => {
    let todayMinutes = 0;
    let weekMinutes = 0;
    let monthMinutes = 0;
    let yearMinutes = 0;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - now.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    records.forEach(record => {
      if (!record.total_time || !record.clock_in) return;

      const recordDate = new Date(record.clock_in);
      const durationMinutes = parseDurationToMinutes(record.total_time);

      if (recordDate >= startOfToday) {
        todayMinutes += durationMinutes;
      }
      if (recordDate >= startOfWeek) {
        weekMinutes += durationMinutes;
      }
      if (recordDate >= startOfMonth) {
        monthMinutes += durationMinutes;
      }
      if (recordDate >= startOfYear) {
        yearMinutes += durationMinutes;
      }
    });

    return {
      today: formatMinutesToHoursMinutes(todayMinutes),
      week: formatMinutesToHoursMinutes(weekMinutes),
      month: formatMinutesToHoursMinutes(monthMinutes),
      year: formatMinutesToHoursMinutes(yearMinutes),
    };

  }, [records]);

  const SummaryCard = ({ title, time, icon }: { title: string; time: string; icon: React.ReactElement }) => (
    <div className={`bg-white p-6 rounded-2xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-shadow duration-300 flex flex-col space-y-4 relative overflow-hidden`}>
      {/* Decorative subtle background circle */}
      <div className="absolute -right-6 -top-6 w-24 h-24 bg-primary/5 rounded-full blur-xl pointer-events-none"></div>

      <div className="flex items-center space-x-4 relative z-10">
        <div className={`p-3.5 rounded-xl bg-gradient-to-br from-green-50 to-emerald-100 text-primary shadow-sm border border-emerald-100/50`}>
          {icon}
        </div>
        <div>
          <p className="text-gray-500 text-sm font-medium tracking-wide">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-0.5 tracking-tight">{time}</p>
        </div>
      </div>
    </div>
  );

  const iconClass = "h-6 w-6 text-primary";

  return (
    <div>
      <h2 className="text-xl font-semibold text-text-primary mb-4">Time Summary</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard title="Today" time={summaries.today} icon={<svg xmlns="http://www.w3.org/2000/svg" className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>} />
        <SummaryCard title="This Week" time={summaries.week} icon={<svg xmlns="http://www.w3.org/2000/svg" className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9V3m-9 9h18" /></svg>} />
        <SummaryCard title="This Month" time={summaries.month} icon={<svg xmlns="http://www.w3.org/2000/svg" className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>} />
        <SummaryCard title="This Year" time={summaries.year} icon={<svg xmlns="http://www.w3.org/2000/svg" className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2h8a2 2 0 002-2v-1a2 2 0 012-2h1.945M7.905 11l.92-2.301a2 2 0 013.84 0l.92 2.301M12 12a2 2 0 110-4 2 2 0 010 4z" /></svg>} />
      </div>
    </div>
  );
};

export default SummaryCards;