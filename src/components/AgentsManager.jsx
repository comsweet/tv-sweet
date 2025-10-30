import React, { useState, useEffect } from 'react';

function AgentsManager() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState(null);
  const [uploadingFor, setUploadingFor] = useState(null);

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      const response = await fetch('/api/agents');
      const data = await response.json();
      setAgents(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching agents:', error);
      setMessage({ type: 'error', text: 'Kunde inte hämta agenter' });
      setLoading(false);
    }
  };

  const syncAllAgents = async () => {
    setSyncing(true);
    setMessage(null);

    try {
      const response = await fetch('/api/agents/sync-all', { method: 'POST' });
      const data = await response.json();
      setMessage({ type: 'success', text: `Synkade ${data.count} agenter från Adversus` });
      fetchAgents();
    } catch (error) {
      console.error('Error syncing agents:', error);
      setMessage({ type: 'error', text: 'Kunde inte synka agenter' });
    } finally {
      setSyncing(false);
    }
  };

  const uploadProfileImage = async (userId, file) => {
    if (!file) return;

    setUploadingFor(`profile-${userId}`);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch(`/api/agents/${userId}/profile-image`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      setMessage({ type: 'success', text: 'Profilbild uppladdad!' });
      fetchAgents();
    } catch (error) {
      console.error('Error uploading profile image:', error);
      setMessage({ type: 'error', text: 'Kunde inte ladda upp profilbild' });
    } finally {
      setUploadingFor(null);
    }
  };

  const uploadPersonalSound = async (userId, file) => {
    if (!file) return;

    setUploadingFor(`sound-${userId}`);
    const formData = new FormData();
    formData.append('sound', file);

    try {
      const response = await fetch(`/api/agents/${userId}/personal-sound`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      setMessage({ type: 'success', text: 'Personligt ljud uppladdat!' });
      fetchAgents();
    } catch (error) {
      console.error('Error uploading personal sound:', error);
      setMessage({ type: 'error', text: 'Kunde inte ladda upp ljud' });
    } finally {
      setUploadingFor(null);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <p>Laddar agenter...</p>
      </div>
    );
  }

  return (
    <div className="agents-manager">
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Agenter</h2>
          <button
            className="btn btn-primary"
            onClick={syncAllAgents}
            disabled={syncing}
          >
            {syncing ? 'Synkar...' : 'Synka från Adversus'}
          </button>
        </div>

        {message && (
          <div className={`alert alert-${message.type}`}>
            {message.text}
          </div>
        )}

        {agents.length === 0 ? (
          <div className="empty-state">
            <p>Inga agenter hittades. Synka från Adversus för att hämta agenter.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Profilbild</th>
                <th>Namn</th>
                <th>Email</th>
                <th>Grupp ID</th>
                <th>Uppladdningar</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((agent) => (
                <tr key={agent.userId}>
                  <td>
                    <div className="avatar-preview">
                      {agent.profileImageUrl ? (
                        <img src={agent.profileImageUrl} alt={agent.name} />
                      ) : (
                        <div className="avatar-placeholder">
                          {agent.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    <strong>{agent.name}</strong>
                    <br />
                    <small>ID: {agent.userId}</small>
                  </td>
                  <td>{agent.email || '-'}</td>
                  <td>{agent.groupId || '-'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
                      <div>
                        <label
                          htmlFor={`profile-${agent.userId}`}
                          className="btn btn-secondary btn-small"
                          style={{ display: 'inline-block', cursor: 'pointer' }}
                        >
                          {uploadingFor === `profile-${agent.userId}`
                            ? 'Laddar upp...'
                            : agent.profileImageUrl
                            ? 'Ändra bild'
                            : 'Ladda upp bild'}
                        </label>
                        <input
                          id={`profile-${agent.userId}`}
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={(e) =>
                            uploadProfileImage(agent.userId, e.target.files[0])
                          }
                          disabled={uploadingFor === `profile-${agent.userId}`}
                        />
                      </div>

                      <div>
                        <label
                          htmlFor={`sound-${agent.userId}`}
                          className="btn btn-secondary btn-small"
                          style={{ display: 'inline-block', cursor: 'pointer' }}
                        >
                          {uploadingFor === `sound-${agent.userId}`
                            ? 'Laddar upp...'
                            : agent.personalSoundUrl
                            ? 'Ändra ljud'
                            : 'Ladda upp ljud'}
                        </label>
                        <input
                          id={`sound-${agent.userId}`}
                          type="file"
                          accept="audio/*"
                          style={{ display: 'none' }}
                          onChange={(e) =>
                            uploadPersonalSound(agent.userId, e.target.files[0])
                          }
                          disabled={uploadingFor === `sound-${agent.userId}`}
                        />
                        {agent.personalSoundUrl && (
                          <audio
                            controls
                            src={agent.personalSoundUrl}
                            style={{ width: '200px', height: '30px', marginTop: '0.5rem' }}
                          />
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h3>Information om agenter</h3>
        <p>
          Agenter synkas automatiskt från Adversus API. Använd knappen "Synka från Adversus"
          för att hämta de senaste agenterna och deras gruppinformation.
        </p>
        <p style={{ marginTop: '1rem' }}>
          Ladda upp profilbilder och personliga ljudfiler för varje agent. Profilbilder
          visas på leaderboarden, och personliga ljud spelas upp när agenten når sina mål.
        </p>
      </div>
    </div>
  );
}

export default AgentsManager;
