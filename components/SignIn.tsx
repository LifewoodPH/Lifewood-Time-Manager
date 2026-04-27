import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import type { User } from '../types';
import logo from '../public/lifewood.png';
import logo3 from '../public/timeadmin.png';

interface SignInProps {
  onLogin: (user: User) => void;
}

const SignIn: React.FC<SignInProps> = ({ onLogin }) => {
  const [userid, setUserid] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (!userid.trim() || !password.trim()) {
      setError('User ID and password cannot be empty.');
      setIsLoading(false);
      return;
    }

    try {
      const { data, error: dbError } = await supabase
        .from('users')
        .select('*')
        .eq('userid', userid.trim())
        .single();

      if (dbError) {
        // Supabase's .single() throws an error if no user is found (code PGRST116).
        // This is an expected failure for a wrong userid, not a system error.
        // We'll show the generic login error message without logging a console error.
        if (dbError.code !== 'PGRST116') {
          // Log other, unexpected database errors.
          console.error('Sign-in database error:', dbError);
        }
        setError('Invalid User ID or Password.');
        setIsLoading(false);
        return;
      }

      if (!data) {
        // This is a fallback, as .single() should have already thrown an error.
        setError('Invalid User ID or Password.');
        setIsLoading(false);
        return;
      }

      if (data.password === password) {
        if (data.is_frozen) {
          setError('Your account has temporarily been deactivated by admin');
          setIsLoading(false);
          return;
        }
        // Successful login
        // Exclude password from the user object stored in app state/localStorage
        const { password: _, ...loggedInUser } = data;
        onLogin(loggedInUser);
      } else {
        // Incorrect password
        setError('Invalid User ID or Password.');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen text-text-primary relative overflow-hidden">
      {/* Video Background */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover z-0"
      >
        <source src="https://www.pexels.com/download/video/10922866/" type="video/mp4" />
      </video>

      {/* Full-screen overlay to ensure base legibility and provide the unified white glass base */}
      <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-0 pointer-events-none"></div>

      <div className="relative z-10 w-full flex min-h-screen">
        {/* Left side: Sign In Form */}
        <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 lg:p-16">
          <div className="w-full max-w-md mx-auto flex flex-col">

            <div className="mb-10 flex flex-col items-center text-center">
              <div className="flex items-center justify-center gap-3 mb-2">
                <img src={logo3} alt="LifeTime Logo" className="h-[4.5rem] w-[4.5rem] lg:h-[5.5rem] lg:w-[5.5rem] object-cover mix-blend-multiply rounded-full animate-[spin_10s_linear_infinite]" />
                <h1 className="text-5xl lg:text-[4rem] font-bold tracking-tight">
                  <span className="text-primary">Life</span>
                  <span className="text-accent">Time</span>
                </h1>
              </div>
              <p className="text-text-secondary text-lg lg:text-2xl mt-1 font-light">Lifewood Time Manager</p>
            </div>

            <div className="w-full">
              <form onSubmit={handleSignIn} className="space-y-5">
                <div>
                  <label htmlFor="userid" className="block text-sm font-semibold text-gray-700 mb-1">
                    User
                  </label>
                  <input
                    id="userid"
                    name="userid"
                    type="text"
                    autoComplete="username"
                    required
                    placeholder=" "
                    value={userid}
                    onChange={(e) => setUserid(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label htmlFor="password" className="block text-sm font-semibold text-gray-700">
                      Password
                    </label>
                    <a href="#" className="text-xs font-semibold text-primary hover:text-primary-hover">Forgot?</a>
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    placeholder=" "
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition tracking-widest placeholder:tracking-widest"
                  />
                </div>

                {error && <p className="text-sm text-red-600 font-medium">{error}</p>}

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      'Sign In'
                    )}
                  </button>
                </div>
              </form>
            </div>
            {/* Footer with Logo */}
            <footer className="w-full flex flex-col items-center justify-center mt-14 pb-4">
              <div className="flex items-center justify-center mb-2">
                <img src={logo} alt="Logo" className="h-8 w-auto object-contain mix-blend-multiply" />
              </div>
              <p className="text-xs font-bold text-gray-500">
                Powered by <span className="text-primary font-bold">Lifewood PH</span>
              </p>
            </footer>
          </div>
        </div>

        {/* Right side: Graphic Panel */}
        <div className="hidden lg:flex lg:w-1/2 p-6 lg:p-8 items-center justify-center relative z-10">
          <div className="w-full h-full max-h-[92vh] max-w-2xl bg-[#034A36]/85 backdrop-blur-xl border border-white/20 rounded-[2rem] p-12 lg:p-16 flex flex-col justify-center relative overflow-hidden shadow-2xl">
            {/* Decorative text */}
            <div className="relative z-10 text-white max-w-lg mx-auto w-full">
              <h2 className="text-[3.5rem] leading-tight font-serif italic text-white/90">Master</h2>
              <h2 className="text-[4rem] leading-tight font-bold mb-4">Your Time</h2>
              <p className="text-2xl text-[#8EBCAD] max-w-xs">
                Track your day,<br />seamlessly
              </p>

              {/* Cards Graphic */}
              <div className="mt-20 ml-16 relative">

                {/* Vertical Card / Device */}
                <div className="absolute -left-12 top-10 w-[3.25rem] h-40 bg-white rounded-xl shadow-2xl flex flex-col items-center py-4 justify-between z-20">
                  <div className="w-4 h-4 rounded-full bg-primary mx-auto"></div>
                  <div className="grid grid-cols-2 gap-1.5 px-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-300"></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-300"></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-300"></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-300"></div>
                  </div>
                  <div className="w-7 h-7 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center">
                    <div className="w-3.5 h-3.5 rounded-full bg-[#7595AA]"></div>
                  </div>
                </div>

                {/* Main Horizontal Card */}
                <div className="bg-[#EAF3EF] rounded-3xl p-8 shadow-2xl relative z-10 w-full max-w-[28rem] aspect-[1.6/1] text-gray-800 flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-6">
                    <div className="w-10 h-10 rounded-full bg-[#B2C5CD] flex items-center justify-center">
                      <svg className="w-5 h-5 text-[#7595AA]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>

                    {/* Real-time Analog Clock */}
                    <div className="relative w-16 h-16 rounded-full border-[3px] border-white shadow-inner bg-[#EAF3EF] flex items-center justify-center">
                      {/* Clock center dot */}
                      <div className="absolute w-1.5 h-1.5 bg-gray-800 rounded-full z-10"></div>

                      {/* Hands Container */}
                      <div className="absolute inset-x-0 bottom-1/2 flex justify-center items-end h-1/2 pb-[1px] z-0 pointer-events-none">
                        {/* Hour */}
                        <div className="absolute w-[3px] h-[35%] bg-gray-800 rounded-full origin-bottom" style={{ transform: `rotate(${time.getHours() % 12 * 30 + time.getMinutes() * 0.5}deg)`, bottom: '1px' }}></div>
                        {/* Minute */}
                        <div className="absolute w-[2px] h-[50%] bg-gray-500 rounded-full origin-bottom" style={{ transform: `rotate(${time.getMinutes() * 6}deg)`, bottom: '1px' }}></div>
                        {/* Second */}
                        <div className="absolute w-[1px] h-[70%] bg-red-400 origin-bottom" style={{ transform: `rotate(${time.getSeconds() * 6}deg)`, bottom: '1px' }}></div>
                      </div>

                      {/* Tick Marks */}
                      <div className="absolute top-1 w-0.5 h-1 bg-gray-300"></div>
                      <div className="absolute bottom-1 w-0.5 h-1 bg-gray-300"></div>
                      <div className="absolute left-1 w-1 h-0.5 bg-gray-300"></div>
                      <div className="absolute right-1 w-1 h-0.5 bg-gray-300"></div>
                    </div>
                  </div>

                  <div className="mb-2">
                    <div className="flex items-baseline gap-2 mb-1">
                      <h3 className="text-[2.5rem] font-bold text-gray-900 tracking-tight">
                        {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </h3>
                      <span className="text-[#046241] font-bold text-xl">
                        {time.getSeconds().toString().padStart(2, '0')}s
                      </span>
                    </div>
                    <p className="text-gray-500 text-sm">Real-time Synchronization</p>
                  </div>

                  <div className="flex justify-between items-end w-full mt-auto">
                    <div>
                      <p className="text-[0.65rem] font-bold text-gray-900 mb-0.5">Current Status</p>
                      <p className="text-[0.65rem] text-gray-500 font-mono tracking-widest">Tracking Active</p>
                    </div>
                    <div className="text-[0.7rem] font-bold text-gray-900 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                      Online
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignIn;