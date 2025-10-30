import React, { useState, useEffect, useRef } from 'react';
import './LeaderboardDisplay.css';

function LeaderboardDisplay({ onNavigateToAdmin }) {
  const [leaderboards, setLeaderboards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentData, setCurrentData] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastCommissions, setLastCommissions] = useState({});
  const audioRef = useRef(null);

  // Fetch active leaderboards and settings
  useEffect(() => {
    fetchLeaderboards();
    fetchSettings();

    // Refresh data every 30 seconds
    const interval = setInterval(() => {
      fetchLeaderboards();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Fetch current leaderboard data
  useEffect(() => {
    if (leaderboards.length > 0) {
      fetchLeaderboardData(leaderboards[currentIndex].id);
    }
  }, [currentIndex, leaderboards]);

  // Slideshow timer
  useEffect(() => {
    if (!settings || leaderboards.length <= 1) return;

    const duration = (settings.displayDuration || 10) * 1000;
    const timer = setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % leaderboards.length);
    }, duration);

    return () => clearTimeout(timer);
  }, [currentIndex, leaderboards, settings]);

  // Check for commission milestones and play sounds
  useEffect(() => {
    if (!currentData || !settings || !settings.enableSound) return;

    currentData.stats.forEach((agent) => {
      const lastCommission = lastCommissions[agent.userId] || 0;
      const currentCommission = agent.totalEarnings;

      // Check if agent crossed milestone threshold
      if (
        currentCommission >= settings.milestoneThreshold &&
        lastCommission < settings.milestoneThreshold
      ) {
        playSound(agent);
      }
    });

    // Update last commissions
    const newLastCommissions = {};
    currentData.stats.forEach((agent) => {
      newLastCommissions[agent.userId] = agent.totalEarnings;
    });
    setLastCommissions(newLastCommissions);
  }, [currentData]);

  const fetchLeaderboards = async () => {
    try {
      const response = await fetch('/api/leaderboards?activeOnly=true');
      const data = await response.json();
      setLeaderboards(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching leaderboards:', error);
      setLoading(false);
    }
  };

  const fetchLeaderboardData = async (id) => {
    try {
      const response = await fetch(`/api/leaderboards/${id}/stats`);
      const data = await response.json();
      setCurrentData(data);
    } catch (error) {
      console.error('Error fetching leaderboard data:', error);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/slideshow-settings');
      const data = await response.json();
      setSettings(data);
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const playSound = (agent) => {
    let soundUrl = null;

    // Logic: Before 3600 THB -> standard sound
    //        After 3600 THB -> personal sound or milestone sound
    if (agent.totalEarnings < settings.milestoneThreshold) {
      soundUrl = settings.standardSoundUrl;
    } else {
      soundUrl = agent.personalSoundUrl || settings.milestoneSoundUrl;
    }

    if (soundUrl && audioRef.current) {
      audioRef.current.src = soundUrl;
      audioRef.current.play().catch((err) => {
        console.error('Error playing sound:', err);
      });

      // Show notification
      showNotification(agent);
    }
  };

  const showNotification = (agent) => {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'commission-notification';
    notification.innerHTML = `
      <img src="${agent.profileImageUrl || '/default-avatar.png'}" alt="${agent.name}" />
      <div class="notification-content">
        <h3>${agent.name}</h3>
        <p class="commission-amount">${agent.totalEarnings.toLocaleString('sv-SE')} THB</p>
      </div>
    `;

    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
      notification.classList.add('show');
    }, 100);

    // Remove after 5 seconds
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 500);
    }, 5000);
  };

  const getColorClass = (color) => {
    return `color-${color}`;
  };

  const getTimePeriodLabel = (timePeriod) => {
    switch (timePeriod) {
      case 'day':
        return 'Idag';
      case 'week':
        return 'Denna vecka';
      case 'month':
        return 'Denna månad';
      case 'custom':
        return 'Anpassad period';
      default:
        return timePeriod;
    }
  };

  // Keyboard shortcut to access admin (Ctrl+Shift+A)
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        onNavigateToAdmin();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [onNavigateToAdmin]);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Laddar leaderboard...</p>
      </div>
    );
  }

  if (leaderboards.length === 0) {
    return (
      <div className="empty-state">
        <h2>Inga aktiva leaderboards</h2>
        <p>Skapa leaderboards i admin-panelen</p>
        <button onClick={onNavigateToAdmin} className="admin-button">
          Gå till Admin
        </button>
      </div>
    );
  }

  if (!currentData) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Laddar data...</p>
      </div>
    );
  }

  return (
    <div className="leaderboard-display">
      <audio ref={audioRef} />

      <header className="leaderboard-header">
        <h1>{currentData.leaderboard.name}</h1>
        <div className="period-badge">
          {getTimePeriodLabel(currentData.leaderboard.timePeriod)}
        </div>
      </header>

      <div className="leaderboard-table-container">
        <table className="leaderboard-table">
          <thead>
            <tr>
              <th className="rank-col">#</th>
              <th className="avatar-col"></th>
              <th className="name-col">Namn</th>
              <th className="deals-col">Affärer</th>
              <th className="sms-col">SMS Success %</th>
              <th className="commission-col">Commission</th>
              <th className="bonus-col">Bonus</th>
              <th className="total-col">Totalt</th>
            </tr>
          </thead>
          <tbody>
            {currentData.stats.map((agent, index) => (
              <tr key={agent.userId} className={getColorClass(agent.color)}>
                <td className="rank-col">{index + 1}</td>
                <td className="avatar-col">
                  <div className="avatar">
                    {agent.profileImageUrl ? (
                      <img src={agent.profileImageUrl} alt={agent.name} />
                    ) : (
                      <div className="avatar-placeholder">
                        {agent.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                </td>
                <td className="name-col">{agent.name}</td>
                <td className="deals-col">{agent.deals}</td>
                <td className="sms-col">{agent.smsSuccessRate}%</td>
                <td className="commission-col">
                  {agent.commission.toLocaleString('sv-SE')} THB
                </td>
                <td className="bonus-col">
                  {agent.bonus.toLocaleString('sv-SE')} THB
                </td>
                <td className="total-col">
                  <strong>{agent.totalEarnings.toLocaleString('sv-SE')} THB</strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {leaderboards.length > 1 && (
        <div className="slideshow-indicator">
          {leaderboards.map((_, index) => (
            <div
              key={index}
              className={`indicator-dot ${index === currentIndex ? 'active' : ''}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default LeaderboardDisplay;
