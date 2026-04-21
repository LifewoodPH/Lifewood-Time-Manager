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

  const GlassIcon = ({ icon, color = 'primary' }: { icon: React.ReactElement, color?: string }) => (
    <div className="relative group shrink-0">
      {/* 3D Depth Layers */}
      <div className="absolute inset-0 bg-accent/20 rounded-2xl blur-xl group-hover:bg-accent/40 transition-colors duration-500"></div>
      <div className="relative flex items-center justify-center w-14 h-14 rounded-2xl bg-white/40 backdrop-blur-md border border-white/60 shadow-[0_8px_32px_rgba(4,98,65,0.1)] overflow-hidden">
        {/* Shine Effect */}
        <div className="absolute -top-10 -left-10 w-20 h-20 bg-white/30 rounded-full blur-2xl"></div>
        <div className="relative z-10 flex items-center justify-center transform group-hover:scale-110 transition-transform duration-500">
           {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { 
             className: `h-7 w-7 text-primary filter drop-shadow-[0_2px_4px_rgba(4,98,65,0.2)]` 
           })}
        </div>
        {/* Bottom Inner Shadow for 3D feel */}
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-primary/5 to-transparent"></div>
      </div>
    </div>
  );

  const SummaryCard = ({ title, time, icon }: { title: string; time: string; icon: React.ReactElement }) => (
    <div className={`liquid-glass p-4 rounded-[1.5rem] h-full flex flex-col justify-center hover:shadow-[0_12px_40px_rgba(4,98,65,0.1)] transition-all duration-500 relative overflow-hidden group border border-white/50 active:scale-[0.98]`}>
      {/* Dynamic background glow that moves on card hover */}
      <div className="absolute -right-8 -top-8 w-32 h-32 bg-accent/10 rounded-full blur-3xl group-hover:bg-accent/20 transition-all duration-700 pointer-events-none"></div>

      <div className="flex flex-col xl:flex-row items-center xl:items-start text-center xl:text-left space-y-4 xl:space-y-0 xl:space-x-1.5 relative z-10 w-full">
        <GlassIcon icon={icon} />
        <div className="flex flex-col items-center xl:items-start justify-center flex-1 w-full pl-2">
          <p className="text-gray-400 text-[0.65rem] font-black uppercase tracking-[0.2em] w-full xl:w-auto">{title}</p>
          <p className="text-2xl lg:text-3xl font-black text-gray-900 tracking-tighter w-full xl:w-auto mt-0.5">{time}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full w-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 flex-1 w-full min-h-0">
        <SummaryCard title="Today" time={summaries.today} icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" /></svg>} />
        <SummaryCard title="This Week" time={summaries.week} icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>} />
        <SummaryCard title="This Month" time={summaries.month} icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>} />
        <SummaryCard title="This Year" time={summaries.year} icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>} />
      </div>
    </div>
  );
};

export default SummaryCards;