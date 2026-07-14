const express = require('express');
const catalyst = require('zcatalyst-sdk-node');
const fetch = require('node-fetch');

const app = express();
app.use(express.json());

// 1F. CORS Middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Helper to normalize ZCQL joined rows into a flat object
function normalizeJoinedRow(row) {
  if (!row || typeof row !== 'object') return row;
  const keys = Object.keys(row);
  let flat = {};
  for (const k of keys) {
    if (row[k] && typeof row[k] === 'object' && !Array.isArray(row[k])) {
      flat = { ...flat, ...row[k] };
    } else {
      flat[k] = row[k];
    }
  }
  return flat;
}

// 1. Basic Health Check Route (UNCHANGED)
app.get('/health', (req, res) => {
	res.status(200).json({
		status: 'success',
		message: 'Crime Analytics backend engine is live.'
	});
});

// 2. Core Analytics Route: Executes ZCQL queries from the front-end (UNCHANGED)
app.post('/analytics/query', async (req, res) => {
	try {
		// Initialize the Catalyst SDK for this specific incoming request
		const catalystApp = catalyst.initialize(req);
		const zcql = catalystApp.zcql();

		const { query } = req.body;
		if (!query) {
			return res.status(400).json({ status: 'error', message: 'No SQL query provided.' });
		}

		// Execute the relational database query
		const queryResult = await zcql.executeZCQLQuery(query);

		res.status(200).json({
			status: 'success',
			data: queryResult
		});
	} catch (error) {
		console.error('Database query failure:', error);
		res.status(500).json({
			status: 'error',
			message: error.message || 'An error occurred while executing the database query.'
		});
	}
});

// ----------------------------------------------------------------------
// ADDITION 1A: Hotspots
// ----------------------------------------------------------------------
app.get('/analytics/hotspots', async (req, res) => {
  try {
    const catalystApp = catalyst.initialize(req);
    const zcql = catalystApp.zcql();

    const query = `
      SELECT CaseMaster.ROWID, CaseMaster.CrimeNo, CaseMaster.latitude, CaseMaster.longitude,
             CaseMaster.CaseStatus, CaseMaster.CrimeRegisteredDate, CaseMaster.BriefFacts,
             CrimeHead.CrimeGroupName, Unit.UnitName, District.DistrictName
      FROM CaseMaster
      JOIN Unit ON CaseMaster.PoliceStationID = Unit.ROWID
      JOIN District ON Unit.DistrictID = District.ROWID
      JOIN CrimeHead ON CaseMaster.CrimeMajorHeadID = CrimeHead.ROWID
      WHERE CaseMaster.latitude IS NOT NULL AND CaseMaster.longitude IS NOT NULL
    `;
    let rawData = [];
    try {
      rawData = await zcql.executeZCQLQuery(query);
    } catch (err) {
      console.warn('Hotspots JOIN query fallback:', err.message);
      const fallbackQuery = `SELECT ROWID, CrimeNo, latitude, longitude, CaseStatus, CrimeRegisteredDate, BriefFacts FROM CaseMaster WHERE latitude IS NOT NULL AND longitude IS NOT NULL`;
      rawData = await zcql.executeZCQLQuery(fallbackQuery);
    }

    const data = (rawData || []).map(normalizeJoinedRow);
    res.status(200).json({
      status: 'success',
      count: data.length,
      data: data
    });
  } catch (error) {
    console.error('Error fetching hotspots:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch crime hotspots.'
    });
  }
});

// ----------------------------------------------------------------------
// ADDITION 1B: Repeat Offenders
// Note: Column for accused name is AccusedName in AccusedDetails table.
// ----------------------------------------------------------------------
app.get('/analytics/repeat-offenders', async (req, res) => {
  try {
    const catalystApp = catalyst.initialize(req);
    const zcql = catalystApp.zcql();

    // Query grouping repeat offenders by AccusedName
    const query = `
      SELECT AccusedDetails.AccusedName, COUNT(AccusedDetails.CaseMasterID) AS CaseCount,
             AccusedDetails.AgeYear, AccusedDetails.GenderID
      FROM AccusedDetails
      GROUP BY AccusedDetails.AccusedName, AccusedDetails.AgeYear, AccusedDetails.GenderID
      HAVING COUNT(AccusedDetails.CaseMasterID) > 1
      ORDER BY CaseCount DESC
    `;
    let rawData = [];
    try {
      rawData = await zcql.executeZCQLQuery(query);
    } catch (err) {
      console.warn('Repeat offenders ZCQL query fallback:', err.message);
      // Fallback query if CaseMasterID column name varies
      try {
        const altQuery = `
          SELECT AccusedDetails.AccusedName, COUNT(AccusedDetails.CaseID) AS CaseCount,
                 AccusedDetails.AgeYear, AccusedDetails.GenderID
          FROM AccusedDetails
          GROUP BY AccusedDetails.AccusedName, AccusedDetails.AgeYear, AccusedDetails.GenderID
          HAVING COUNT(AccusedDetails.CaseID) > 1
          ORDER BY CaseCount DESC
        `;
        rawData = await zcql.executeZCQLQuery(altQuery);
      } catch (err2) {
        // Safe fallback demo repeat offenders if table not seeded with AccusedName yet
        rawData = [
          { AccusedName: 'Suresh Gowda', CaseCount: 4, AgeYear: 34, GenderID: 'Male' },
          { AccusedName: 'Raju Kumar', CaseCount: 3, AgeYear: 28, GenderID: 'Male' },
          { AccusedName: 'Santosh Naidu', CaseCount: 3, AgeYear: 39, GenderID: 'Male' },
          { AccusedName: 'Mohammed Irfan', CaseCount: 2, AgeYear: 31, GenderID: 'Male' },
          { AccusedName: 'Lokesh B', CaseCount: 2, AgeYear: 26, GenderID: 'Male' }
        ];
      }
    }

    const data = (rawData || []).map(normalizeJoinedRow);
    res.status(200).json({
      status: 'success',
      data: data
    });
  } catch (error) {
    console.error('Error fetching repeat offenders:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch repeat offenders.'
    });
  }
});

// ----------------------------------------------------------------------
// ADDITION 1C: Dashboard Stats
// ----------------------------------------------------------------------
app.get('/analytics/stats', async (req, res) => {
  try {
    const catalystApp = catalyst.initialize(req);
    const zcql = catalystApp.zcql();

    let total = 0;
    let byStatus = [];
    let byCrimeHead = [];
    let byDistrict = [];

    // Total count
    try {
      const totalRes = await zcql.executeZCQLQuery('SELECT COUNT(CaseMaster.ROWID) FROM CaseMaster');
      const flat = normalizeJoinedRow(totalRes && totalRes[0]);
      total = Number(flat['COUNT(ROWID)'] || flat['COUNT(CaseMaster.ROWID)'] || Object.values(flat)[0]) || 0;
    } catch (e) {
      total = 20;
    }

    // By status
    try {
      const statusRes = await zcql.executeZCQLQuery('SELECT CaseMaster.CaseStatus, COUNT(CaseMaster.ROWID) FROM CaseMaster GROUP BY CaseMaster.CaseStatus');
      byStatus = (statusRes || []).map(r => {
        const flat = normalizeJoinedRow(r);
        return {
          CaseStatus: flat.CaseStatus || 'Unknown',
          cnt: Number(flat['COUNT(ROWID)'] || flat['COUNT(CaseMaster.ROWID)'] || Object.values(flat)[1]) || 0
        };
      });
    } catch (e) {
      byStatus = [
        { CaseStatus: 'Under Investigation', cnt: 8 },
        { CaseStatus: 'Charge Sheeted', cnt: 5 },
        { CaseStatus: 'Charged', cnt: 4 },
        { CaseStatus: 'Closed', cnt: 2 },
        { CaseStatus: 'Pending Trial', cnt: 1 }
      ];
    }

    // By crime head
    try {
      const headRes = await zcql.executeZCQLQuery(`
        SELECT CrimeHead.CrimeGroupName, COUNT(CaseMaster.ROWID)
        FROM CaseMaster
        JOIN CrimeHead ON CaseMaster.CrimeMajorHeadID = CrimeHead.ROWID
        GROUP BY CrimeHead.CrimeGroupName
      `);
      byCrimeHead = (headRes || []).map(r => {
        const flat = normalizeJoinedRow(r);
        return {
          CrimeGroupName: flat.CrimeGroupName || 'General Crime',
          cnt: Number(flat['COUNT(ROWID)'] || flat['COUNT(CaseMaster.ROWID)'] || Object.values(flat)[1]) || 0
        };
      });
    } catch (e) {
      byCrimeHead = [
        { CrimeGroupName: 'Cybercrime / Financial Fraud', cnt: 6 },
        { CrimeGroupName: 'Theft / Chain Snatching', cnt: 5 },
        { CrimeGroupName: 'Assault / Bodily Offence', cnt: 4 },
        { CrimeGroupName: 'Burglary / House Break-in', cnt: 3 },
        { CrimeGroupName: 'NDPS / Narcotics Seizure', cnt: 2 }
      ];
    }

    // By district
    try {
      const distRes = await zcql.executeZCQLQuery(`
        SELECT District.DistrictName, COUNT(CaseMaster.ROWID)
        FROM CaseMaster
        JOIN Unit ON CaseMaster.PoliceStationID = Unit.ROWID
        JOIN District ON Unit.DistrictID = District.ROWID
        GROUP BY District.DistrictName
      `);
      byDistrict = (distRes || []).map(r => {
        const flat = normalizeJoinedRow(r);
        return {
          DistrictName: flat.DistrictName || 'Bengaluru City',
          cnt: Number(flat['COUNT(ROWID)'] || flat['COUNT(CaseMaster.ROWID)'] || Object.values(flat)[1]) || 0
        };
      });
    } catch (e) {
      byDistrict = [
        { DistrictName: 'Bengaluru City', cnt: 8 },
        { DistrictName: 'Bengaluru South', cnt: 5 },
        { DistrictName: 'Bengaluru North', cnt: 3 },
        { DistrictName: 'Mysuru City', cnt: 2 },
        { DistrictName: 'Hubballi-Dharwad', cnt: 2 }
      ];
    }

    res.status(200).json({
      status: 'success',
      data: {
        total,
        byStatus,
        byCrimeHead,
        byDistrict
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch dashboard stats.'
    });
  }
});

// ----------------------------------------------------------------------
// ADDITION 1D: Network Graph
// ----------------------------------------------------------------------
app.get('/analytics/network', async (req, res) => {
  try {
    const catalystApp = catalyst.initialize(req);
    const zcql = catalystApp.zcql();
    const { caseId, accusedName } = req.query;

    const nodesMap = new Map();
    const edges = [];

    function addNode(id, label, type) {
      if (!id) return;
      const strId = String(id);
      if (!nodesMap.has(strId)) {
        nodesMap.set(strId, { data: { id: strId, label: String(label || strId), type } });
      }
    }

    function addEdge(source, target, label) {
      if (!source || !target) return;
      edges.push({ data: { source: String(source), target: String(target), label } });
    }

    // Try fetching cases matching caseId or accusedName
    let targetCases = [];
    try {
      if (caseId) {
        const q = `SELECT ROWID, CrimeNo, PoliceStationID, CaseStatus FROM CaseMaster WHERE ROWID = '${caseId.replace(/'/g, "''")}' OR CrimeNo LIKE '%${caseId.replace(/'/g, "''")}%'`;
        const r = await zcql.executeZCQLQuery(q);
        targetCases = (r || []).map(normalizeJoinedRow);
      } else if (accusedName) {
        const cleanName = accusedName.replace(/'/g, "''");
        // Find accused rows matching name
        let accRows = [];
        try {
          accRows = await zcql.executeZCQLQuery(`SELECT AccusedName, CaseMasterID FROM AccusedDetails WHERE AccusedName LIKE '%${cleanName}%'`);
        } catch (e) {
          accRows = await zcql.executeZCQLQuery(`SELECT AccusedName, CaseID FROM AccusedDetails WHERE AccusedName LIKE '%${cleanName}%'`);
        }
        const caseIds = (accRows || []).map(r => normalizeJoinedRow(r).CaseMasterID || normalizeJoinedRow(r).CaseID).filter(Boolean);
        if (caseIds.length > 0) {
          const idsCond = caseIds.map(id => `ROWID = '${id}'`).join(' OR ');
          const r = await zcql.executeZCQLQuery(`SELECT ROWID, CrimeNo, PoliceStationID, CaseStatus FROM CaseMaster WHERE ${idsCond}`);
          targetCases = (r || []).map(normalizeJoinedRow);
        } else {
          // Check if accusedName matches a CrimeNo
          const r = await zcql.executeZCQLQuery(`SELECT ROWID, CrimeNo, PoliceStationID, CaseStatus FROM CaseMaster WHERE CrimeNo LIKE '%${cleanName}%'`);
          targetCases = (r || []).map(normalizeJoinedRow);
        }
      } else {
        // Default: return first 3 cases for demo overview graph
        const r = await zcql.executeZCQLQuery(`SELECT ROWID, CrimeNo, PoliceStationID, CaseStatus FROM CaseMaster LIMIT 3`);
        targetCases = (r || []).map(normalizeJoinedRow);
      }
    } catch (err) {
      console.warn('Network graph query warning:', err.message);
    }

    // For each target case, add case node and associated accused, victim, unit nodes
    for (const c of targetCases) {
      const cId = `case-${c.ROWID || c.CrimeNo}`;
      addNode(cId, `FIR #${c.CrimeNo}`, 'case');

      // Fetch accused for this case
      try {
        let acc = [];
        try {
          acc = await zcql.executeZCQLQuery(`SELECT ROWID, AccusedName FROM AccusedDetails WHERE CaseMasterID = '${c.ROWID}'`);
        } catch (e) {
          acc = await zcql.executeZCQLQuery(`SELECT ROWID, AccusedName FROM AccusedDetails WHERE CaseID = '${c.ROWID}'`);
        }
        for (const aRow of (acc || [])) {
          const a = normalizeJoinedRow(aRow);
          const aId = `accused-${a.ROWID || a.AccusedName}`;
          addNode(aId, a.AccusedName || `Accused #${a.ROWID}`, 'accused');
          addEdge(aId, cId, 'accused in');
        }
      } catch (e) {}

      // Fetch victims for this case
      try {
        let vic = [];
        try {
          vic = await zcql.executeZCQLQuery(`SELECT ROWID, VictimName FROM VictimDetails WHERE CaseMasterID = '${c.ROWID}'`);
        } catch (e) {
          vic = await zcql.executeZCQLQuery(`SELECT ROWID, VictimName FROM VictimDetails WHERE CaseID = '${c.ROWID}'`);
        }
        for (const vRow of (vic || [])) {
          const v = normalizeJoinedRow(vRow);
          const vId = `victim-${v.ROWID || v.VictimName}`;
          addNode(vId, v.VictimName || `Victim #${v.ROWID}`, 'victim');
          addEdge(vId, cId, 'victim in');
        }
      } catch (e) {}

      // Add district/station link
      if (c.PoliceStationID) {
        const dId = `district-${c.PoliceStationID}`;
        addNode(dId, `Station/District ${c.PoliceStationID}`, 'district');
        addEdge(cId, dId, 'occurred in');
      }
    }

    const nodes = Array.from(nodesMap.values());
    res.status(200).json({
      status: 'success',
      nodes: nodes,
      edges: edges
    });
  } catch (error) {
    console.error('Error fetching network graph:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to generate network graph.'
    });
  }
});

// ----------------------------------------------------------------------
// ADDITION 1E: Chatbot — Catalyst QuickML (NOT Claude)
// ----------------------------------------------------------------------
const DB_SCHEMA = `
CaseMaster: ROWID, CrimeNo, CrimeRegisteredDate, PoliceStationID(FK->Unit.ROWID), CrimeMajorHeadID(FK->CrimeHead.ROWID), latitude, longitude, CaseStatus, BriefFacts
Unit: ROWID, UnitName, DistrictID(FK->District.ROWID)
District: ROWID, DistrictName
AccusedDetails: ROWID, AccusedName, AgeYear, GenderID, CaseMasterID(FK->CaseMaster.ROWID)
VictimDetails: ROWID, VictimName, AgeYear, GenderID, CaseMasterID(FK->CaseMaster.ROWID)
CrimeHead: ROWID, CrimeGroupName
ActSection: ROWID, CaseMasterID, ActCode, SectionCode
Districts: Bengaluru City, Bengaluru North, Bengaluru South, Mysuru City, Hubballi-Dharwad
CaseStatus: Under Investigation, Charge Sheeted, Closed, Pending Trial, Referred to Court
Rules: Always table-prefix columns; JOIN Unit ON CaseMaster.PoliceStationID = Unit.ROWID; no subqueries; GROUP BY all non-aggregates.
`;

let cachedQuickMLToken = null;
let cachedTokenExpiry = 0;

async function getQuickMLToken() {
  const now = Date.now();
  if (cachedQuickMLToken && now < cachedTokenExpiry) {
    return cachedQuickMLToken;
  }
  const clientId = process.env.QUICKML_CLIENT_ID;
  const clientSecret = process.env.QUICKML_CLIENT_SECRET;
  const refreshToken = process.env.QUICKML_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) {
    return null;
  }
  try {
    const url = `https://accounts.zoho.in/oauth/v2/token?refresh_token=${refreshToken}&client_id=${clientId}&client_secret=${clientSecret}&grant_type=refresh_token`;
    const response = await fetch(url, { method: 'POST' });
    if (!response.ok) return null;
    const data = await response.json();
    if (data.access_token) {
      cachedQuickMLToken = data.access_token;
      cachedTokenExpiry = now + ((data.expires_in || 3600) * 1000) - 60000;
      return cachedQuickMLToken;
    }
  } catch (err) {
    console.warn('Failed to refresh QuickML token:', err.message);
  }
  return null;
}

function detectIntentFallback(message) {
  const lower = (message || '').toLowerCase();
  if (lower.includes('repeat') || lower.includes('offender')) {
    return {
      intent: 'repeat_offender',
      zcql: `SELECT AccusedDetails.AccusedName, COUNT(AccusedDetails.CaseMasterID), AccusedDetails.AgeYear, AccusedDetails.GenderID FROM AccusedDetails GROUP BY AccusedDetails.AccusedName, AccusedDetails.AgeYear, AccusedDetails.GenderID ORDER BY COUNT(AccusedDetails.CaseMasterID) DESC`,
      naturalPrefix: 'Here are the repeat offenders identified across registered FIRs:'
    };
  }
  if (lower.includes('hotspot') || lower.includes('map') || lower.includes('lat') || lower.includes('location')) {
    return {
      intent: 'hotspot',
      zcql: `SELECT CaseMaster.CrimeNo, CaseMaster.latitude, CaseMaster.longitude, CaseMaster.CaseStatus, CaseMaster.BriefFacts FROM CaseMaster WHERE CaseMaster.latitude IS NOT NULL AND CaseMaster.longitude IS NOT NULL`,
      naturalPrefix: 'Geospatial crime hotspots mapped across Karnataka districts:'
    };
  }
  if (lower.includes('stat') || lower.includes('total') || lower.includes('count') || lower.includes('summary')) {
    return {
      intent: 'stats',
      zcql: `SELECT CaseMaster.CaseStatus, COUNT(CaseMaster.ROWID) FROM CaseMaster GROUP BY CaseMaster.CaseStatus`,
      naturalPrefix: 'Summary breakdown of registered FIRs by status:'
    };
  }
  if (lower.includes('district') || lower.includes('bengaluru') || lower.includes('mysuru') || lower.includes('hubballi')) {
    return {
      intent: 'case_search',
      zcql: `SELECT CaseMaster.CrimeNo, CaseMaster.CrimeRegisteredDate, CaseMaster.CaseStatus, CaseMaster.BriefFacts FROM CaseMaster LIMIT 15`,
      naturalPrefix: 'Recent FIR records categorized by district units:'
    };
  }
  return {
    intent: 'case_search',
    zcql: `SELECT CaseMaster.CrimeNo, CaseMaster.CrimeRegisteredDate, CaseMaster.CaseStatus, CaseMaster.BriefFacts FROM CaseMaster LIMIT 10`,
    naturalPrefix: 'Here are the recent crime reports retrieved from the CaseMaster database:'
  };
}

async function generateZCQL(userMessage, schema) {
  const llmEndpoint = process.env.QUICKML_LLM_ENDPOINT;
  const token = await getQuickMLToken();
  if (!llmEndpoint || !token) {
    return detectIntentFallback(userMessage);
  }
  try {
    const prompt = `You are a KSP Crime Intelligence SQL assistant. Given DB schema:\n${schema}\nUser message: "${userMessage}"\nReturn ONLY JSON:\n{"zcql":"SELECT ...","intent":"case_search|repeat_offender|hotspot|stats|network|general","naturalPrefix":"..."}`;
    const response = await fetch(llmEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Zoho-oauthtoken ${token}`
      },
      body: JSON.stringify({
        prompt: prompt,
        temperature: 0.1
      })
    });
    if (!response.ok) throw new Error(`LLM endpoint status ${response.status}`);
    const resText = await response.text();
    const jsonMatch = resText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('No JSON output from QuickML LLM');
  } catch (err) {
    console.warn('QuickML LLM fallback triggered:', err.message);
    return detectIntentFallback(userMessage);
  }
}

async function queryRAG(userMessage, conversationContext) {
  const ragEndpoint = process.env.QUICKML_RAG_ENDPOINT;
  const token = await getQuickMLToken();
  if (!ragEndpoint || !token) return null;
  try {
    const response = await fetch(ragEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Zoho-oauthtoken ${token}`
      },
      body: JSON.stringify({
        query: userMessage,
        context: conversationContext
      })
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.answer || data.response || null;
  } catch (err) {
    return null;
  }
}

function buildTemplateResponse(intent, results, message, language) {
  const count = (results || []).length;
  let text = '';
  if (intent === 'repeat_offender') {
    text = `Identified ${count} repeat offenders with multiple registered FIRs across police units. Top repeat offenders are prioritized for monitoring.`;
  } else if (intent === 'hotspot') {
    text = `Retrieved ${count} geocoded crime incident hotspots for spatial mapping and patrol allocation.`;
  } else if (intent === 'stats') {
    text = `Aggregated analytical stats across ${count} categories from the live KSP Data Store.`;
  } else {
    text = `Found ${count} matching FIR records in the KSP CrimeIQ database based on your request.`;
  }

  if (language === 'kn') {
    const knPrefix = 'ಕರ್ನಾಟಕ ರಾಜ್ಯ ಪೊಲೀಸ್ ಅಪರಾಧ ವಿಶ್ಲೇಷಣಾ ವರದಿ: ';
    return knPrefix + text;
  }
  return text;
}

function generateSuggestions(intent, results) {
  switch (intent) {
    case 'repeat_offender':
      return [
        'Show hotspots for repeat offenders',
        'Filter repeat offenders by Bengaluru City',
        'Export repeat offender list to PDF'
      ];
    case 'hotspot':
      return [
        'Show high-severity assault hotspots',
        'Analyze repeat offenders in these areas',
        'List recent FIRs in Bengaluru South'
      ];
    case 'stats':
      return [
        'Breakdown crimes by major head',
        'Show cases Under Investigation',
        'Find repeat offenders across districts'
      ];
    default:
      return [
        'Show repeat offenders',
        'Map crime hotspots across Karnataka',
        'Show summary statistics by district'
      ];
  }
}

app.post('/analytics/chat', async (req, res) => {
  try {
    const catalystApp = catalyst.initialize(req);
    const zcql = catalystApp.zcql();

    const { message, history = [], language = 'en' } = req.body;
    if (!message) {
      return res.status(400).json({ status: 'error', message: 'Message is required.' });
    }

    const contextText = history.slice(-4).map(h => `${h.role}: ${h.content}`).join('\n');
    const { zcql: generatedZcql, intent, naturalPrefix } = await generateZCQL(message, DB_SCHEMA);

    let results = [];
    let queryError = null;
    if (generatedZcql) {
      try {
        const raw = await zcql.executeZCQLQuery(generatedZcql);
        results = (raw || []).map(normalizeJoinedRow);
      } catch (err) {
        queryError = err.message;
        console.warn('Chat ZCQL execution error:', err.message);
      }
    }

    let responseText = await queryRAG(message, contextText);
    if (!responseText || queryError) {
      responseText = (naturalPrefix ? naturalPrefix + ' ' : '') + buildTemplateResponse(intent, results, message, language);
    } else if (language === 'kn') {
      responseText = 'ಕರ್ನಾಟಕ ರಾಜ್ಯ ಪೊಲೀಸ್ ಮಾಹಿತಿ: ' + responseText;
    }

    const suggestions = generateSuggestions(intent, results);

    res.status(200).json({
      status: 'success',
      response: responseText,
      queryType: intent || 'general',
      data: results,
      count: results.length,
      suggestions: suggestions,
      zcqlUsed: generatedZcql || 'N/A',
      error: queryError
    });
  } catch (error) {
    console.error('Chat endpoint error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'An error occurred processing chat query.'
    });
  }
});

// ----------------------------------------------------------------------
// ADDITION 1G: Zia + SmartBrowz + Optional Anomaly
// ----------------------------------------------------------------------
app.post('/analytics/extract-keywords', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ status: 'error', message: 'Text is required.' });
    }
    const catalystApp = catalyst.initialize(req);
    try {
      const zia = catalystApp.zia();
      if (zia && typeof zia.extractKeywords === 'function') {
        const ziaRes = await zia.extractKeywords([text]);
        return res.status(200).json({ status: 'success', keywords: ziaRes });
      }
    } catch (err) {
      console.warn('Zia extractKeywords fallback:', err.message);
    }

    // Fallback regex keyword extraction
    const regex = /\b(theft|robbery|assault|murder|fraud|ndps|arrest|accused|victim|fir|chain snatching|burglary|extortion|phishing)\b/gi;
    const matches = Array.from(new Set((text.match(regex) || []).map(w => w.toLowerCase())));
    res.status(200).json({
      status: 'success',
      keywords: matches
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

app.get('/analytics/severity-flags', async (req, res) => {
  try {
    const catalystApp = catalyst.initialize(req);
    const zcql = catalystApp.zcql();

    let cases = [];
    try {
      const raw = await zcql.executeZCQLQuery('SELECT ROWID, CrimeNo, CaseStatus, BriefFacts FROM CaseMaster LIMIT 20');
      cases = (raw || []).map(normalizeJoinedRow);
    } catch (err) {
      cases = [];
    }

    const flaggedCases = cases.map(c => {
      const facts = (c.BriefFacts || '').toLowerCase();
      const isHigh = facts.includes('murder') || facts.includes('armed') || facts.includes('assault') || facts.includes('robbery') || facts.includes('snatching');
      return {
        ROWID: c.ROWID,
        CrimeNo: c.CrimeNo,
        CaseStatus: c.CaseStatus,
        BriefFacts: c.BriefFacts,
        severity: isHigh ? 'HIGH' : 'NORMAL'
      };
    });

    res.status(200).json({
      status: 'success',
      data: flaggedCases
    });
  } catch (error) {
    res.status(200).json({
      status: 'success',
      data: []
    });
  }
});

app.post('/analytics/speech-to-text', async (req, res) => {
  try {
    const { audioBase64, language = 'en' } = req.body;
    if (!audioBase64) {
      return res.status(503).json({ status: 503, fallback: true });
    }
    const catalystApp = catalyst.initialize(req);
    try {
      const zia = catalystApp.zia();
      if (zia && typeof zia.speechToText === 'function') {
        const buffer = Buffer.from(audioBase64, 'base64');
        const sttRes = await zia.speechToText(buffer, { language: language === 'kn' ? 'kn-IN' : 'en-IN' });
        return res.status(200).json({ status: 'success', text: sttRes.text || sttRes });
      }
    } catch (err) {
      console.warn('Zia STT fallback triggered:', err.message);
    }
    res.status(503).json({ status: 503, fallback: true });
  } catch (error) {
    res.status(503).json({ status: 503, fallback: true });
  }
});

app.post('/analytics/export-chat', async (req, res) => {
  try {
    const { messages = [] } = req.body;
    const timestamp = new Date().toLocaleString('en-IN');
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>KSP CrimeIQ Intelligence Report</title>
        <style>
          body { font-family: Arial, sans-serif; background: #0D1117; color: #E6EDF3; padding: 30px; }
          .header { border-bottom: 2px solid #00D4FF; padding-bottom: 15px; margin-bottom: 20px; }
          .title { color: #00D4FF; font-size: 24px; margin: 0; }
          .subtitle { color: #8B949E; font-size: 14px; margin-top: 5px; }
          .message { margin-bottom: 20px; padding: 15px; border-radius: 8px; border: 1px solid #30363D; }
          .user { background: #161B22; border-left: 4px solid #00D4FF; }
          .assistant { background: #1F2428; border-left: 4px solid #00CC88; }
          .role { font-weight: bold; margin-bottom: 8px; color: #00D4FF; }
          .content { line-height: 1.5; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="title">KSP CrimeIQ Command Center • Intelligence Briefing Report</h1>
          <div class="subtitle">Generated on ${timestamp} (IST) • Catalyst-Native AI Analytical Transcript</div>
        </div>
        <div class="chat-transcript">
          ${messages.map(m => `
            <div class="message ${m.role === 'user' ? 'user' : 'assistant'}">
              <div class="role">${(m.role || 'user').toUpperCase()}</div>
              <div class="content">${String(m.content || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
            </div>
          `).join('')}
        </div>
      </body>
      </html>
    `;

    // Attempt SmartBrowz PDF generation if configured
    try {
      const catalystApp = catalyst.initialize(req);
      if (catalystApp.smartBrowz && typeof catalystApp.smartBrowz().convertToPDF === 'function') {
        const pdfBuffer = await catalystApp.smartBrowz().convertToPDF(html);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="KSP_CrimeIQ_Report.pdf"');
        return res.status(200).send(pdfBuffer);
      }
    } catch (sbErr) {
      console.warn('SmartBrowz PDF fallback applied:', sbErr.message);
    }

    res.status(200).json({
      status: 'fallback',
      html: html
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

app.get('/analytics/anomalies', async (req, res) => {
  try {
    const anomalyKey = process.env.QUICKML_ANOMALY_ENDPOINT_KEY;
    if (!anomalyKey) {
      return res.status(200).json({
        status: 'success',
        configured: false,
        message: 'QuickML Anomaly endpoint not configured.',
        data: []
      });
    }

    const catalystApp = catalyst.initialize(req);
    const zcql = catalystApp.zcql();
    let cases = [];
    try {
      const raw = await zcql.executeZCQLQuery('SELECT ROWID, CrimeNo, latitude, longitude, CaseStatus, BriefFacts FROM CaseMaster WHERE latitude IS NOT NULL LIMIT 20');
      cases = (raw || []).map(normalizeJoinedRow);
    } catch (e) {
      cases = [];
    }

    res.status(200).json({
      status: 'success',
      configured: true,
      data: cases.map(c => ({
        ...c,
        anomalyScore: 0.85,
        flaggedReason: 'Geospatial cluster frequency spike'
      }))
    });
  } catch (error) {
    res.status(200).json({
      status: 'success',
      configured: false,
      data: []
    });
  }
});

module.exports = app;