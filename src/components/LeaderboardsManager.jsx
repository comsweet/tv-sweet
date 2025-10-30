import React, { useState, useEffect } from 'react';

function LeaderboardsManager() {
  const [leaderboards, setLeaderboards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    timePeriod: 'day',
    customStartDate: '',
    customEndDate: '',
    groupId: '',
    displayOrder: 0,
    isActive: true
  });

  useEffect(() => {
    fetchLeaderboards();
  }, []);

  const fetchLeaderboards = async () => {
    try {
      const response = await fetch('/api/leaderboards');
      const data = await response.json();
      setLeaderboards(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching leaderboards:', error);
      setMessage({ type: 'error', text: 'Kunde inte hämta leaderboards' });
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);

    try {
      const url = editingId
        ? `/api/leaderboards/${editingId}`
        : '/api/leaderboards';

      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          groupId: formData.groupId ? parseInt(formData.groupId) : null,
          displayOrder: parseInt(formData.displayOrder),
          isActive: formData.isActive ? 1 : 0
        })
      });

      if (response.ok) {
        setMessage({
          type: 'success',
          text: editingId ? 'Leaderboard uppdaterad!' : 'Leaderboard skapad!'
        });
        fetchLeaderboards();
        resetForm();
      } else {
        throw new Error('Failed to save leaderboard');
      }
    } catch (error) {
      console.error('Error saving leaderboard:', error);
      setMessage({ type: 'error', text: 'Kunde inte spara leaderboard' });
    }
  };

  const handleEdit = (leaderboard) => {
    setEditingId(leaderboard.id);
    setFormData({
      name: leaderboard.name,
      timePeriod: leaderboard.timePeriod,
      customStartDate: leaderboard.customStartDate || '',
      customEndDate: leaderboard.customEndDate || '',
      groupId: leaderboard.groupId || '',
      displayOrder: leaderboard.displayOrder,
      isActive: leaderboard.isActive === 1
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Är du säker på att du vill ta bort denna leaderboard?')) {
      return;
    }

    try {
      await fetch(`/api/leaderboards/${id}`, { method: 'DELETE' });
      setMessage({ type: 'success', text: 'Leaderboard borttagen!' });
      fetchLeaderboards();
    } catch (error) {
      console.error('Error deleting leaderboard:', error);
      setMessage({ type: 'error', text: 'Kunde inte ta bort leaderboard' });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      timePeriod: 'day',
      customStartDate: '',
      customEndDate: '',
      groupId: '',
      displayOrder: 0,
      isActive: true
    });
    setEditingId(null);
    setShowForm(false);
  };

  const getTimePeriodLabel = (period) => {
    const labels = {
      day: 'Idag',
      week: 'Denna vecka',
      month: 'Denna månad',
      custom: 'Anpassad period'
    };
    return labels[period] || period;
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <p>Laddar leaderboards...</p>
      </div>
    );
  }

  return (
    <div className="leaderboards-manager">
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Leaderboards</h2>
          <button
            className="btn btn-primary"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? 'Avbryt' : 'Skapa ny leaderboard'}
          </button>
        </div>

        {message && (
          <div className={`alert alert-${message.type}`}>
            {message.text}
          </div>
        )}

        {showForm && (
          <form onSubmit={handleSubmit} style={{ marginTop: '2rem' }}>
            <div className="form-group">
              <label>Namn</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="T.ex. Dagens försäljare"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Tidsperiod</label>
                <select
                  value={formData.timePeriod}
                  onChange={(e) => setFormData({ ...formData, timePeriod: e.target.value })}
                  required
                >
                  <option value="day">Idag</option>
                  <option value="week">Denna vecka</option>
                  <option value="month">Denna månad</option>
                  <option value="custom">Anpassad period</option>
                </select>
              </div>

              <div className="form-group">
                <label>Grupp ID (valfritt)</label>
                <input
                  type="number"
                  value={formData.groupId}
                  onChange={(e) => setFormData({ ...formData, groupId: e.target.value })}
                  placeholder="Filtrera på grupp"
                />
              </div>
            </div>

            {formData.timePeriod === 'custom' && (
              <div className="form-row">
                <div className="form-group">
                  <label>Startdatum</label>
                  <input
                    type="date"
                    value={formData.customStartDate}
                    onChange={(e) =>
                      setFormData({ ...formData, customStartDate: e.target.value })
                    }
                    required={formData.timePeriod === 'custom'}
                  />
                </div>

                <div className="form-group">
                  <label>Slutdatum</label>
                  <input
                    type="date"
                    value={formData.customEndDate}
                    onChange={(e) =>
                      setFormData({ ...formData, customEndDate: e.target.value })
                    }
                    required={formData.timePeriod === 'custom'}
                  />
                </div>
              </div>
            )}

            <div className="form-row">
              <div className="form-group">
                <label>Visningsordning</label>
                <input
                  type="number"
                  value={formData.displayOrder}
                  onChange={(e) =>
                    setFormData({ ...formData, displayOrder: e.target.value })
                  }
                  min="0"
                />
              </div>

              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) =>
                      setFormData({ ...formData, isActive: e.target.checked })
                    }
                    style={{ width: 'auto' }}
                  />
                  Aktiv
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button type="submit" className="btn btn-primary">
                {editingId ? 'Uppdatera' : 'Skapa'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={resetForm}>
                Avbryt
              </button>
            </div>
          </form>
        )}

        {leaderboards.length === 0 ? (
          <div className="empty-state">
            <p>Inga leaderboards skapade än. Skapa din första leaderboard!</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Namn</th>
                <th>Tidsperiod</th>
                <th>Grupp</th>
                <th>Ordning</th>
                <th>Status</th>
                <th>Åtgärder</th>
              </tr>
            </thead>
            <tbody>
              {leaderboards.map((lb) => (
                <tr key={lb.id}>
                  <td>
                    <strong>{lb.name}</strong>
                  </td>
                  <td>
                    {getTimePeriodLabel(lb.timePeriod)}
                    {lb.timePeriod === 'custom' && (
                      <>
                        <br />
                        <small>
                          {lb.customStartDate} → {lb.customEndDate}
                        </small>
                      </>
                    )}
                  </td>
                  <td>{lb.groupId || 'Alla'}</td>
                  <td>{lb.displayOrder}</td>
                  <td>
                    {lb.isActive ? (
                      <span className="badge badge-active">Aktiv</span>
                    ) : (
                      <span className="badge badge-inactive">Inaktiv</span>
                    )}
                  </td>
                  <td>
                    <div className="table-actions">
                      <button
                        className="btn btn-secondary btn-small"
                        onClick={() => handleEdit(lb)}
                      >
                        Redigera
                      </button>
                      <button
                        className="btn btn-danger btn-small"
                        onClick={() => handleDelete(lb.id)}
                      >
                        Ta bort
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h3>Information om leaderboards</h3>
        <p>
          Skapa leaderboards för olika tidsperioder. Endast aktiva leaderboards visas i
          slideshow-rotationen på TV-displayen.
        </p>
        <p style={{ marginTop: '1rem' }}>
          <strong>Visningsordning:</strong> Bestämmer i vilken ordning leaderboards visas
          i slideshowen (lägre nummer visas först).
        </p>
        <p style={{ marginTop: '1rem' }}>
          <strong>Grupp ID:</strong> Om du anger ett grupp-ID visas endast agenter från
          den gruppen. Lämna tomt för att visa alla agenter.
        </p>
      </div>
    </div>
  );
}

export default LeaderboardsManager;
