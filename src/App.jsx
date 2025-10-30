import React, { useState, useEffect } from 'react';
import LeaderboardDisplay from './pages/LeaderboardDisplay';
import Admin from './pages/Admin';
import './App.css';

function App() {
  const [currentView, setCurrentView] = useState('display'); // 'display' or 'admin'

  // Check URL path to determine which view to show
  useEffect(() => {
    const path = window.location.pathname;
    if (path.includes('/admin')) {
      setCurrentView('admin');
    } else {
      setCurrentView('display');
    }
  }, []);

  // Handle navigation
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      setCurrentView(path.includes('/admin') ? 'admin' : 'display');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (view) => {
    const path = view === 'admin' ? '/admin' : '/';
    window.history.pushState({}, '', path);
    setCurrentView(view);
  };

  return (
    <div className="app">
      {currentView === 'display' ? (
        <LeaderboardDisplay onNavigateToAdmin={() => navigateTo('admin')} />
      ) : (
        <Admin onNavigateToDisplay={() => navigateTo('display')} />
      )}
    </div>
  );
}

export default App;
