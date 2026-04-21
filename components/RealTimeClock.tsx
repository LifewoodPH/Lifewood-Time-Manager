import React, { useState, useEffect } from 'react';

interface RealTimeClockProps {
  elapsedTime: string | null;
}

const formatTime = (date: Date) => {
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  
  const strHours = hours < 10 ? `0${hours}` : hours.toString();
  const strMinutes = minutes < 10 ? `0${minutes}` : minutes.toString();
  const strSeconds = seconds < 10 ? `0${seconds}` : seconds.toString();
  
  return { hours: strHours, minutes: strMinutes, seconds: strSeconds, ampm };
};

const FlipDigit = ({ digit, title, ampm }: { digit: string, title: string, ampm?: string }) => (
  <div className="flex flex-col items-center flex-1 sm:w-32 md:w-36 lg:w-40 min-w-0">
    <div className="relative bg-gradient-to-b from-[#242424] to-[#0c0c0c] rounded-xl sm:rounded-[1.5rem] shadow-[0_12px_30px_rgba(0,0,0,0.2)] flex items-center justify-center w-full h-16 sm:h-32 md:h-36 lg:h-40 overflow-hidden border border-white/10 ring-1 ring-black/50">
      
      {/* Top half gradient to simulate curved physical depth */}
      <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/10 to-transparent z-10 pointer-events-none"></div>

      {/* Main Digit */}
      <span 
        className="text-3xl sm:text-[4.5rem] md:text-[5.5rem] lg:text-[6.5rem] font-black text-[#f0f0f0] leading-none tracking-tighter z-0" 
        style={{ textShadow: '0 6px 12px rgba(0,0,0,0.8)' }}
      >
        {digit}
      </span>
      
      {/* Optional AM/PM tag specifically nested in front */}
      {ampm && (
        <span className="absolute bottom-2 left-2 sm:bottom-4 sm:left-4 text-[0.6rem] sm:text-xs md:text-sm font-bold text-gray-500 tracking-widest z-30 uppercase">
          {ampm}
        </span>
      )}
    </div>

    {/* Dedicated Under-Labels */}
    <span className="mt-3 sm:mt-4 text-[0.6rem] sm:text-[0.7rem] md:text-xs font-black text-gray-400 uppercase tracking-[0.25em] opacity-80">
      {title}
    </span>
  </div>
);

const RealTimeClock: React.FC<RealTimeClockProps> = ({ elapsedTime }) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    // Sync to start at the exact start of a second for smoother UX
    const timeoutId = setTimeout(() => {
      setTime(new Date());
      const timerId = setInterval(() => {
        setTime(new Date());
      }, 1000);
      return () => clearInterval(timerId);
    }, 1000 - new Date().getMilliseconds());

    return () => clearTimeout(timeoutId);
  }, []);

  const { hours, minutes, seconds, ampm } = formatTime(time);

  return (
    <div className="flex flex-col items-start justify-start w-full h-full pb-2">
      <div className="flex flex-row items-center justify-start w-full gap-3 sm:gap-5 md:gap-6">
        {/* Hours Box */}
        <FlipDigit digit={hours} title="Hours" ampm={ampm} />
        {/* Minutes Box */}
        <FlipDigit digit={minutes} title="Minutes" />
        {/* Seconds Box */}
        <FlipDigit digit={seconds} title="Seconds" />
      </div>

      {/* Live Calendar Timeline Section */}
      <div className="mt-8 mb-4 w-full text-left animate-in fade-in slide-in-from-left-4 duration-1000">
        {/* Large Header: Month + Date + Year */}
        <div className="flex justify-between items-end border-b border-gray-100 pb-4 mb-6">
          <div className="flex flex-col">
             <span className="text-4xl sm:text-5xl font-light text-gray-900 tracking-tight">
               {time.toLocaleDateString('en-US', { month: 'long' })}
             </span>
             <span className="text-sm font-bold text-accent tracking-[0.3em] uppercase opacity-80 mt-1">
               {time.getFullYear()}
             </span>
          </div>
          <span className="text-5xl sm:text-6xl font-light text-gray-900">
            {time.getDate()}
          </span>
        </div>

        {/* Weekly Timeline Strip */}
        <div className="flex justify-between items-center w-full px-1">
          {Array.from({ length: 7 }).map((_, i) => {
            const d = new Date(time);
            // Calculate start of week (Sunday)
            const dayOfWeek = time.getDay();
            d.setDate(time.getDate() - dayOfWeek + i);
            
            const isToday = d.getDate() === time.getDate() && d.getMonth() === time.getMonth();
            const dayInitial = ['S', 'M', 'T', 'W', 'T', 'F', 'S'][i];

            return (
              <div key={i} className="flex flex-col items-center space-y-1 sm:space-y-2">
                <span className="text-[8px] sm:text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none">{dayInitial}</span>
                <div className={`
                   flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-[10px] transition-all duration-700
                   ${isToday 
                     ? 'bg-white text-primary shadow-[0_10px_20px_rgba(0,0,0,0.06)] ring-1 ring-black/5 scale-110' 
                     : 'text-text-secondary hover:bg-gray-50'
                   }
                `}>
                  <span className={`text-xs sm:text-[15px] font-black ${isToday ? 'text-primary' : 'text-gray-600'}`}>
                    {d.getDate()}
                  </span>
                </div>
                <div className={`w-1 h-1 rounded-full ${isToday ? 'bg-accent' : 'bg-transparent'}`}></div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Session Timer */}
      {elapsedTime && (
        <div className="text-left mt-8 pt-6 border-t border-border-color w-full">
          <p className="text-xs sm:text-sm font-bold text-text-secondary uppercase tracking-widest mb-2">Session elapsed</p>
          <p className="text-2xl sm:text-3xl font-mono font-extrabold text-primary tracking-wider">
            {elapsedTime}
          </p>
        </div>
      )}
    </div>
  );
};

export default RealTimeClock;
