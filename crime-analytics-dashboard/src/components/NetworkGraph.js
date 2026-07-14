import React, { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';

const API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:3000/server/datathon_kps_h_2_s_function'
  : '/server/datathon_kps_h_2_s_function';

const FALLBACK_GRAPH = {
  nodes: [
    { data: { id: 'case-1', label: 'FIR #104430006202600001', type: 'case' } },
    { data: { id: 'case-2', label: 'FIR #104430006202600004', type: 'case' } },
    { data: { id: 'accused-1', label: 'Suresh Gowda', type: 'accused' } },
    { data: { id: 'accused-2', label: 'Raju Kumar', type: 'accused' } },
    { data: { id: 'victim-1', label: 'Victim #102', type: 'victim' } },
    { data: { id: 'district-1', label: 'Bengaluru City District', type: 'district' } }
  ],
  edges: [
    { data: { source: 'accused-1', target: 'case-1', label: 'accused in' } },
    { data: { source: 'accused-1', target: 'case-2', label: 'accused in' } },
    { data: { source: 'accused-2', target: 'case-1', label: 'accused in' } },
    { data: { source: 'victim-1', target: 'case-1', label: 'victim in' } },
    { data: { source: 'case-1', target: 'district-1', label: 'occurred in' } },
    { data: { source: 'case-2', target: 'district-1', label: 'occurred in' } }
  ]
};

export default function NetworkGraph() {
  const containerRef = useRef(null);
  const cyRef = useRef(null);
  const [searchVal, setSearchVal] = useState('Suresh Gowda');
  const [loading, setLoading] = useState(false);
  const [graphData, setGraphData] = useState(FALLBACK_GRAPH);

  const fetchNetwork = async (queryInput) => {
    setLoading(true);
    let url = `${API_BASE}/analytics/network`;
    const clean = (queryInput || '').trim();
    if (clean) {
      if (/^\d+$/.test(clean)) {
        url += `?caseId=${encodeURIComponent(clean)}`;
      } else {
        url += `?accusedName=${encodeURIComponent(clean)}`;
      }
    }

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json && Array.isArray(json.nodes) && json.nodes.length > 0) {
        setGraphData({ nodes: json.nodes, edges: json.edges || [] });
      } else {
        setGraphData({ nodes: [], edges: [] });
      }
    } catch (err) {
      console.warn('Network graph fetch fallback applied:', err.message);
      setGraphData(FALLBACK_GRAPH);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNetwork(searchVal);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    if (cyRef.current) {
      cyRef.current.destroy();
      cyRef.current = null;
    }

    if (!graphData.nodes || graphData.nodes.length === 0) return;

    const cy = cytoscape({
      container: containerRef.current,
      elements: [
        ...graphData.nodes,
        ...(graphData.edges || [])
      ],
      style: [
        {
          selector: 'node[type="case"]',
          style: {
            'shape': 'rectangle',
            'background-color': '#0D1117',
            'border-color': '#00D4FF',
            'border-width': 3,
            'label': 'data(label)',
            'color': '#E6EDF3',
            'font-size': '11px',
            'text-valign': 'center',
            'text-halign': 'center',
            'width': 130,
            'height': 36
          }
        },
        {
          selector: 'node[type="accused"]',
          style: {
            'shape': 'ellipse',
            'background-color': '#FF4444',
            'label': 'data(label)',
            'color': '#ffffff',
            'font-size': '11px',
            'font-weight': 'bold',
            'text-valign': 'center',
            'text-halign': 'center',
            'width': 85,
            'height': 85
          }
        },
        {
          selector: 'node[type="victim"]',
          style: {
            'shape': 'ellipse',
            'background-color': '#FFB347',
            'label': 'data(label)',
            'color': '#0D1117',
            'font-size': '11px',
            'text-valign': 'center',
            'text-halign': 'center',
            'width': 75,
            'height': 75
          }
        },
        {
          selector: 'node[type="district"]',
          style: {
            'shape': 'diamond',
            'background-color': '#00CC88',
            'label': 'data(label)',
            'color': '#0D1117',
            'font-size': '11px',
            'font-weight': 'bold',
            'text-valign': 'center',
            'text-halign': 'center',
            'width': 95,
            'height': 95
          }
        },
        {
          selector: 'edge',
          style: {
            'width': 2,
            'line-color': '#30363D',
            'target-arrow-color': '#30363D',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'label': 'data(label)',
            'font-size': '9px',
            'color': '#8B949E',
            'text-background-color': '#0D1117',
            'text-background-opacity': 0.8,
            'text-background-padding': '2px'
          }
        }
      ],
      layout: {
        name: 'cose',
        animate: true,
        randomize: false,
        componentSpacing: 100,
        nodeOverlap: 20
      }
    });

    cyRef.current = cy;

    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
        cyRef.current = null;
      }
    };
  }, [graphData]);

  const handleSubmit = (e) => {
    e.preventDefault();
    fetchNetwork(searchVal);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>🕸️ Crime Linkage & Repeat Offender Network Graph</h2>
          <p style={styles.subtitle}>
            Multi-relational graph linking Accused, Victims, FIR Cases, and Jurisdictional Districts
          </p>
        </div>

        <form onSubmit={handleSubmit} style={styles.searchForm}>
          <input
            type="text"
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            placeholder="Search Accused Name or FIR No..."
            style={styles.searchInput}
          />
          <button type="submit" disabled={loading} style={styles.searchBtn}>
            {loading ? 'Analyzing...' : 'Load Network'}
          </button>
        </form>
      </div>

      <div style={styles.graphWrapper}>
        {(!graphData.nodes || graphData.nodes.length === 0) ? (
          <div style={styles.emptyState}>
            <span style={{ fontSize: '28px' }}>🔍</span>
            <h3 style={{ margin: '8px 0 4px 0', color: '#E6EDF3' }}>No connections found</h3>
            <p style={{ margin: 0, color: '#8B949E' }}>
              No graph relationships found matching "{searchVal}". Try searching "Suresh Gowda" or "Raju Kumar".
            </p>
          </div>
        ) : (
          <div ref={containerRef} style={styles.graphElement} />
        )}

        {/* Graph Legend */}
        <div style={styles.legend}>
          <div style={styles.legendTitle}>NODE ENTITY LEGEND</div>
          <div style={styles.legendRow}>
            <span style={styles.legendShapeRect('#00D4FF')} />
            <span>CaseMaster (FIR Case)</span>
          </div>
          <div style={styles.legendRow}>
            <span style={styles.legendShapeCircle('#FF4444')} />
            <span>Accused Person</span>
          </div>
          <div style={styles.legendRow}>
            <span style={styles.legendShapeCircle('#FFB347')} />
            <span>Victim Record</span>
          </div>
          <div style={styles.legendRow}>
            <span style={styles.legendShapeDiamond('#00CC88')} />
            <span>District / Station</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    backgroundColor: '#161B22',
    border: '1px solid #30363D',
    borderRadius: '10px',
    padding: '20px',
    margin: '20px 0'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '15px',
    marginBottom: '15px'
  },
  title: {
    margin: 0,
    fontSize: '18px',
    color: '#00D4FF'
  },
  subtitle: {
    margin: '4px 0 0 0',
    fontSize: '13px',
    color: '#8B949E'
  },
  searchForm: {
    display: 'flex',
    gap: '8px'
  },
  searchInput: {
    backgroundColor: '#0D1117',
    border: '1px solid #30363D',
    borderRadius: '6px',
    padding: '8px 14px',
    color: '#E6EDF3',
    fontSize: '13px',
    minWidth: '220px'
  },
  searchBtn: {
    backgroundColor: '#00D4FF',
    color: '#0D1117',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 16px',
    fontWeight: 'bold',
    cursor: 'pointer'
  },
  graphWrapper: {
    position: 'relative',
    height: '520px',
    backgroundColor: '#0D1117',
    border: '1px solid #30363D',
    borderRadius: '8px',
    overflow: 'hidden'
  },
  graphElement: {
    width: '100%',
    height: '100%'
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    textAlign: 'center',
    padding: '20px'
  },
  legend: {
    position: 'absolute',
    bottom: '20px',
    left: '20px',
    backgroundColor: 'rgba(22, 27, 34, 0.92)',
    border: '1px solid #30363D',
    borderRadius: '6px',
    padding: '12px',
    zIndex: 100
  },
  legendTitle: {
    fontSize: '11px',
    fontWeight: 'bold',
    color: '#E6EDF3',
    marginBottom: '8px'
  },
  legendRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '12px',
    color: '#8B949E',
    marginBottom: '6px'
  },
  legendShapeRect: (color) => ({
    width: '14px',
    height: '10px',
    border: `2px solid ${color}`,
    display: 'inline-block'
  }),
  legendShapeCircle: (color) => ({
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    backgroundColor: color,
    display: 'inline-block'
  }),
  legendShapeDiamond: (color) => ({
    width: '10px',
    height: '10px',
    backgroundColor: color,
    transform: 'rotate(45deg)',
    display: 'inline-block'
  })
};
