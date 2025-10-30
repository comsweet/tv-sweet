import React, { useState, useEffect } from 'react';
import AgentsManager from '../components/AgentsManager';
import LeaderboardsManager from '../components/LeaderboardsManager';
import BonusTiersManager from '../components/BonusTiersManager';
import SlideshowSettings from '../components/SlideshowSettings';
import './Admin.css';

function Admin({ onNavigateToDisplay }) {
  const [activeTab, setActiveTab] = useState('leaderboards');

  return (
    <div className="admin-container">
      <header className="admin-header">
        <h1>TV Leaderboard Admin</h1>
        <button onClick={onNavigateToDisplay} className="view-display-button">
          Visa TV Display
        </button>
      </header>

      <nav className="admin-tabs">
        <button
          className={activeTab === 'leaderboards' ? 'active' : ''}
          onClick={() => setActiveTab('leaderboards')}
        >
          Leaderboards
        </button>
        <button
          className={activeTab === 'agents' ? 'active' : ''}
          onClick={() => setActiveTab('agents')}
        >
          Agenter
        </button>
        <button
          className={activeTab === 'bonuses' ? 'active' : ''}
          onClick={() => setActiveTab('bonuses')}
        >
          Bonustrappor
        </button>
        <button
          className={activeTab === 'settings' ? 'active' : ''}
          onClick={() => setActiveTab('settings')}
        >
          Inställningar
        </button>
      </nav>

      <div className="admin-content">
        {activeTab === 'leaderboards' && <LeaderboardsManager />}
        {activeTab === 'agents' && <AgentsManager />}
        {activeTab === 'bonuses' && <BonusTiersManager />}
        {activeTab === 'settings' && <SlideshowSettings />}
      </div>
    </div>
  );
}

export default Admin;
