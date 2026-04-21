
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import type { User } from '../types';
import { formatDateForDB } from '../utils/time';

interface IdleAlarmProps {
  isActive: boolean; // Control whether the alarm is running
  user: User | null;
  currentAttendanceId: string | null;
  onForceClockOut: (note: string) => Promise<void>;
}

const ALARM_INTERVAL_MS = 20 * 60 * 1000; // 20 minutes
const SNOOZE_WINDOW_MS = 3 * 1000; // 10 seconds
const AUTO_CLOCK_OUT_DURATION_MS = 20 * 60 * 1000; // 20 minutes of being idle

// Request notification permission when the app starts
if (typeof window !== 'undefined' && 'Notification' in window) {
  Notification.requestPermission();
}

const IdleAlarm: React.FC<IdleAlarmProps> = ({ isActive, user, currentAttendanceId, onForceClockOut }) => {
  const [showPopup, setShowPopup] = useState(false);
  const [isIdle, setIsIdle] = useState(false);
  const [idleTime, setIdleTime] = useState(0);
  const [autoClockOutTimeLeft, setAutoClockOutTimeLeft] = useState(AUTO_CLOCK_OUT_DURATION_MS / 1000);
  const [isAutoClockingOut, setIsAutoClockingOut] = useState(false);
  const [currentIdleRecordId, setCurrentIdleRecordId] = useState<string | null>(null);

  const mainTimerRef = useRef<number | null>(null);
  const snoozeTimeoutRef = useRef<number | null>(null);
  const idleTimerRef = useRef<number | null>(null);
  const autoClockOutTimerRef = useRef<number | null>(null);
  const autoClockOutIntervalRef = useRef<number | null>(null);
  const notificationRef = useRef<Notification | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const soundIntervalRef = useRef<number | null>(null);
  const idleStartTimeRef = useRef<Date | null>(null);

  // Function to play a ringing sound
  const playRingingSound = async () => {
    try {
      // If context doesn't exist or is suspended, create/resume it
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      const context = audioContextRef.current;
      
      // Create a more distinctive dual-tone ring (like a phone)
      const createTone = (frequency: number) => {
        const osc = context.createOscillator();
        const gain = context.createGain();
        
        osc.connect(gain);
        gain.connect(context.destination);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(frequency, context.currentTime);
        
        // Create a more phone-like envelope
        gain.gain.setValueAtTime(0, context.currentTime);
        gain.gain.linearRampToValueAtTime(0.15, context.currentTime + 0.1);
        gain.gain.linearRampToValueAtTime(0.15, context.currentTime + 0.3);
        gain.gain.linearRampToValueAtTime(0, context.currentTime + 0.4);
        
        osc.start(context.currentTime);
        osc.stop(context.currentTime + 0.4);
        
        return { oscillator: osc, gainNode: gain };
      };

      // Create two tones for a more traditional ring sound
      const tone1 = createTone(1550);
      const tone2 = createTone(1900);

      // Cleanup after the sound plays
      setTimeout(() => {
        tone1.gainNode.disconnect();
        tone2.gainNode.disconnect();
      }, 500);

    } catch (error) {
      console.error('Error playing sound:', error);
      // Try alternative simpler sound if the first attempt fails
      try {
        const simpleContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = simpleContext.createOscillator();
        osc.connect(simpleContext.destination);
        osc.start(0);
        osc.stop(0.1);
      } catch (fallbackError) {
        console.error('Fallback sound also failed:', fallbackError);
      }
    }
  };

  // Function to start repeating ring
  const startRepeatingRing = async () => {
    // Ensure we have user interaction first
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      // Resume the audio context if it's suspended
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      
      // Play the first sound
      await playRingingSound();
      
      // Then set up the interval
      soundIntervalRef.current = window.setInterval(playRingingSound, 2000);
    } catch (error) {
      console.error('Error starting ring sequence:', error);
    }
  };

  // Function to stop repeating ring
  const stopRepeatingRing = () => {
    if (soundIntervalRef.current) {
      clearInterval(soundIntervalRef.current);
      soundIntervalRef.current = null;
    }
    // Don't close the audio context, just disconnect any active nodes
    if (audioContextRef.current) {
      const destination = audioContextRef.current.destination;
      // Disconnect all nodes connected to the destination
      if (typeof destination.disconnect === 'function') {
        destination.disconnect();
      }
    }
  };

  // Function to show notification with stock sound
  const showNotification = () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        // Close any existing notification
        if (notificationRef.current) {
          notificationRef.current.close();
        }
        // Create a new notification
        notificationRef.current = new Notification('Idle Alert', {
          body: 'Are you still there? Click to confirm you\'re working.',
          icon: '/favicon.ico', // You can add your app's icon here
          requireInteraction: true, // Notification won't auto-dismiss
          silent: false // This ensures the default notification sound plays
        });
      }
    }
  };

  const resetTimers = () => {
    if (mainTimerRef.current) clearTimeout(mainTimerRef.current);
    if (snoozeTimeoutRef.current) clearTimeout(snoozeTimeoutRef.current);
    if (idleTimerRef.current) clearInterval(idleTimerRef.current);
    if (autoClockOutTimerRef.current) clearTimeout(autoClockOutTimerRef.current);
    if (autoClockOutIntervalRef.current) clearInterval(autoClockOutIntervalRef.current);
  };

  const startMainTimer = () => {
    resetTimers();
    if (!isActive) return;

    mainTimerRef.current = window.setTimeout(() => {
      setShowPopup(true);
      showNotification(); // Show notification with stock sound

      snoozeTimeoutRef.current = window.setTimeout(async () => {
        setIsIdle(true);
        idleStartTimeRef.current = new Date();
        
        // Use a local variable to pass the new ID to the timeout closure
        let newIdleRecordId: string | null = null;
        
        if (user && currentAttendanceId) {
            const { data, error } = await (supabase as any)
              .from('idle_time')
              .insert({
                user_id: user.userid,
                attendance_id: currentAttendanceId,
                idle_start: formatDateForDB(idleStartTimeRef.current),
              } as any)
              .select()
              .single();

            if (error) {
                console.error("Failed to log idle start:", error);
            } else if (data) {
                setCurrentIdleRecordId((data as any).id);
                newIdleRecordId = (data as any).id; // Capture the ID
            }
        }
        
        startRepeatingRing();

        setAutoClockOutTimeLeft(AUTO_CLOCK_OUT_DURATION_MS / 1000);
        autoClockOutIntervalRef.current = window.setInterval(() => {
          setAutoClockOutTimeLeft(prev => prev > 0 ? prev - 1 : 0);
        }, 1000);

        autoClockOutTimerRef.current = window.setTimeout(async () => {
          setIsAutoClockingOut(true);

          if (newIdleRecordId) {
            const idleEndTime = new Date();
            let duration = 0;
            if (idleStartTimeRef.current) {
                duration = Math.round((idleEndTime.getTime() - idleStartTimeRef.current.getTime()) / 1000);
            }

            // Await the update to ensure it completes before clocking out
            const { error } = await (supabase as any)
                .from('idle_time')
                .update({
                    idle_end: formatDateForDB(idleEndTime),
                    duration_seconds: duration,
                } as any)
                .eq('id', newIdleRecordId);
            
            if (error) {
                console.error("Failed to update idle record on auto clock-out:", error);
            }
            setCurrentIdleRecordId(null);
          }

          await onForceClockOut('Automatically clocked out due to prolonged inactivity.');
          setShowPopup(false);
          setIsIdle(false);
          stopRepeatingRing();
        }, AUTO_CLOCK_OUT_DURATION_MS);
      }, SNOOZE_WINDOW_MS);
    }, ALARM_INTERVAL_MS);
  };

  useEffect(() => {
    if (isActive) {
      startMainTimer();
    } else {
      resetTimers();
      setShowPopup(false);
      setIsIdle(false);
      stopRepeatingRing(); // Stop the ringing sound
      if (notificationRef.current) {
        notificationRef.current.close();
      }
    }

    return () => {
      resetTimers();
    };
  }, [isActive, user, currentAttendanceId]);
  
  useEffect(() => {
    if (isIdle) {
      idleTimerRef.current = window.setInterval(() => {
        setIdleTime(prev => prev + 1);
      }, 1000);
    } else {
      if (idleTimerRef.current) {
        clearInterval(idleTimerRef.current);
        idleTimerRef.current = null;
      }
      setIdleTime(0);
    }
    
    return () => {
      if (idleTimerRef.current) {
        clearInterval(idleTimerRef.current);
      }
    };
  }, [isIdle]);

  const handleSnooze = async () => {
    if (isIdle && currentIdleRecordId) {
        const idleEndTime = new Date();
        let duration = idleTime; // Fallback
        if (idleStartTimeRef.current) {
            duration = Math.round((idleEndTime.getTime() - idleStartTimeRef.current.getTime()) / 1000);
        }

        const { error } = await (supabase as any)
            .from('idle_time')
            .update({
                idle_end: formatDateForDB(idleEndTime),
                duration_seconds: duration,
            } as any)
            .eq('id', currentIdleRecordId);
        
        if (error) {
            console.error("Failed to update idle record:", error);
        }
        setCurrentIdleRecordId(null);
    }
    if (autoClockOutTimerRef.current) clearTimeout(autoClockOutTimerRef.current);
    if (autoClockOutIntervalRef.current) clearInterval(autoClockOutIntervalRef.current);

    setShowPopup(false);
    setIsIdle(false);
    if (notificationRef.current) {
      notificationRef.current.close();
    }
    stopRepeatingRing(); // Stop the ringing sound
    startMainTimer();
  };

  const formatIdleTime = (seconds: number) => {
    if (seconds < 60) {
      return `${seconds} sec`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes} min ${remainingSeconds} sec`;
  };

  const formatAutoClockOutTime = (seconds: number): string => {
    if (seconds < 0) seconds = 0;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  };

  return (
    <>
      {showPopup && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-40" aria-hidden="true"></div>
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="idle-alarm-title"
          >
            <div className="relative bg-white w-full max-w-md p-8 rounded-2xl shadow-2xl text-center border-4 border-accent">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-icon-bg mb-4">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              
              {!isIdle ? (
                <>
                  <h2 id="idle-alarm-title" className="text-2xl font-bold text-text-primary">
                    Are you still there?
                  </h2>
                  <p className="mt-2 text-text-secondary">
                    Click "I'm Here" to confirm you're still working.
                  </p>
                </>
              ) : (
                <>
                  <h2 id="idle-alarm-title" className="text-2xl font-bold text-red-600">
                    You are now idle
                  </h2>
                   <p className="mt-2 text-text-secondary">
                    Your session is currently marked as idle.
                  </p>
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800">Idle Time</p>
                    <span className="font-mono text-xl text-red-700 tracking-wider">
                      {formatIdleTime(idleTime)}
                    </span>
                  </div>
                  <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">Auto clock-out in</p>
                    <span className="font-mono text-xl text-yellow-700 tracking-wider">
                      {formatAutoClockOutTime(autoClockOutTimeLeft)}
                    </span>
                  </div>
                </>
              )}

              <div className="mt-8">
                <button
                  onClick={handleSnooze}
                  disabled={isAutoClockingOut}
                  className="w-full sm:w-auto inline-flex justify-center rounded-md border border-transparent bg-primary px-8 py-3 text-base font-bold text-white shadow-sm hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-transform transform hover:scale-105 disabled:opacity-50"
                >
                  {isAutoClockingOut ? (
                     <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    "I'm Here"
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};
export default IdleAlarm;