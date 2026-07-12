import React, { useState, useEffect } from 'react';

function App() {
  const [query, setQuery] = useState('SELECT ROWID, CaseID, DistrictName, UnitName, OffenseDate FROM CaseMaster LIMIT 0,10');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Dashboard metrics state
  const [stats, setStats] = useState({
    firs: 0,
    units: 0,
    accused: 0,
    victims: 0
  });

  // Reusable query runner
  const runZcql = async (zcqlQuery) => {
    const response = await fetch('/server/datathon_kps_h_2_s_function/analytics/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: zcqlQuery })
    });
    const resData = await response.json();
    if (resData.status === 'success') return resData.data;
    throw new Error(resData.message || 'Query failed');
  };

  // Fetch aggregate data store metrics on load
  const fetchDashboardStats = async () => {
    try {
      const firData = await runZcql('SELECT COUNT(ROWID) FROM CaseMaster');
      const unitData = await runZcql('SELECT COUNT(ROWID) FROM Unit');
      const accusedData = await runZcql('SELECT COUNT(ROWID) FROM AccusedDetails');
      const victimData = await runZcql('SELECT COUNT(ROWID) FROM VictimDetails');

      setStats({
        firs: firData[0]?.['CaseMaster']?.['ROWID'] || 0,
        units: unitData[0]?.['Unit']?.['ROWID'] || 0,
        accused: accusedData[0]?.['AccusedDetails']?.['ROWID'] || 0,
        victims: victimData[0]?.['VictimDetails']?.['ROWID'] || 0
      });
    } catch (err) {
      console.log('Stats initialization skipped or waiting for data paths.', err.message);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  // Executes the custom workbench workspace query
  const executeQuery = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await runZcql(query);
      setResults(data);
    } catch (err) {
      setError(err.message || 'Backend service unreachable.');
    }
    setLoading(false);
  };

  return (
    <div style={{ fontFamily: 'Segoe UI, sans-serif', backgroundColor: '#f4f6f9', minHeight: '100vh', margin: 0, padding: '20px' }}>
      {/* Header Bar */}
      <header style={{ backgroundColor: '#1e293b', color: 'white', padding: '15px 20px', borderRadius: '8px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '22px' }}>📊 Crime Analytics & Intel Platform</h1>
        <span style={{ fontSize: '14px', opacity: 0.8 }}>Karnataka State Police Datathon 2026</span>
      </header>

      {/* Dynamic Insights Panel */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginBottom: '25px' }}>
        {[
          { label: 'Total FIR Registered', value: stats.firs, color: '#3b82f6' },
          { label: 'Active Operational Units', value: stats.units, color: '#10b981' },
          { label: 'Total Suspects / Accused', value: stats.accused, color: '#f59e0b' },
          { label: 'Victims Records Tracked', value: stats.victims, color: '#ef4444' }
        ].map((card, i) => (
          <div key={i} style={{ backgroundColor: 'white', padding: '15px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderLeft: `5px solid ${card.color}` }}>
            <div style={{ fontSize: '13px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>{card.label}</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b', marginTop: '5px' }}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* Query Workbench Section */}
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
        <h3 style={{ margin: '0 0 10px 0', color: '#1e293b' }}>⚙️ ZCQL Relational Database Workbench</h3>
        <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 15px 0' }}>
          Write and test relational queries directly against your Catalyst Data Store tables (CaseMaster, AccusedDetails, etc.).
        </p>

        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ width: '100%', height: '80px', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontFamily: 'monospace', fontSize: '14px', boxSizing: 'border-box', marginBottom: '15px' }}
        />

        <button
          onClick={executeQuery}
          disabled={loading}
          style={{ backgroundColor: '#1e293b', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
        >
          {loading ? 'Running Database Scan...' : 'Execute Data Query'}
        </button>
      </div>

      {/* Query Output View Table */}
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h3 style={{ margin: '0 0 15px 0', color: '#1e293b' }}>📋 Query Results Output Table</h3>

        {error && <div style={{ padding: '12px', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '6px', marginBottom: '15px', fontSize: '14px' }}>⚠️ {error}</div>}

        {results.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8', fontSize: '14px' }}>
            No records to display. Enter data into your Data Store or execute a query to pull results.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  {Object.keys(results[0]).map((key) => (
                    <th key={key} style={{ padding: '10px', color: '#475569', fontWeight: 600 }}>{key}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #edf2f7' }}>
                    {Object.values(row).map((val, i) => (
                      <td key={i} style={{ padding: '10px', color: '#334155' }}>{typeof val === 'object' ? JSON.stringify(val) : String(val)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;