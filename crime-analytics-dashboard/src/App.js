import React, { useState, useEffect, useCallback } from 'react';

// Fallback seeded dataset in case App is run standalone without proxy
const FALLBACK_CASES = [
  {
    ROWID: '47942000000041001',
    CrimeNo: '104430006202600001',
    CrimeRegisteredDate: '2026-01-10',
    PoliceStationID: 'Indiranagar PS',
    CrimeMajorHeadID: 101,
    latitude: 12.9784,
    longitude: 77.6408,
    CaseStatus: 'Under Investigation',
    BriefFacts: 'Complainant reported gold chain snatching near Indiranagar 100ft road around 8:30 PM by two unknown bike-borne assailants wearing helmets.'
  },
  {
    ROWID: '47942000000041002',
    CrimeNo: '104430006202600002',
    CrimeRegisteredDate: '2026-01-18',
    PoliceStationID: 'Koramangala PS',
    CrimeMajorHeadID: 103,
    latitude: 12.9352,
    longitude: 77.6245,
    CaseStatus: 'Charged',
    BriefFacts: 'Online banking phishing scam where victim lost Rs 4.5 Lakhs after clicking a fraudulent KYC update link sent via SMS.'
  },
  {
    ROWID: '47942000000041003',
    CrimeNo: '104430006202600003',
    CrimeRegisteredDate: '2026-01-25',
    PoliceStationID: 'Koramangala PS',
    CrimeMajorHeadID: 105,
    latitude: 12.9320,
    longitude: 77.6210,
    CaseStatus: 'Charge Sheeted',
    BriefFacts: 'House break-in reported at 3rd Block Koramangala residential apartment during weekend; gold ornaments weighing 120g and silver articles stolen.'
  },
  {
    ROWID: '47942000000041004',
    CrimeNo: '104430006202600004',
    CrimeRegisteredDate: '2026-02-02',
    PoliceStationID: 'Whitefield PS',
    CrimeMajorHeadID: 101,
    latitude: 12.9698,
    longitude: 77.7500,
    CaseStatus: 'Under Investigation',
    BriefFacts: 'Vehicle theft of two-wheeler parked outside Whitefield IT Park gate number 2 between 10 AM and 6 PM.'
  },
  {
    ROWID: '47942000000041005',
    CrimeNo: '104430006202600005',
    CrimeRegisteredDate: '2026-02-14',
    PoliceStationID: 'Cubbon Park PS',
    CrimeMajorHeadID: 104,
    latitude: 12.9716,
    longitude: 77.5946,
    CaseStatus: 'Pending Trial',
    BriefFacts: 'Physical altercation and assault reported between shopkeepers regarding commercial parking obstruction on Brigade Road.'
  },
  {
    ROWID: '47942000000041006',
    CrimeNo: '104430006202600006',
    CrimeRegisteredDate: '2026-02-20',
    PoliceStationID: 'Cubbon Park PS',
    CrimeMajorHeadID: 106,
    latitude: 12.9750,
    longitude: 77.6010,
    CaseStatus: 'Charged',
    BriefFacts: 'Seizure of illicit narcotics (1.2 kg ganja) during night patrolling check near MG Road metro station.'
  },
  {
    ROWID: '47942000000041007',
    CrimeNo: '104430006202600007',
    CrimeRegisteredDate: '2026-03-05',
    PoliceStationID: 'Jayanagar PS',
    CrimeMajorHeadID: 102,
    latitude: 12.9250,
    longitude: 77.5938,
    CaseStatus: 'Charge Sheeted',
    BriefFacts: 'Armed robbery attempt at a jewellery store in Jayanagar 4th Block averted by prompt intervention of beat police patrol.'
  },
  {
    ROWID: '47942000000041008',
    CrimeNo: '104430006202600008',
    CrimeRegisteredDate: '2026-03-12',
    PoliceStationID: 'Whitefield PS',
    CrimeMajorHeadID: 103,
    latitude: 12.9720,
    longitude: 77.7450,
    CaseStatus: 'Under Investigation',
    BriefFacts: 'Cyber financial fraud involving fake cryptocurrency trading scheme promising high guaranteed returns promoted via Telegram group.'
  },
  {
    ROWID: '47942000000041009',
    CrimeNo: '104430006202600009',
    CrimeRegisteredDate: '2026-03-22',
    PoliceStationID: 'Malleswaram PS',
    CrimeMajorHeadID: 105,
    latitude: 13.0035,
    longitude: 77.5703,
    CaseStatus: 'Under Investigation',
    BriefFacts: 'Commercial burglary at an electronics showroom in Malleswaram; multiple high-end laptops and mobile phones stolen overnight.'
  },
  {
    ROWID: '47942000000041010',
    CrimeNo: '104430006202600010',
    CrimeRegisteredDate: '2026-04-01',
    PoliceStationID: 'Whitefield PS',
    CrimeMajorHeadID: 104,
    latitude: 12.9560,
    longitude: 77.7010,
    CaseStatus: 'Closed',
    BriefFacts: 'Hit-and-run road traffic collision on Outer Ring Road near Marathahalli junction damaging complainant car and causing minor injury.'
  }
];

// Major Crime Head lookup mapping
const CRIME_HEAD_LABELS = {
  101: 'Theft / Chain Snatching',
  102: 'Robbery / Extortion',
  103: 'Cybercrime / Financial Fraud',
  104: 'Assault / Bodily Offence',
  105: 'Burglary / House Break-in',
  106: 'NDPS / Narcotics Seizure'
};

function App() {
  // Navigation & View State
  const [activeTab, setActiveTab] = useState('analytics'); // 'analytics' | 'workbench'
  const [displayMode, setDisplayMode] = useState('grid'); // 'grid' | 'table'

  // Dashboard Metrics State
  const [stats, setStats] = useState({
    firs: 0,
    units: 0,
    accused: 0,
    victims: 0
  });
  const [statsLoading, setStatsLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('checking'); // 'live' | 'fallback' | 'checking'

  // Filter & Search State for Analytics View
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortOrder, setSortOrder] = useState('NEWEST'); // 'NEWEST' | 'OLDEST'
  const [searchKeyword, setSearchKeyword] = useState('');
  const [appliedSearchKeyword, setAppliedSearchKeyword] = useState('');
  const [casesList, setCasesList] = useState([]);
  const [casesLoading, setCasesLoading] = useState(false);
  const [casesError, setCasesError] = useState(null);
  const [activeZcqlQuery, setActiveZcqlQuery] = useState('');

  // Workbench Query State
  const [workbenchQuery, setWorkbenchQuery] = useState('SELECT ROWID, CrimeNo, CrimeRegisteredDate, CaseStatus, BriefFacts FROM CaseMaster LIMIT 10');
  const [workbenchResults, setWorkbenchResults] = useState([]);
  const [workbenchLoading, setWorkbenchLoading] = useState(false);
  const [workbenchError, setWorkbenchError] = useState(null);

  // Reusable query runner targeting Catalyst Backend
  const runZcql = async (zcqlQuery) => {
    const response = await fetch('/server/datathon_kps_h_2_s_function/analytics/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: zcqlQuery })
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: Service unreachable or proxy offline.`);
    }
    const resData = await response.json();
    if (resData.status === 'success') return resData.data;
    throw new Error(resData.message || 'Query execution failed');
  };

  // Extract count robustly from ZCQL count array
  const parseCount = (data, tableName) => {
    if (!data || !Array.isArray(data) || data.length === 0) return 0;
    const row = data[0];
    const tableObj = row[tableName] || row;
    if (!tableObj || typeof tableObj !== 'object') return 0;
    const countVal = tableObj['COUNT(ROWID)'] ?? tableObj['ROWID'] ?? Object.values(tableObj)[0];
    return Number(countVal) || 0;
  };

  // Normalize Catalyst relational ZCQL output rows [{ CaseMaster: { CrimeNo: ... } }] -> [{ CrimeNo: ... }]
  const normalizeRows = (data) => {
    if (!Array.isArray(data)) return [];
    return data.map((item) => {
      if (item && typeof item === 'object') {
        const keys = Object.keys(item);
        if (keys.length === 1 && typeof item[keys[0]] === 'object' && item[keys[0]] !== null) {
          return item[keys[0]];
        }
      }
      return item;
    });
  };

  // Fetch KPI statistics
  const fetchDashboardStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const [firData, unitData, accusedData, victimData] = await Promise.all([
        runZcql('SELECT COUNT(ROWID) FROM CaseMaster'),
        runZcql('SELECT COUNT(ROWID) FROM Unit'),
        runZcql('SELECT COUNT(ROWID) FROM AccusedDetails'),
        runZcql('SELECT COUNT(ROWID) FROM VictimDetails')
      ]);

      setStats({
        firs: parseCount(firData, 'CaseMaster'),
        units: parseCount(unitData, 'Unit'),
        accused: parseCount(accusedData, 'AccusedDetails'),
        victims: parseCount(victimData, 'VictimDetails')
      });
      setConnectionStatus('live');
    } catch (err) {
      console.warn('Backend proxy unreachable or running standalone. Using fallback seed counts.', err.message);
      setStats({
        firs: 20,
        units: 8,
        accused: 20,
        victims: 20
      });
      setConnectionStatus('fallback');
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Construct ZCQL query for dynamic status & BriefFacts LIKE search
  const buildCasesQuery = useCallback((status, keyword) => {
    const clauses = [];
    if (status && status !== 'ALL') {
      clauses.push(`CaseStatus = '${status.replace(/'/g, "''")}'`);
    }
    if (keyword && keyword.trim() !== '') {
      const cleanKW = keyword.trim().replace(/'/g, "''");
      clauses.push(`BriefFacts LIKE '%${cleanKW}%'`);
    }

    let q = 'SELECT * FROM CaseMaster';
    if (clauses.length > 0) {
      q += ` WHERE ${clauses.join(' AND ')}`;
    }
    return q;
  }, []);

  // Fetch filtered cases
  const fetchCases = useCallback(async (status, keyword) => {
    setCasesLoading(true);
    setCasesError(null);
    const zcqlQuery = buildCasesQuery(status, keyword);
    setActiveZcqlQuery(zcqlQuery);

    try {
      const rawData = await runZcql(zcqlQuery);
      const normalized = normalizeRows(rawData);
      setCasesList(normalized);
      setConnectionStatus('live');
    } catch (err) {
      console.warn('ZCQL Query fallback applied:', err.message);
      // Client-side filtering fallback for standalone preview
      let filtered = [...FALLBACK_CASES];
      if (status && status !== 'ALL') {
        filtered = filtered.filter((item) => item.CaseStatus === status);
      }
      if (keyword && keyword.trim() !== '') {
        const lowerKW = keyword.trim().toLowerCase();
        filtered = filtered.filter((item) =>
          item.BriefFacts && item.BriefFacts.toLowerCase().includes(lowerKW)
        );
      }
      setCasesList(filtered);
      setConnectionStatus('fallback');
    } finally {
      setCasesLoading(false);
    }
  }, [buildCasesQuery]);

  useEffect(() => {
    fetchDashboardStats();
    fetchCases('ALL', '');
  }, [fetchDashboardStats, fetchCases]);

  const handleApplyFilter = (e) => {
    e.preventDefault();
    setAppliedSearchKeyword(searchKeyword);
    fetchCases(statusFilter, searchKeyword);
  };

  const handleResetFilter = () => {
    setStatusFilter('ALL');
    setSortOrder('NEWEST');
    setSearchKeyword('');
    setAppliedSearchKeyword('');
    fetchCases('ALL', '');
  };

  // Derive sorted records for display & CSV export
  const displayedCases = React.useMemo(() => {
    const sorted = [...casesList];
    sorted.sort((a, b) => {
      const dateA = a.CrimeRegisteredDate ? new Date(a.CrimeRegisteredDate).getTime() : 0;
      const dateB = b.CrimeRegisteredDate ? new Date(b.CrimeRegisteredDate).getTime() : 0;
      if (dateA !== dateB) {
        return sortOrder === 'NEWEST' ? dateB - dateA : dateA - dateB;
      }
      return String(a.CrimeNo || '').localeCompare(String(b.CrimeNo || ''));
    });
    return sorted;
  }, [casesList, sortOrder]);

  // CSV Log Exporter
  const handleDownloadCSV = () => {
    if (!displayedCases || displayedCases.length === 0) {
      alert('No records available to export.');
      return;
    }

    const escapeCSV = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const headers = ['CrimeNo', 'Date', 'Status', 'Coordinates', 'Brief Facts'];
    const rows = displayedCases.map((item) => {
      const coords = item.latitude && item.longitude
        ? `${Number(item.latitude).toFixed(4)}°N, ${Number(item.longitude).toFixed(4)}°E`
        : 'N/A';
      return [
        escapeCSV(item.CrimeNo || 'N/A'),
        escapeCSV(item.CrimeRegisteredDate || 'N/A'),
        escapeCSV(item.CaseStatus || 'N/A'),
        escapeCSV(coords),
        escapeCSV(item.BriefFacts || '')
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `KSP_Crime_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Execute custom workbench query
  const executeWorkbenchQuery = async () => {
    setWorkbenchLoading(true);
    setWorkbenchError(null);
    try {
      const raw = await runZcql(workbenchQuery);
      setWorkbenchResults(normalizeRows(raw));
      setConnectionStatus('live');
    } catch (err) {
      setWorkbenchError(err.message || 'Service unreachable.');
    } finally {
      setWorkbenchLoading(false);
    }
  };

  // Status Badge Color Picker
  const getStatusStyle = (status) => {
    switch (status) {
      case 'Under Investigation':
        return { bg: '#fff7ed', border: '#fdba74', text: '#c2410c', icon: '🔍' };
      case 'Charged':
        return { bg: '#f3e8ff', border: '#d8b4fe', text: '#7e22ce', icon: '⚖️' };
      case 'Charge Sheeted':
        return { bg: '#eff6ff', border: '#93c5fd', text: '#1d4ed8', icon: '📄' };
      case 'Closed':
        return { bg: '#ecfdf5', border: '#6ee7b7', text: '#047857', icon: '✅' };
      case 'Pending Trial':
        return { bg: '#fef2f2', border: '#fca5a5', text: '#b91c1c', icon: '⏳' };
      default:
        return { bg: '#f1f5f9', border: '#cbd5e1', text: '#475569', icon: '📌' };
    }
  };

  return (
    <div style={styles.appContainer}>
      {/* Top Banner Navigation */}
      <header style={styles.header}>
        <div style={styles.headerTitleArea}>
          <div style={styles.logoBadge}>KSP</div>
          <div>
            <h1 style={styles.headerTitle}>Karnataka State Police • Crime Analytics Command Center</h1>
            <div style={styles.headerSubtitle}>
              Real-time Relational DataStore Intelligence & ZCQL Analytical Platform
            </div>
          </div>
        </div>

        <div style={styles.headerControls}>
          <div style={{
            ...styles.connectionBadge,
            backgroundColor: connectionStatus === 'live' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
            borderColor: connectionStatus === 'live' ? '#10b981' : '#f59e0b',
            color: connectionStatus === 'live' ? '#10b981' : '#f59e0b'
          }}>
            <span style={styles.statusDot(connectionStatus === 'live' ? '#10b981' : '#f59e0b')} />
            {connectionStatus === 'live' ? 'LIVE CATALYST DATASTORE' : 'SEEDED FALLBACK ACTIVE'}
          </div>

          <div style={styles.tabContainer}>
            <button
              onClick={() => setActiveTab('analytics')}
              style={activeTab === 'analytics' ? styles.tabActive : styles.tabInactive}
            >
              📊 Analytics Grid
            </button>
            <button
              onClick={() => setActiveTab('workbench')}
              style={activeTab === 'workbench' ? styles.tabActive : styles.tabInactive}
            >
              ⚙️ ZCQL Workbench
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={styles.main}>
        {/* Metric Cards Banner (High Fidelity Styling) */}
        <section style={styles.metricsGrid}>
          <div style={styles.metricCard('#3b82f6', '#eff6ff')}>
            <div style={styles.metricHeader}>
              <span style={styles.metricLabel}>Total FIRs Registered</span>
              <span style={styles.metricIcon('#3b82f6')}>📁</span>
            </div>
            <div style={styles.metricValue}>
              {statsLoading ? '...' : stats.firs.toLocaleString()}
            </div>
            <div style={styles.metricFooter}>
              <span style={styles.metricChangePositive}>+100% seeded</span>
              <span style={styles.metricSubtext}>CaseMaster Table</span>
            </div>
          </div>

          <div style={styles.metricCard('#10b981', '#ecfdf5')}>
            <div style={styles.metricHeader}>
              <span style={styles.metricLabel}>Active Operational Units</span>
              <span style={styles.metricIcon('#10b981')}>🏢</span>
            </div>
            <div style={styles.metricValue}>
              {statsLoading ? '...' : stats.units.toLocaleString()}
            </div>
            <div style={styles.metricFooter}>
              <span style={styles.metricChangePositive}>Across 5 Districts</span>
              <span style={styles.metricSubtext}>Unit Hierarchy</span>
            </div>
          </div>

          <div style={styles.metricCard('#f59e0b', '#fffbeb')}>
            <div style={styles.metricHeader}>
              <span style={styles.metricLabel}>Total Accused Tracked</span>
              <span style={styles.metricIcon('#f59e0b')}>⚖️</span>
            </div>
            <div style={styles.metricValue}>
              {statsLoading ? '...' : stats.accused.toLocaleString()}
            </div>
            <div style={styles.metricFooter}>
              <span style={styles.metricChangeNeutral}>1:1 FIR Linkage</span>
              <span style={styles.metricSubtext}>AccusedDetails</span>
            </div>
          </div>

          <div style={styles.metricCard('#ef4444', '#fef2f2')}>
            <div style={styles.metricHeader}>
              <span style={styles.metricLabel}>Victim Protection Records</span>
              <span style={styles.metricIcon('#ef4444')}>🛡️</span>
            </div>
            <div style={styles.metricValue}>
              {statsLoading ? '...' : stats.victims.toLocaleString()}
            </div>
            <div style={styles.metricFooter}>
              <span style={styles.metricChangePositive}>Verified Profiles</span>
              <span style={styles.metricSubtext}>VictimDetails</span>
            </div>
          </div>
        </section>

        {activeTab === 'analytics' ? (
          <>
            {/* Filter & Search Toolbar Section */}
            <section style={styles.toolbarCard}>
              <form onSubmit={handleApplyFilter} style={styles.toolbarForm}>
                <div style={styles.filterGroup}>
                  <label style={styles.filterLabel}>Filter by Case Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    style={styles.selectInput}
                  >
                    <option value="ALL">🌟 All Case Statuses</option>
                    <option value="Under Investigation">🔍 Under Investigation</option>
                    <option value="Charged">⚖️ Charged</option>
                    <option value="Charge Sheeted">📄 Charge Sheeted</option>
                    <option value="Closed">✅ Closed</option>
                    <option value="Pending Trial">⏳ Pending Trial</option>
                  </select>
                </div>

                <div style={styles.filterGroup}>
                  <label style={styles.filterLabel}>Sort Chronologically</label>
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    style={styles.selectInput}
                  >
                    <option value="NEWEST">📅 Newest First (Descending)</option>
                    <option value="OLDEST">📆 Oldest First (Ascending)</option>
                  </select>
                </div>

                <div style={styles.searchGroup}>
                  <label style={styles.filterLabel}>
                    Search Case BriefFacts (ZCQL LIKE Clause)
                  </label>
                  <div style={styles.searchWrapper}>
                    <span style={styles.searchIcon}>🔎</span>
                    <input
                      type="text"
                      value={searchKeyword}
                      onChange={(e) => setSearchKeyword(e.target.value)}
                      placeholder="Search keywords e.g. 'snatching', 'fraud', 'burglary'..."
                      style={styles.searchInput}
                    />
                  </div>
                </div>

                <div style={styles.buttonGroup}>
                  <button type="submit" style={styles.btnPrimary}>
                    Apply Analytics Matrix
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadCSV}
                    style={styles.btnExport}
                  >
                    📥 Download CSV Report
                  </button>
                  <button
                    type="button"
                    onClick={handleResetFilter}
                    style={styles.btnSecondary}
                  >
                    Reset
                  </button>
                </div>
              </form>

              {/* ZCQL Query Pill Display */}
              <div style={styles.zcqlPreviewBar}>
                <span style={styles.zcqlPreviewLabel}>LIVE ZCQL QUERY</span>
                <code style={styles.zcqlCode}>{activeZcqlQuery}</code>
              </div>
            </section>

            {/* Results Header Control Bar */}
            <div style={styles.resultsHeader}>
              <div>
                <h2 style={styles.resultsTitle}>
                  Crime Case Records {displayedCases.length > 0 && `(${displayedCases.length} Found)`}
                </h2>
                <p style={styles.resultsSubtitle}>
                  Displaying structured police records matching active filter conditions
                  {appliedSearchKeyword && (
                    <span style={styles.activeKeywordPill}>
                      {" • "}Keyword: "{appliedSearchKeyword}"
                    </span>
                  )}
                  <span style={styles.activeSortPill}>
                    {" • "}Sorted by Date ({sortOrder === 'NEWEST' ? 'Newest First' : 'Oldest First'})
                  </span>
                </p>
              </div>

              <div style={styles.viewToggleGroup}>
                <button
                  onClick={() => setDisplayMode('grid')}
                  style={displayMode === 'grid' ? styles.viewToggleActive : styles.viewToggleInactive}
                >
                  🗂️ Grid View
                </button>
                <button
                  onClick={() => setDisplayMode('table')}
                  style={displayMode === 'table' ? styles.viewToggleActive : styles.viewToggleInactive}
                >
                  📋 Table View
                </button>
              </div>
            </div>

            {casesError && (
              <div style={styles.errorAlert}>
                ⚠️ Query Warning: {casesError}
              </div>
            )}

            {/* Loading / Empty / Content View */}
            {casesLoading ? (
              <div style={styles.loadingBox}>
                <div style={styles.spinner}>⌛</div>
                <p style={styles.loadingText}>Executing ZCQL Scan on CaseMaster...</p>
              </div>
            ) : displayedCases.length === 0 ? (
              <div style={styles.emptyStateBox}>
                <span style={styles.emptyIcon}>📂</span>
                <h3 style={styles.emptyTitle}>No Cases Found Matching Criteria</h3>
                <p style={styles.emptyText}>
                  Try resetting the status filter or clearing search keywords.
                </p>
                <button onClick={handleResetFilter} style={styles.btnPrimary}>
                  Clear All Filters
                </button>
              </div>
            ) : displayMode === 'grid' ? (
              /* STRUCTURED GRID DISPLAY */
              <div style={styles.casesGrid}>
                {displayedCases.map((caseItem, idx) => {
                  const statusStyle = getStatusStyle(caseItem.CaseStatus);
                  const crimeHead = CRIME_HEAD_LABELS[caseItem.CrimeMajorHeadID] || `Major Head #${caseItem.CrimeMajorHeadID || 'N/A'}`;

                  return (
                    <div key={caseItem.ROWID || idx} style={styles.caseCard}>
                      {/* Top Row: Crime No & Status Badge */}
                      <div style={styles.caseCardHeader}>
                        <div style={styles.crimeNoBadge}>
                          FIR #{caseItem.CrimeNo || 'UNKNOWN'}
                        </div>
                        <div style={{
                          ...styles.statusBadge,
                          backgroundColor: statusStyle.bg,
                          borderColor: statusStyle.border,
                          color: statusStyle.text
                        }}>
                          <span>{statusStyle.icon}</span>
                          <span>{caseItem.CaseStatus || 'Status N/A'}</span>
                        </div>
                      </div>

                      {/* Major Head & Registration Date */}
                      <div style={styles.metaRow}>
                        <div style={styles.metaItem}>
                          <span style={styles.metaLabel}>CRIME CATEGORY</span>
                          <span style={styles.metaValue}>{crimeHead}</span>
                        </div>
                        <div style={styles.metaItemRight}>
                          <span style={styles.metaLabel}>REGISTERED DATE</span>
                          <span style={styles.metaValue}>{caseItem.CrimeRegisteredDate || 'N/A'}</span>
                        </div>
                      </div>

                      {/* Brief Facts */}
                      <div style={styles.briefFactsArea}>
                        <span style={styles.briefFactsTitle}>BRIEF CASE FACTS</span>
                        <p style={styles.briefFactsText}>
                          {caseItem.BriefFacts || 'No case facts documented.'}
                        </p>
                      </div>

                      {/* Footer: Geospatial Coordinates & Police Station Link */}
                      <div style={styles.caseCardFooter}>
                        <div style={styles.geoBadge}>
                          <span>📍</span>
                          <span>
                            {caseItem.latitude && caseItem.longitude
                              ? `${Number(caseItem.latitude).toFixed(4)}°N, ${Number(caseItem.longitude).toFixed(4)}°E`
                              : 'Geo N/A'}
                          </span>
                        </div>
                        <div style={styles.psBadge}>
                          🏢 Station ID: {caseItem.PoliceStationID || 'N/A'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* TABULAR DISPLAY */
              <div style={styles.tableCard}>
                <div style={styles.tableResponsive}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Crime Number</th>
                        <th style={styles.th}>Registered Date</th>
                        <th style={styles.th}>Case Status</th>
                        <th style={styles.th}>Category Head</th>
                        <th style={styles.th}>Coordinates</th>
                        <th style={styles.th}>Brief Case Facts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayedCases.map((caseItem, idx) => {
                        const statusStyle = getStatusStyle(caseItem.CaseStatus);
                        const crimeHead = CRIME_HEAD_LABELS[caseItem.CrimeMajorHeadID] || `Head #${caseItem.CrimeMajorHeadID}`;
                        return (
                          <tr key={caseItem.ROWID || idx} style={styles.tr}>
                            <td style={styles.tdBold}>{caseItem.CrimeNo}</td>
                            <td style={styles.td}>{caseItem.CrimeRegisteredDate}</td>
                            <td style={styles.td}>
                              <span style={{
                                ...styles.statusBadgeSmall,
                                backgroundColor: statusStyle.bg,
                                borderColor: statusStyle.border,
                                color: statusStyle.text
                              }}>
                                {caseItem.CaseStatus}
                              </span>
                            </td>
                            <td style={styles.td}>{crimeHead}</td>
                            <td style={styles.tdMono}>
                              {caseItem.latitude && caseItem.longitude
                                ? `${Number(caseItem.latitude).toFixed(3)}, ${Number(caseItem.longitude).toFixed(3)}`
                                : 'N/A'}
                            </td>
                            <td style={styles.tdDesc}>{caseItem.BriefFacts}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        ) : (
          /* ZCQL DEVELOPER WORKBENCH TAB */
          <section style={styles.workbenchContainer}>
            <div style={styles.workbenchEditorCard}>
              <div style={styles.workbenchHeader}>
                <h3 style={styles.workbenchTitle}>⚙️ Advanced ZCQL SQL Editor</h3>
                <span style={styles.workbenchSubtitle}>
                  Execute relational queries against CaseMaster, AccusedDetails, VictimDetails, Unit, or District
                </span>
              </div>

              <textarea
                value={workbenchQuery}
                onChange={(e) => setWorkbenchQuery(e.target.value)}
                style={styles.workbenchTextarea}
                placeholder="SELECT ROWID, CrimeNo, CaseStatus FROM CaseMaster LIMIT 10"
              />

              <div style={styles.workbenchActionRow}>
                <button
                  onClick={executeWorkbenchQuery}
                  disabled={workbenchLoading}
                  style={styles.btnPrimaryLarge}
                >
                  {workbenchLoading ? '⏳ Running ZCQL Query...' : '🚀 Execute Relational Query'}
                </button>
              </div>
            </div>

            {workbenchError && (
              <div style={styles.errorAlert}>
                ⚠️ {workbenchError}
              </div>
            )}

            <div style={styles.workbenchOutputCard}>
              <h4 style={styles.workbenchOutputTitle}>
                Query Output ({workbenchResults.length} rows returned)
              </h4>

              {workbenchResults.length === 0 ? (
                <div style={styles.emptyWorkbenchBox}>
                  No output rows. Execute a query above to view relational tables.
                </div>
              ) : (
                <div style={styles.tableResponsive}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        {Object.keys(workbenchResults[0]).map((colKey) => (
                          <th key={colKey} style={styles.th}>{colKey}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {workbenchResults.map((row, idx) => (
                        <tr key={idx} style={styles.tr}>
                          {Object.values(row).map((val, colIdx) => (
                            <td key={colIdx} style={styles.td}>
                              {typeof val === 'object' ? JSON.stringify(val) : String(val ?? '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer style={styles.footer}>
        <span>© 2026 Karnataka State Police Datathon Platform • Powered by Zoho Catalyst Serverless DataStore</span>
      </footer>
    </div>
  );
}

// Production-Grade CSS-in-JS Styles
const styles = {
  appContainer: {
    fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, 'Roboto', sans-serif",
    backgroundColor: '#0f172a',
    minHeight: '100vh',
    color: '#e2e8f0',
    display: 'flex',
    flexDirection: 'column'
  },
  header: {
    backgroundColor: '#1e293b',
    borderBottom: '1px solid #334155',
    padding: '16px 28px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '16px'
  },
  headerTitleArea: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },
  logoBadge: {
    width: '46px',
    height: '46px',
    borderRadius: '10px',
    background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '800',
    fontSize: '18px',
    color: 'white',
    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.35)'
  },
  headerTitle: {
    margin: 0,
    fontSize: '20px',
    fontWeight: '700',
    color: '#f8fafc',
    letterSpacing: '0.3px'
  },
  headerSubtitle: {
    fontSize: '13px',
    color: '#94a3b8',
    marginTop: '2px'
  },
  headerControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    flexWrap: 'wrap'
  },
  connectionBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '11px',
    fontWeight: '700',
    letterSpacing: '0.5px',
    padding: '6px 12px',
    borderRadius: '20px',
    border: '1px solid'
  },
  statusDot: (color) => ({
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: color,
    display: 'inline-block'
  }),
  tabContainer: {
    backgroundColor: '#0f172a',
    padding: '4px',
    borderRadius: '8px',
    display: 'flex',
    gap: '4px',
    border: '1px solid #334155'
  },
  tabActive: {
    backgroundColor: '#2563eb',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  tabInactive: {
    backgroundColor: 'transparent',
    color: '#94a3b8',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  main: {
    flex: 1,
    padding: '28px',
    maxWidth: '1440px',
    width: '100%',
    boxSizing: 'border-box',
    margin: '0 auto'
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: '20px',
    marginBottom: '28px'
  },
  metricCard: (accentColor, tintBg) => ({
    backgroundColor: '#1e293b',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #334155',
    borderTop: `4px solid ${accentColor}`,
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between'
  }),
  metricHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  metricLabel: {
    fontSize: '12px',
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.6px'
  },
  metricIcon: (color) => ({
    fontSize: '18px'
  }),
  metricValue: {
    fontSize: '32px',
    fontWeight: '800',
    color: '#f8fafc',
    margin: '12px 0 8px 0'
  },
  metricFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTop: '1px solid #334155',
    paddingTop: '10px'
  },
  metricChangePositive: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#34d399',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    padding: '2px 8px',
    borderRadius: '12px'
  },
  metricChangeNeutral: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#fbbf24',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    padding: '2px 8px',
    borderRadius: '12px'
  },
  metricSubtext: {
    fontSize: '12px',
    color: '#64748b'
  },
  toolbarCard: {
    backgroundColor: '#1e293b',
    borderRadius: '12px',
    padding: '22px',
    border: '1px solid #334155',
    marginBottom: '24px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2)'
  },
  toolbarForm: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
    gap: '16px',
    alignItems: 'end',
    marginBottom: '16px'
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  searchGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  filterLabel: {
    fontSize: '12px',
    fontWeight: '700',
    color: '#cbd5e1',
    letterSpacing: '0.4px',
    textTransform: 'uppercase'
  },
  selectInput: {
    backgroundColor: '#0f172a',
    border: '1px solid #475569',
    color: '#f8fafc',
    padding: '10px 14px',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    cursor: 'pointer'
  },
  searchWrapper: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    border: '1px solid #475569',
    borderRadius: '8px',
    padding: '0 12px'
  },
  searchIcon: {
    fontSize: '16px',
    marginRight: '8px',
    opacity: 0.7
  },
  searchInput: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#f8fafc',
    padding: '10px 4px',
    fontSize: '14px',
    width: '100%',
    outline: 'none'
  },
  buttonGroup: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap'
  },
  btnExport: {
    backgroundColor: '#1e293b',
    color: '#38bdf8',
    border: '1px solid #0284c7',
    padding: '10px 18px',
    borderRadius: '8px',
    fontWeight: '600',
    fontSize: '14px',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    boxShadow: '0 2px 4px rgba(2, 132, 199, 0.2)',
    transition: 'all 0.2s'
  },
  btnPrimary: {
    backgroundColor: '#2563eb',
    color: 'white',
    border: 'none',
    padding: '10px 18px',
    borderRadius: '8px',
    fontWeight: '600',
    fontSize: '14px',
    cursor: 'pointer',
    boxShadow: '0 2px 4px rgba(37, 99, 235, 0.3)'
  },
  btnSecondary: {
    backgroundColor: '#334155',
    color: '#e2e8f0',
    border: 'none',
    padding: '10px 16px',
    borderRadius: '8px',
    fontWeight: '600',
    fontSize: '14px',
    cursor: 'pointer'
  },
  btnPrimaryLarge: {
    backgroundColor: '#2563eb',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    fontWeight: '700',
    fontSize: '15px',
    cursor: 'pointer'
  },
  zcqlPreviewBar: {
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '8px',
    padding: '10px 14px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    overflowX: 'auto'
  },
  zcqlPreviewLabel: {
    fontSize: '11px',
    fontWeight: '800',
    color: '#38bdf8',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    padding: '3px 8px',
    borderRadius: '4px',
    whiteSpace: 'nowrap'
  },
  zcqlCode: {
    fontFamily: "'Fira Code', 'Consolas', monospace",
    fontSize: '13px',
    color: '#e2e8f0'
  },
  resultsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '18px',
    flexWrap: 'wrap',
    gap: '12px'
  },
  resultsTitle: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '700',
    color: '#f8fafc'
  },
  resultsSubtitle: {
    margin: '4px 0 0 0',
    fontSize: '13px',
    color: '#94a3b8'
  },
  activeKeywordPill: {
    color: '#38bdf8',
    fontWeight: '600'
  },
  activeSortPill: {
    color: '#38bdf8',
    fontWeight: '600'
  },
  viewToggleGroup: {
    display: 'flex',
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '8px',
    padding: '3px'
  },
  viewToggleActive: {
    backgroundColor: '#334155',
    color: 'white',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  viewToggleInactive: {
    backgroundColor: 'transparent',
    color: '#94a3b8',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  casesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '20px'
  },
  caseCard: {
    backgroundColor: '#1e293b',
    borderRadius: '12px',
    border: '1px solid #334155',
    padding: '18px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.15)',
    transition: 'transform 0.2s, box-shadow 0.2s'
  },
  caseCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '14px'
  },
  crimeNoBadge: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#38bdf8',
    fontFamily: 'monospace',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    padding: '4px 10px',
    borderRadius: '6px'
  },
  statusBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    fontWeight: '700',
    padding: '4px 10px',
    borderRadius: '20px',
    border: '1px solid'
  },
  statusBadgeSmall: {
    display: 'inline-block',
    fontSize: '11px',
    fontWeight: '700',
    padding: '3px 8px',
    borderRadius: '12px',
    border: '1px solid'
  },
  metaRow: {
    display: 'flex',
    justifyContent: 'space-between',
    backgroundColor: '#0f172a',
    padding: '10px 12px',
    borderRadius: '8px',
    marginBottom: '14px'
  },
  metaItem: {
    display: 'flex',
    flexDirection: 'column'
  },
  metaItemRight: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end'
  },
  metaLabel: {
    fontSize: '10px',
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: '0.5px'
  },
  metaValue: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#e2e8f0',
    marginTop: '2px'
  },
  briefFactsArea: {
    marginBottom: '16px'
  },
  briefFactsTitle: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: '0.5px',
    display: 'block',
    marginBottom: '6px'
  },
  briefFactsText: {
    margin: 0,
    fontSize: '13px',
    lineHeight: '1.5',
    color: '#cbd5e1'
  },
  caseCardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTop: '1px solid #334155',
    paddingTop: '12px',
    fontSize: '12px'
  },
  geoBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    color: '#94a3b8',
    fontFamily: 'monospace'
  },
  psBadge: {
    color: '#64748b',
    fontWeight: '600'
  },
  tableCard: {
    backgroundColor: '#1e293b',
    borderRadius: '12px',
    border: '1px solid #334155',
    overflow: 'hidden'
  },
  tableResponsive: {
    overflowX: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left'
  },
  th: {
    backgroundColor: '#0f172a',
    color: '#94a3b8',
    fontSize: '12px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    padding: '14px 16px',
    borderBottom: '1px solid #334155'
  },
  tr: {
    borderBottom: '1px solid #334155'
  },
  td: {
    padding: '14px 16px',
    fontSize: '13px',
    color: '#e2e8f0'
  },
  tdBold: {
    padding: '14px 16px',
    fontSize: '13px',
    color: '#38bdf8',
    fontWeight: '700',
    fontFamily: 'monospace'
  },
  tdMono: {
    padding: '14px 16px',
    fontSize: '12px',
    color: '#94a3b8',
    fontFamily: 'monospace'
  },
  tdDesc: {
    padding: '14px 16px',
    fontSize: '13px',
    color: '#cbd5e1',
    maxWidth: '380px',
    lineHeight: '1.4'
  },
  loadingBox: {
    backgroundColor: '#1e293b',
    borderRadius: '12px',
    border: '1px solid #334155',
    padding: '60px 20px',
    textAlign: 'center'
  },
  spinner: {
    fontSize: '32px',
    marginBottom: '12px'
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: '15px'
  },
  emptyStateBox: {
    backgroundColor: '#1e293b',
    borderRadius: '12px',
    border: '1px solid #334155',
    padding: '60px 20px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  emptyIcon: {
    fontSize: '42px',
    marginBottom: '12px'
  },
  emptyTitle: {
    margin: '0 0 8px 0',
    fontSize: '18px',
    color: '#f8fafc'
  },
  emptyText: {
    margin: '0 0 20px 0',
    color: '#94a3b8',
    fontSize: '14px',
    maxWidth: '400px'
  },
  workbenchContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  workbenchEditorCard: {
    backgroundColor: '#1e293b',
    borderRadius: '12px',
    padding: '22px',
    border: '1px solid #334155'
  },
  workbenchHeader: {
    marginBottom: '14px'
  },
  workbenchTitle: {
    margin: '0 0 4px 0',
    fontSize: '18px',
    color: '#f8fafc'
  },
  workbenchSubtitle: {
    fontSize: '13px',
    color: '#94a3b8'
  },
  workbenchTextarea: {
    width: '100%',
    height: '110px',
    backgroundColor: '#0f172a',
    border: '1px solid #475569',
    borderRadius: '8px',
    color: '#38bdf8',
    fontFamily: "'Fira Code', monospace",
    fontSize: '14px',
    padding: '14px',
    boxSizing: 'border-box',
    marginBottom: '16px',
    outline: 'none'
  },
  workbenchActionRow: {
    display: 'flex',
    justifyContent: 'flex-end'
  },
  workbenchOutputCard: {
    backgroundColor: '#1e293b',
    borderRadius: '12px',
    padding: '22px',
    border: '1px solid #334155'
  },
  workbenchOutputTitle: {
    margin: '0 0 16px 0',
    fontSize: '16px',
    color: '#f8fafc'
  },
  emptyWorkbenchBox: {
    padding: '40px 20px',
    textAlign: 'center',
    color: '#64748b',
    fontSize: '14px',
    border: '1px dashed #334155',
    borderRadius: '8px'
  },
  errorAlert: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    border: '1px solid #ef4444',
    color: '#fca5a5',
    padding: '14px 18px',
    borderRadius: '8px',
    fontSize: '14px'
  },
  footer: {
    borderTop: '1px solid #334155',
    padding: '20px 28px',
    textAlign: 'center',
    fontSize: '12px',
    color: '#64748b',
    backgroundColor: '#0f172a'
  }
};

export default App;