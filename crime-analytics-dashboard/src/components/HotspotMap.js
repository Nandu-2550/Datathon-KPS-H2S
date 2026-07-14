import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';

const API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:3000/server/datathon_kps_h_2_s_function'
  : '/server/datathon_kps_h_2_s_function';

const FALLBACK_HOTSPOTS = [
  {
    CrimeNo: '104430006202600001',
    latitude: 12.9784,
    longitude: 77.6408,
    CrimeGroupName: 'Theft / Chain Snatching',
    DistrictName: 'Bengaluru City',
    BriefFacts: 'Gold chain snatching near Indiranagar 100ft road around 8:30 PM.'
  },
  {
    CrimeNo: '104430006202600005',
    latitude: 12.9716,
    longitude: 77.5946,
    CrimeGroupName: 'Assault / Bodily Offence',
    DistrictName: 'Bengaluru City',
    BriefFacts: 'Physical altercation and assault reported on Brigade Road.'
  },
  {
    CrimeNo: '104430006202600007',
    latitude: 12.9250,
    longitude: 77.5938,
    CrimeGroupName: 'Robbery / Extortion',
    DistrictName: 'Bengaluru South',
    BriefFacts: 'Armed robbery attempt at a jewellery store in Jayanagar 4th Block.'
  },
  {
    CrimeNo: '104430006202600013',
    latitude: 12.3051,
    longitude: 76.6551,
    CrimeGroupName: 'Cybercrime / Financial Fraud',
    DistrictName: 'Mysuru City',
    BriefFacts: 'Counterfeit currency circulation detected in Devaraja limits.'
  },
  {
    CrimeNo: '104430006202600019',
    latitude: 15.3647,
    longitude: 75.1240,
    CrimeGroupName: 'Assault / Bodily Offence',
    DistrictName: 'Hubballi-Dharwad',
    BriefFacts: 'Vandalism of public infrastructure along Hubballi bypass.'
  }
];

function getCrimeColor(crimeType) {
  const lower = (crimeType || '').toLowerCase();
  if (lower.includes('robbery') || lower.includes('extortion') || lower.includes('murder')) {
    return '#FF4444'; // Red
  }
  if (lower.includes('theft') || lower.includes('snatching') || lower.includes('burglary')) {
    return '#00D4FF'; // Cyan
  }
  if (lower.includes('assault') || lower.includes('bodily')) {
    return '#FFB347'; // Amber
  }
  return '#8B949E'; // Default Gray
}

export default function HotspotMap() {
  const mapRef = useRef(null);
  const leafletInstance = useRef(null);
  const [loading, setLoading] = useState(true);
  const [hotspots, setHotspots] = useState([]);

  useEffect(() => {
    async function fetchHotspots() {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/analytics/hotspots`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (json && Array.isArray(json.data) && json.data.length > 0) {
          setHotspots(json.data);
        } else {
          setHotspots(FALLBACK_HOTSPOTS);
        }
      } catch (err) {
        console.warn('Hotspot map fetch fallback applied:', err.message);
        setHotspots(FALLBACK_HOTSPOTS);
      } finally {
        setLoading(false);
      }
    }
    fetchHotspots();
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;

    if (leafletInstance.current) {
      leafletInstance.current.remove();
      leafletInstance.current = null;
    }

    const map = L.map(mapRef.current).setView([14.5, 75.7], 7);
    leafletInstance.current = map;

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(map);

    hotspots.forEach((item) => {
      const lat = parseFloat(item.latitude);
      const lng = parseFloat(item.longitude);
      if (isNaN(lat) || isNaN(lng)) return;

      const type = item.CrimeGroupName || 'General Crime';
      const color = getCrimeColor(type);

      const marker = L.circleMarker([lat, lng], {
        radius: 8,
        fillColor: color,
        color: '#0D1117',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.85
      }).addTo(map);

      const popupHtml = `
        <div style="font-family: Arial, sans-serif; background: #0D1117; color: #E6EDF3; padding: 6px; border-radius: 4px; min-width: 200px;">
          <div style="color: #00D4FF; font-weight: bold; margin-bottom: 4px;">FIR #${item.CrimeNo || 'UNKNOWN'}</div>
          <div style="font-size: 12px; color: #FFB347; margin-bottom: 4px;"><strong>Type:</strong> ${type}</div>
          <div style="font-size: 12px; color: #00CC88; margin-bottom: 6px;"><strong>District:</strong> ${item.DistrictName || 'Karnataka'}</div>
          <div style="font-size: 11px; color: #8B949E; border-top: 1px solid #30363D; padding-top: 4px;">${(item.BriefFacts || 'No brief facts documented.').slice(0, 120)}...</div>
        </div>
      `;
      marker.bindPopup(popupHtml);
    });

    return () => {
      if (leafletInstance.current) {
        leafletInstance.current.remove();
        leafletInstance.current = null;
      }
    };
  }, [hotspots]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>📍 Geospatial Crime Hotspot Intelligence Map</h2>
          <p style={styles.subtitle}>
            Real-time Karnataka State Police Incident Mapping ({hotspots.length} geocoded incidents loaded)
          </p>
        </div>
        {loading && <div style={styles.loadingTag}>⌛ Loading Hotspots...</div>}
      </div>

      <div style={styles.mapWrapper}>
        <div ref={mapRef} style={styles.mapElement} />

        {/* Legend */}
        <div style={styles.legend}>
          <div style={styles.legendTitle}>CRIME SEVERITY LEGEND</div>
          <div style={styles.legendRow}>
            <span style={styles.legendDot('#FF4444')} />
            <span>Robbery / Violent Crime</span>
          </div>
          <div style={styles.legendRow}>
            <span style={styles.legendDot('#00D4FF')} />
            <span>Theft / Burglary</span>
          </div>
          <div style={styles.legendRow}>
            <span style={styles.legendDot('#FFB347')} />
            <span>Assault / Bodily Offence</span>
          </div>
          <div style={styles.legendRow}>
            <span style={styles.legendDot('#8B949E')} />
            <span>Other Offence</span>
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
  loadingTag: {
    backgroundColor: '#0f172a',
    border: '1px solid #00D4FF',
    color: '#00D4FF',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '12px'
  },
  mapWrapper: {
    position: 'relative',
    height: '520px',
    border: '1px solid #30363D',
    borderRadius: '8px',
    overflow: 'hidden'
  },
  mapElement: {
    width: '100%',
    height: '100%'
  },
  legend: {
    position: 'absolute',
    bottom: '20px',
    right: '20px',
    backgroundColor: 'rgba(13, 17, 23, 0.92)',
    border: '1px solid #30363D',
    borderRadius: '6px',
    padding: '12px',
    zIndex: 1000,
    boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
  },
  legendTitle: {
    fontSize: '11px',
    fontWeight: 'bold',
    color: '#E6EDF3',
    marginBottom: '8px',
    letterSpacing: '0.5px'
  },
  legendRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '12px',
    color: '#8B949E',
    marginBottom: '6px'
  },
  legendDot: (color) => ({
    display: 'inline-block',
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    backgroundColor: color
  })
};
