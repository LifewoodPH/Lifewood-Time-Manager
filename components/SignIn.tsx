import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import type { User } from '../types';
import logo from '../Public/logof.jpeg';

interface SignInProps {
  onLogin: (user: User) => void;
}

const SignIn: React.FC<SignInProps> = ({ onLogin }) => {
  const [userid, setUserid] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
    <div className="flex flex-col min-h-screen bg-background">
      <div className="flex-grow flex flex-col items-center justify-center p-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-text-primary">LifeTime</h1>
          <p className="text-text-secondary">Lifewood Time Manager</p>
        </div>
        <div className="w-full max-w-sm p-8 space-y-6 bg-white rounded-xl shadow-lg border border-border-color">
          <form onSubmit={handleSignIn} className="space-y-6">
            <div>
              <label htmlFor="userid" className="block text-sm font-medium text-text-secondary mb-1">
                User ID
              </label>
              <input
                id="userid"
                name="userid"
                type="text"
                autoComplete="username"
                required
                value={userid}
                onChange={(e) => setUserid(e.target.value)}
                className="w-full px-4 py-3 bg-input-bg border border-border-color rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-text-secondary mb-1">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-input-bg border border-border-color rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
              />
            </div>

            {error && <p className="text-sm text-red-600 text-center">{error}</p>}

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-bold text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
      </div>
      <footer className="w-full p-4 flex flex-col justify-center items-center bg-transparent">
        <div className="bg-white border border-border-color rounded-lg px-8 py-4 shadow-sm flex items-center justify-center mb-4">
          <img src={logo} alt="Logo" className="h-10 w-auto object-contain" />
        </div>
        <p className="text-xs text-text-secondary">Powered by Lifewood PH</p>
      </footer>
    </div>
  );
};

export default SignIn;