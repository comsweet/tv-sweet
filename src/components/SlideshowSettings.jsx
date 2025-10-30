import React, { useState, useEffect } from 'react';

function SlideshowSettings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [uploading, setUploading] = useState(null);

  const [formData, setFormData] = useState({
    displayDuration: 10,
    enableSound: true,
    milestoneThreshold: 3600
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/slideshow-settings');
      const data = await response.json();
      setSettings(data);
      setFormData({
        displayDuration: data.displayDuration,
        enableSound: data.enableSound === 1,
        milestoneThreshold: data.milestoneThreshold
      });
      setLoading(false);
    } catch (error) {
      console.error('Error fetching settings:', error);
      setMessage({ type: 'error', text: 'Kunde inte hämta inställningar' });
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);

    try {
      const response = await fetch('/api/slideshow-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayDuration: parseInt(formData.displayDuration),
          enableSound: formData.enableSound,
          milestoneThreshold: parseFloat(formData.milestoneThreshold),
          standardSoundUrl: settings.standardSoundUrl,
          milestoneSoundUrl: settings.milestoneSoundUrl
        })
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Inställningar sparade!' });
        fetchSettings();
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage({ type: 'error', text: 'Kunde inte spara inställningar' });
    }
  };

  const uploadStandardSound = async (file) => {
    if (!file) return;

    setUploading('standard');
    const formDataUpload = new FormData();
    formDataUpload.append('sound', file);

    try {
      const response = await fetch('/api/slideshow-settings/standard-sound', {
        method: 'POST',
        body: formDataUpload
      });

      const data = await response.json();
      setMessage({ type: 'success', text: 'Standard-ljud uppladdat!' });
      fetchSettings();
    } catch (error) {
      console.error('Error uploading standard sound:', error);
      setMessage({ type: 'error', text: 'Kunde inte ladda upp ljud' });
    } finally {
      setUploading(null);
    }
  };

  const uploadMilestoneSound = async (file) => {
    if (!file) return;

    setUploading('milestone');
    const formDataUpload = new FormData();
    formDataUpload.append('sound', file);

    try {
      const response = await fetch('/api/slideshow-settings/milestone-sound', {
        method: 'POST',
        body: formDataUpload
      });

      const data = await response.json();
      setMessage({ type: 'success', text: 'Milestone-ljud uppladdat!' });
      fetchSettings();
    } catch (error) {
      console.error('Error uploading milestone sound:', error);
      setMessage({ type: 'error', text: 'Kunde inte ladda upp ljud' });
    } finally {
      setUploading(null);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <p>Laddar inställningar...</p>
      </div>
    );
  }

  return (
    <div className="slideshow-settings">
      {message && (
        <div className={`alert alert-${message.type}`}>
          {message.text}
        </div>
      )}

      {/* Display Settings */}
      <div className="card">
        <h2>Slideshow-inställningar</h2>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Visningstid per leaderboard (sekunder)</label>
            <input
              type="number"
              value={formData.displayDuration}
              onChange={(e) =>
                setFormData({ ...formData, displayDuration: e.target.value })
              }
              min="5"
              max="60"
              required
            />
            <small style={{ color: '#666', marginTop: '0.5rem', display: 'block' }}>
              Hur länge varje leaderboard visas innan det byter till nästa
            </small>
          </div>

          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                checked={formData.enableSound}
                onChange={(e) =>
                  setFormData({ ...formData, enableSound: e.target.checked })
                }
                style={{ width: 'auto' }}
              />
              Aktivera ljudnotifikationer
            </label>
            <small style={{ color: '#666', marginTop: '0.5rem', display: 'block' }}>
              Spela ljud när agenter når sina mål
            </small>
          </div>

          <div className="form-group">
            <label>Milestone-tröskel (THB)</label>
            <input
              type="number"
              value={formData.milestoneThreshold}
              onChange={(e) =>
                setFormData({ ...formData, milestoneThreshold: e.target.value })
              }
              min="0"
              step="100"
              required
            />
            <small style={{ color: '#666', marginTop: '0.5rem', display: 'block' }}>
              Vid denna tröskel (standard: 3600 THB) börjar systemet spela personliga ljud
              eller milestone-ljud istället för standard-ljud
            </small>
          </div>

          <button type="submit" className="btn btn-primary">
            Spara inställningar
          </button>
        </form>
      </div>

      {/* Sound Files */}
      <div className="card">
        <h2>Ljudfiler</h2>

        <div style={{ marginBottom: '2rem' }}>
          <h3>Standard pling-ljud</h3>
          <p style={{ color: '#666', marginBottom: '1rem' }}>
            Detta ljud spelas upp för alla agenter innan de når milestone-tröskeln (3600 THB)
          </p>

          {settings?.standardSoundUrl && (
            <div style={{ marginBottom: '1rem' }}>
              <audio controls src={settings.standardSoundUrl} style={{ width: '100%' }} />
            </div>
          )}

          <label
            htmlFor="standard-sound"
            className="btn btn-secondary"
            style={{ display: 'inline-block', cursor: 'pointer' }}
          >
            {uploading === 'standard'
              ? 'Laddar upp...'
              : settings?.standardSoundUrl
              ? 'Ändra standard-ljud'
              : 'Ladda upp standard-ljud'}
          </label>
          <input
            id="standard-sound"
            type="file"
            accept="audio/*"
            style={{ display: 'none' }}
            onChange={(e) => uploadStandardSound(e.target.files[0])}
            disabled={uploading === 'standard'}
          />
        </div>

        <div>
          <h3>Milestone-ljud (dagsbudget)</h3>
          <p style={{ color: '#666', marginBottom: '1rem' }}>
            Detta ljud spelas upp när en agent når milestone-tröskeln och inte har ett
            personligt ljud uppladdat
          </p>

          {settings?.milestoneSoundUrl && (
            <div style={{ marginBottom: '1rem' }}>
              <audio controls src={settings.milestoneSoundUrl} style={{ width: '100%' }} />
            </div>
          )}

          <label
            htmlFor="milestone-sound"
            className="btn btn-secondary"
            style={{ display: 'inline-block', cursor: 'pointer' }}
          >
            {uploading === 'milestone'
              ? 'Laddar upp...'
              : settings?.milestoneSoundUrl
              ? 'Ändra milestone-ljud'
              : 'Ladda upp milestone-ljud'}
          </label>
          <input
            id="milestone-sound"
            type="file"
            accept="audio/*"
            style={{ display: 'none' }}
            onChange={(e) => uploadMilestoneSound(e.target.files[0])}
            disabled={uploading === 'milestone'}
          />
        </div>
      </div>

      {/* Sound Logic Information */}
      <div className="card">
        <h3>Ljudlogik</h3>
        <p>
          Systemet spelar upp olika ljud baserat på agentens prestationer:
        </p>
        <ul style={{ marginLeft: '2rem', marginTop: '1rem' }}>
          <li>
            <strong>Före {formData.milestoneThreshold} THB:</strong> Standard pling-ljud spelas
            alltid, oavsett agent
          </li>
          <li>
            <strong>Efter {formData.milestoneThreshold} THB:</strong>
            <ul style={{ marginLeft: '2rem', marginTop: '0.5rem' }}>
              <li>Om agenten har ett personligt ljud → spela det personliga ljudet</li>
              <li>Om agenten inte har ett personligt ljud → spela milestone-ljudet (dagsbudget)</li>
            </ul>
          </li>
        </ul>
        <p style={{ marginTop: '1rem' }}>
          När en agent når sina mål visas en notifikation med agentens namn, profilbild och
          total commission.
        </p>
      </div>
    </div>
  );
}

export default SlideshowSettings;
