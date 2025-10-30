import React, { useState, useEffect } from 'react';

function BonusTiersManager() {
  const [bonusTiers, setBonusTiers] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [campaigns, setCampaigns] = useState([]);
  const [showTierForm, setShowTierForm] = useState(false);
  const [showAssignForm, setShowAssignForm] = useState(false);

  const [tierFormData, setTierFormData] = useState({
    campaignName: '',
    dealsRequired: '',
    bonusPerDeal: ''
  });

  const [assignFormData, setAssignFormData] = useState({
    userId: '',
    campaignName: ''
  });

  useEffect(() => {
    fetchBonusTiers();
    fetchAgents();
  }, []);

  useEffect(() => {
    // Extract unique campaigns from bonus tiers
    const uniqueCampaigns = [...new Set(bonusTiers.map((tier) => tier.campaignName))];
    setCampaigns(uniqueCampaigns);

    if (uniqueCampaigns.length > 0 && !selectedCampaign) {
      setSelectedCampaign(uniqueCampaigns[0]);
    }
  }, [bonusTiers]);

  const fetchBonusTiers = async () => {
    try {
      const response = await fetch('/api/bonus-tiers');
      const data = await response.json();
      setBonusTiers(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching bonus tiers:', error);
      setMessage({ type: 'error', text: 'Kunde inte hämta bonustrappor' });
      setLoading(false);
    }
  };

  const fetchAgents = async () => {
    try {
      const response = await fetch('/api/agents');
      const data = await response.json();
      setAgents(data);
    } catch (error) {
      console.error('Error fetching agents:', error);
    }
  };

  const handleTierSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);

    try {
      const response = await fetch('/api/bonus-tiers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignName: tierFormData.campaignName,
          dealsRequired: parseInt(tierFormData.dealsRequired),
          bonusPerDeal: parseFloat(tierFormData.bonusPerDeal)
        })
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Bonustrappa sparad!' });
        fetchBonusTiers();
        setTierFormData({ campaignName: '', dealsRequired: '', bonusPerDeal: '' });
        setShowTierForm(false);
      } else {
        throw new Error('Failed to save bonus tier');
      }
    } catch (error) {
      console.error('Error saving bonus tier:', error);
      setMessage({ type: 'error', text: 'Kunde inte spara bonustrappa' });
    }
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);

    try {
      const response = await fetch(`/api/agents/${assignFormData.userId}/bonuses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignName: assignFormData.campaignName })
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Bonus tilldelad till agent!' });
        setAssignFormData({ userId: '', campaignName: '' });
        setShowAssignForm(false);
      } else {
        throw new Error('Failed to assign bonus');
      }
    } catch (error) {
      console.error('Error assigning bonus:', error);
      setMessage({ type: 'error', text: 'Kunde inte tilldela bonus' });
    }
  };

  const handleDeleteTier = async (id) => {
    if (!confirm('Är du säker på att du vill ta bort denna bonustrappa?')) {
      return;
    }

    try {
      await fetch(`/api/bonus-tiers/${id}`, { method: 'DELETE' });
      setMessage({ type: 'success', text: 'Bonustrappa borttagen!' });
      fetchBonusTiers();
    } catch (error) {
      console.error('Error deleting bonus tier:', error);
      setMessage({ type: 'error', text: 'Kunde inte ta bort bonustrappa' });
    }
  };

  const handleDeleteCampaign = async (campaignName) => {
    if (!confirm(`Är du säker på att du vill ta bort alla bonustrappor för "${campaignName}"?`)) {
      return;
    }

    try {
      await fetch(`/api/bonus-tiers/campaign/${encodeURIComponent(campaignName)}`, {
        method: 'DELETE'
      });
      setMessage({ type: 'success', text: 'Kampanj och bonustrappor borttagna!' });
      fetchBonusTiers();
      setSelectedCampaign('');
    } catch (error) {
      console.error('Error deleting campaign:', error);
      setMessage({ type: 'error', text: 'Kunde inte ta bort kampanj' });
    }
  };

  const getAgentBonuses = async (userId) => {
    try {
      const response = await fetch(`/api/agents/${userId}/bonuses`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching agent bonuses:', error);
      return [];
    }
  };

  const handleUnassignBonus = async (userId, campaignName) => {
    if (!confirm(`Ta bort bonustilldelning för "${campaignName}"?`)) {
      return;
    }

    try {
      await fetch(`/api/agents/${userId}/bonuses/${encodeURIComponent(campaignName)}`, {
        method: 'DELETE'
      });
      setMessage({ type: 'success', text: 'Bonustilldelning borttagen!' });
    } catch (error) {
      console.error('Error unassigning bonus:', error);
      setMessage({ type: 'error', text: 'Kunde inte ta bort bonustilldelning' });
    }
  };

  const filteredTiers = selectedCampaign
    ? bonusTiers.filter((tier) => tier.campaignName === selectedCampaign)
    : bonusTiers;

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <p>Laddar bonustrappor...</p>
      </div>
    );
  }

  return (
    <div className="bonus-tiers-manager">
      {message && (
        <div className={`alert alert-${message.type}`}>
          {message.text}
        </div>
      )}

      {/* Bonus Tiers Section */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Bonustrappor</h2>
          <button
            className="btn btn-primary"
            onClick={() => setShowTierForm(!showTierForm)}
          >
            {showTierForm ? 'Avbryt' : 'Skapa bonustrappa'}
          </button>
        </div>

        {showTierForm && (
          <form onSubmit={handleTierSubmit} style={{ marginTop: '2rem' }}>
            <div className="form-group">
              <label>Kampanjnamn</label>
              <input
                type="text"
                value={tierFormData.campaignName}
                onChange={(e) =>
                  setTierFormData({ ...tierFormData, campaignName: e.target.value })
                }
                required
                placeholder="T.ex. Dentle"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Antal affärer krävs</label>
                <input
                  type="number"
                  value={tierFormData.dealsRequired}
                  onChange={(e) =>
                    setTierFormData({ ...tierFormData, dealsRequired: e.target.value })
                  }
                  required
                  min="1"
                  placeholder="T.ex. 3"
                />
              </div>

              <div className="form-group">
                <label>Bonus per affär (THB)</label>
                <input
                  type="number"
                  step="0.01"
                  value={tierFormData.bonusPerDeal}
                  onChange={(e) =>
                    setTierFormData({ ...tierFormData, bonusPerDeal: e.target.value })
                  }
                  required
                  min="0"
                  placeholder="T.ex. 600"
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary">
              Spara bonustrappa
            </button>
          </form>
        )}

        {campaigns.length > 0 && (
          <>
            <div style={{ marginTop: '2rem', marginBottom: '1rem' }}>
              <label style={{ marginRight: '1rem', fontWeight: 600 }}>Filtrera kampanj:</label>
              <select
                value={selectedCampaign}
                onChange={(e) => setSelectedCampaign(e.target.value)}
                style={{ padding: '0.5rem', borderRadius: '8px', border: '2px solid #e0e0e0' }}
              >
                {campaigns.map((campaign) => (
                  <option key={campaign} value={campaign}>
                    {campaign}
                  </option>
                ))}
              </select>
              {selectedCampaign && (
                <button
                  className="btn btn-danger btn-small"
                  style={{ marginLeft: '1rem' }}
                  onClick={() => handleDeleteCampaign(selectedCampaign)}
                >
                  Ta bort kampanj
                </button>
              )}
            </div>

            <table className="data-table">
              <thead>
                <tr>
                  <th>Kampanj</th>
                  <th>Antal affärer</th>
                  <th>Bonus per affär</th>
                  <th>Åtgärder</th>
                </tr>
              </thead>
              <tbody>
                {filteredTiers.map((tier) => (
                  <tr key={tier.id}>
                    <td>
                      <strong>{tier.campaignName}</strong>
                    </td>
                    <td>{tier.dealsRequired}</td>
                    <td>{tier.bonusPerDeal.toLocaleString('sv-SE')} THB</td>
                    <td>
                      <button
                        className="btn btn-danger btn-small"
                        onClick={() => handleDeleteTier(tier.id)}
                      >
                        Ta bort
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {bonusTiers.length === 0 && (
          <div className="empty-state">
            <p>Inga bonustrappor skapade än. Skapa din första bonustrappa!</p>
          </div>
        )}
      </div>

      {/* Agent Bonus Assignment Section */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Tilldela bonusar till agenter</h2>
          <button
            className="btn btn-primary"
            onClick={() => setShowAssignForm(!showAssignForm)}
          >
            {showAssignForm ? 'Avbryt' : 'Tilldela bonus'}
          </button>
        </div>

        {showAssignForm && (
          <form onSubmit={handleAssignSubmit} style={{ marginTop: '2rem' }}>
            <div className="form-row">
              <div className="form-group">
                <label>Välj agent</label>
                <select
                  value={assignFormData.userId}
                  onChange={(e) =>
                    setAssignFormData({ ...assignFormData, userId: e.target.value })
                  }
                  required
                >
                  <option value="">Välj agent...</option>
                  {agents.map((agent) => (
                    <option key={agent.userId} value={agent.userId}>
                      {agent.name} (ID: {agent.userId})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Välj kampanj</label>
                <select
                  value={assignFormData.campaignName}
                  onChange={(e) =>
                    setAssignFormData({ ...assignFormData, campaignName: e.target.value })
                  }
                  required
                >
                  <option value="">Välj kampanj...</option>
                  {campaigns.map((campaign) => (
                    <option key={campaign} value={campaign}>
                      {campaign}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button type="submit" className="btn btn-primary">
              Tilldela
            </button>
          </form>
        )}
      </div>

      {/* Information */}
      <div className="card">
        <h3>Information om bonustrappor</h3>
        <p>
          Bonustrappor definierar hur mycket bonus en agent får baserat på antal affärer
          per kampanj.
        </p>
        <p style={{ marginTop: '1rem' }}>
          <strong>Exempel:</strong> För kampanjen "Dentle":
        </p>
        <ul style={{ marginLeft: '2rem', marginTop: '0.5rem' }}>
          <li>3 affärer = 600 THB per affär (totalt 1800 THB)</li>
          <li>4 affärer = 800 THB per affär (totalt 3200 THB)</li>
          <li>5 affärer = 1000 THB per affär (totalt 5000 THB)</li>
        </ul>
        <p style={{ marginTop: '1rem' }}>
          Systemet väljer automatiskt den högsta bonustrappan som agenten kvalificerar sig
          för baserat på antal affärer.
        </p>
      </div>
    </div>
  );
}

export default BonusTiersManager;
