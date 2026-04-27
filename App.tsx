
import React, { useState, useEffect } from 'react';
import DisableDevtool from 'disable-devtool';
import type { User } from './types';
import { supabase } from './services/supabaseClient';
import SignIn from './components/SignIn';
import Dashboard from './components/Dashboard';
import FAQButton from './components/FAQButton';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Disable Developer Tools more aggressively using disable-devtool package
    DisableDevtool();

    const checkUser = async () => {
      setLoading(true);
      try {
        const storedUser = localStorage.getItem('lifetime-user');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          
          // Verify user is not frozen
          const { data, error } = await supabase
            .from('users')
            .select('is_frozen')
            .eq('userid', parsedUser.userid)
            .single();

          if (!error && data && data.is_frozen) {
            localStorage.removeItem('lifetime-user');
            setUser(null);
          } else {
            setUser(parsedUser);
          }
        }
      } catch (error) {
        console.error("Failed to parse user from localStorage", error);
        localStorage.removeItem('lifetime-user');
      } finally {
        setLoading(false);
      }
    };

    checkUser();
  }, []);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    localStorage.setItem('lifetime-user', JSON.stringify(loggedInUser));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('lifetime-user');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-16 h-16 border-4 border-accent border-dashed rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      {user ? (
        <Dashboard user={user} onLogout={handleLogout} />
      ) : (
        <SignIn onLogin={handleLogin} />
      )}
      <FAQButton />
    </div>
  );
};

export default App;
