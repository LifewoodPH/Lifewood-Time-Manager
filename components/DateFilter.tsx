import React, { useState, useRef, useEffect, useMemo } from 'react';

// Helper to format date consistently
const formatDate = (date: Date) => {
  const d = new Date(date);
  let month = '' + (d.getMonth() + 1);
  let day = '' + d.getDate();
  const year = d.getFullYear();

  if (month.length < 2) month = '0' + month;
  if (day.length < 2) day = '0' + day;

  return [year, month, day].join('-');
};

const getDaysInMonth = (month: number, year: number) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (month: number, year: number) => {
  const day = new Date(year, month, 1).getDay();
  // Adjust so Monday is 0, Sunday is 6
  return day === 0 ? 6 : day - 1;
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface CustomDatePickerProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  minDate?: string;
  maxDate?: string;
}

const CustomDatePicker: React.FC<CustomDatePickerProps> = ({ label, value, onChange, minDate, maxDate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const initialDate = value ? new Date(value) : new Date();
  const [currentMonth, setCurrentMonth] = useState(initialDate.getMonth());
  const [currentYear, setCurrentYear] = useState(initialDate.getFullYear());
  const [tempSelectedDate, setTempSelectedDate] = useState<string | null>(value || null);

  useEffect(() => {
    if (isOpen) {
      const activeDate = value ? new Date(value) : new Date();
      setCurrentMonth(activeDate.getMonth());
      setCurrentYear(activeDate.getFullYear());
      setTempSelectedDate(value || null);
    }
  }, [isOpen, value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const daysInMonth = getDaysInMonth(currentMonth, currentYear);
  const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
  
  const handlePrevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
    else setCurrentMonth(m => m - 1);
  };
  
  const handleNextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
    else setCurrentMonth(m => m + 1);
  };

  const handleConfirm = () => {
    if (tempSelectedDate) {
      onChange(tempSelectedDate);
    }
    setIsOpen(false);
  };

  const generateDays = () => {
    const days = [];
    const prevMonthDays = getDaysInMonth(currentMonth === 0 ? 11 : currentMonth - 1, currentMonth === 0 ? currentYear - 1 : currentYear);
    
    // Previous month filler days
    for (let i = 0; i < firstDay; i++) {
      days.push({ day: prevMonthDays - firstDay + i + 1, isCurrentMonth: false, fullDate: '' });
    }
    
    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
        const fullDateStr = formatDate(new Date(currentYear, currentMonth, i));
        days.push({ day: i, isCurrentMonth: true, fullDate: fullDateStr });
    }
    
    // Next month filler days
    const totalSlots = Math.ceil(days.length / 7) * 7;
    const remaining = totalSlots - days.length;
    for (let i = 1; i <= remaining; i++) {
        days.push({ day: i, isCurrentMonth: false, fullDate: '' });
    }
    
    return days;
  };

  const days = generateDays();

  // Create years array for dropdown (from 5 years ago to 5 years future)
  const years = useMemo(() => Array.from({length: 20}, (_, i) => new Date().getFullYear() - 10 + i), []);

  return (
    <div className="relative" ref={containerRef}>
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2.5 bg-white/70 backdrop-blur-md border border-white/60 rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary shadow-sm transition hover:bg-white text-left flex justify-between items-center"
      >
        <span>{value || 'Select date'}</span>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 z-50 animate-in fade-in zoom-in-95 duration-200">
          {/* Outer matching the 30% rule (Forest Green #046241) */}
          <div className="bg-primary p-4 rounded-[2rem] w-80 shadow-[0_20px_50px_rgba(4,98,65,0.4)] border border-primary-hover">
            <div className="flex justify-between items-center text-white mb-4 px-2">
              <span className="font-bold text-lg">{label}</span>
              <div className="flex space-x-3">
                <button type="button" onClick={handlePrevMonth} className="hover:text-accent transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
                <button type="button" onClick={handleNextMonth} className="hover:text-accent transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Inner matching the 60% rule (White/Glass) */}
            <div className="bg-white rounded-3xl p-5 shadow-inner flex flex-col">
              <div className="flex justify-between items-center mb-5 px-1">
                <div className="flex space-x-2">
                    <select 
                        value={currentMonth} 
                        onChange={(e) => setCurrentMonth(Number(e.target.value))}
                        className="bg-gray-100/50 hover:bg-gray-100 text-primary font-bold py-1.5 px-2 rounded-lg outline-none text-sm cursor-pointer border border-gray-200/50 appearance-none text-center"
                    >
                        {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
                    </select>
                    <select 
                        value={currentYear} 
                        onChange={(e) => setCurrentYear(Number(e.target.value))}
                        className="bg-gray-100/50 hover:bg-gray-100 text-primary font-bold py-1.5 px-2 rounded-lg outline-none text-sm cursor-pointer border border-gray-200/50 appearance-none text-center"
                    >
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-[10px] sm:text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider">
                <span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span><span>Su</span>
              </div>

              <div className="grid grid-cols-7 gap-y-2 gap-x-1 text-sm text-center">
                {days.map((d, i) => {
                  if (!d.isCurrentMonth) {
                    return <div key={`empty-${i}`} className="text-gray-300 py-1.5 font-medium">{d.day}</div>;
                  }

                  const isSelected = d.fullDate === tempSelectedDate;
                  const isDisabled = (minDate && d.fullDate < minDate) || (maxDate && d.fullDate > maxDate);

                  return (
                    <button
                      key={`day-${i}`}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => setTempSelectedDate(d.fullDate)}
                      className={`
                        py-1.5 w-8 h-8 mx-auto rounded-full font-bold transition-all
                        ${isSelected 
                            ? 'bg-accent text-primary shadow-lg scale-110 shadow-accent/40' // 10% Focus rule applied
                            : 'text-text-primary hover:bg-primary/10'
                        }
                        ${isDisabled ? 'opacity-30 cursor-not-allowed hidden bg-transparent hover:bg-transparent' : ''}
                      `}
                    >
                      {d.day}
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 flex justify-between items-center font-sans">
                <button 
                  type="button" 
                  onClick={handleConfirm}
                  className="bg-accent hover:bg-accent-hover text-primary shadow-md shadow-accent/20 px-6 py-2.5 rounded-xl font-extrabold text-sm transition-transform active:scale-95"
                >
                  Confirm
                </button>
                <button 
                  type="button" 
                  onClick={() => setIsOpen(false)}
                  className="text-text-secondary hover:text-text-primary font-bold text-sm px-4"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface DateFilterProps {
  dateRange: { start: string; end: string };
  onDateRangeChange: (range: { start: string; end: string }) => void;
  onClear: () => void;
}

const DateFilter: React.FC<DateFilterProps> = ({ dateRange, onDateRangeChange, onClear }) => {
  return (
    <div className="liquid-glass p-4 rounded-[2rem] border border-white/60 shadow-lg relative z-10 w-full">
      <div className="flex justify-between items-center mb-3">
          <h2 className="text-xl font-bold text-primary flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Time Filter
          </h2>
          <button
            onClick={onClear}
            disabled={!dateRange.start && !dateRange.end}
            className="px-4 py-2 bg-white/40 hover:bg-white text-text-primary rounded-xl text-sm font-bold shadow-sm transition-all border border-white/50 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Clear Filter
          </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
        <div className="w-full">
          <label className="block text-sm font-bold text-primary mb-1 pl-1">Start Date</label>
          <CustomDatePicker 
            label="Start Date" 
            value={dateRange.start} 
            onChange={(val) => onDateRangeChange({ ...dateRange, start: val })} 
            maxDate={dateRange.end || undefined}
          />
        </div>
        <div className="w-full">
          <label className="block text-sm font-bold text-primary mb-1 pl-1">End Date</label>
          <CustomDatePicker 
            label="End Date" 
            value={dateRange.end} 
            onChange={(val) => onDateRangeChange({ ...dateRange, end: val })} 
            minDate={dateRange.start || undefined}
          />
        </div>
      </div>
    </div>
  );
};

export default DateFilter;
