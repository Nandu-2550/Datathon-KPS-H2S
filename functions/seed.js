const path = require('path');

process.env.X_ZOHO_CATALYST_CONSOLE_URL = 'https://api.catalyst.zoho.in';
process.env.X_ZOHO_CATALYST_ACCOUNTS_URL = 'https://accounts.zoho.in';

// Helper to initialize Catalyst App whether running in Catalyst serverless or local CLI terminal
async function getCatalystApp() {
  let catalyst;
  try {
    catalyst = require('zcatalyst-sdk-node');
  } catch (err) {
    catalyst = require('./datathon_kps_h_2_s_function/node_modules/zcatalyst-sdk-node');
  }

  if (process.env.CATALYST_CONFIG) {
    return catalyst.initializeApp();
  }

  try {
    const storePath = 'C:/Users/Nandeesh/AppData/Roaming/npm/node_modules/zcatalyst-cli/lib/util_modules/config-store.js';
    const credPath = 'C:/Users/Nandeesh/AppData/Roaming/npm/node_modules/zcatalyst-cli/lib/authentication/credential.js';
    const store = require(storePath).default;
    store.changeStore('cli');
    const Credential = require(credPath).default;
    Credential.init(store.get('in.credential'));
    const token = await Credential.getAccessToken();

    return catalyst.initialize({
      headers: {
        'x-zc-projectid': '47942000000035001',
        'x-zc-project-key': '47942000000035001',
        'x-zc-environment': 'Development',
        'x-zc-project-domain': 'api.catalyst.zoho.in',
        'x-zc-admin-cred-type': 'token',
        'x-zc-admin-cred-token': token,
        'x-zc-user-cred-type': 'token',
        'x-zc-user-cred-token': token,
        'x-zc-user-type': 'admin'
      }
    });
  } catch (e) {
    console.log('Falling back to standard catalyst.initialize()...');
    return catalyst.initialize();
  }
}

async function clearTable(app, tableName) {
  try {
    const table = app.datastore().table(tableName);
    const rowsRes = await table.getPagedRows({ maxRows: 100 });
    const rows = rowsRes.data || [];
    if (rows.length > 0) {
      const ids = rows.map(r => r.ROWID);
      await table.deleteRows(ids);
      console.log(`🧹 Cleared ${rows.length} existing records from ${tableName}.`);
    }
  } catch (err) {
    // Ignore errors if table already empty or query fails
  }
}

async function seedDatabase() {
  console.log('====================================================');
  console.log('🚀 KSP Crime Analytics Datathon - Data Seeding Utility');
  console.log('====================================================\n');

  const app = await getCatalystApp();
  console.log('✅ Connected to Catalyst Environment successfully.\n');

  // Step 1: Clean existing records to avoid duplicates
  console.log('📦 Cleaning existing sample records...');
  for (const t of ['AccusedDetails', 'VictimDetails', 'CaseMaster', 'Unit', 'District']) {
    await clearTable(app, t);
  }
  console.log();

  // Step 2: Seed District table
  console.log('🏛️ Seeding Police Districts...');
  const districtsData = [
    { DistrictName: 'Bengaluru City' },
    { DistrictName: 'Bengaluru North' },
    { DistrictName: 'Bengaluru South' },
    { DistrictName: 'Mysuru City' },
    { DistrictName: 'Hubballi-Dharwad' }
  ];

  const districtRows = [];
  for (const d of districtsData) {
    const row = await app.datastore().table('District').insertRow(d);
    districtRows.push(row);
  }
  console.log(`✅ Seeded ${districtRows.length} District records.`);

  // Step 3: Seed Unit table (Police Stations)
  console.log('🏢 Seeding Police Stations / Units...');
  const blrCityId = districtRows[0].ROWID;
  const blrNorthId = districtRows[1].ROWID;
  const blrSouthId = districtRows[2].ROWID;
  const mysuruId = districtRows[3].ROWID;
  const hubballiId = districtRows[4].ROWID;

  const unitsData = [
    { UnitName: 'Indiranagar Police Station', DistrictID: blrCityId },
    { UnitName: 'Koramangala Police Station', DistrictID: blrCityId },
    { UnitName: 'Whitefield Police Station', DistrictID: blrCityId },
    { UnitName: 'Cubbon Park Police Station', DistrictID: blrCityId },
    { UnitName: 'Jayanagar Police Station', DistrictID: blrSouthId },
    { UnitName: 'Malleswaram Police Station', DistrictID: blrNorthId },
    { UnitName: 'Devaraja Police Station', DistrictID: mysuruId },
    { UnitName: 'Suburban Police Station', DistrictID: hubballiId }
  ];

  const unitRows = [];
  for (const u of unitsData) {
    const row = await app.datastore().table('Unit').insertRow(u);
    unitRows.push(row);
  }
  console.log(`✅ Seeded ${unitRows.length} Police Station Unit records.`);

  // Step 4: Seed CaseMaster table (20 realistic Karnataka police FIRs)
  console.log('📁 Seeding CaseMaster (FIR Records)...');
  const firTemplates = [
    {
      CrimeNo: '104430006202600001',
      CrimeRegisteredDate: '2026-01-10',
      PoliceStationID: unitRows[0].ROWID,
      CrimeMajorHeadID: 101,
      latitude: 12.9784,
      longitude: 77.6408,
      CaseStatus: 'Under Investigation',
      BriefFacts: 'Complainant reported gold chain snatching near Indiranagar 100ft road around 8:30 PM by two unknown bike-borne assailants wearing helmets.'
    },
    {
      CrimeNo: '104430006202600002',
      CrimeRegisteredDate: '2026-01-18',
      PoliceStationID: unitRows[1].ROWID,
      CrimeMajorHeadID: 103,
      latitude: 12.9352,
      longitude: 77.6245,
      CaseStatus: 'Charged',
      BriefFacts: 'Online banking phishing scam where victim lost Rs 4.5 Lakhs after clicking a fraudulent KYC update link sent via SMS.'
    },
    {
      CrimeNo: '104430006202600003',
      CrimeRegisteredDate: '2026-01-25',
      PoliceStationID: unitRows[1].ROWID,
      CrimeMajorHeadID: 105,
      latitude: 12.9320,
      longitude: 77.6210,
      CaseStatus: 'Charge Sheeted',
      BriefFacts: 'House break-in reported at 3rd Block Koramangala residential apartment during weekend; gold ornaments weighing 120g and silver articles stolen.'
    },
    {
      CrimeNo: '104430006202600004',
      CrimeRegisteredDate: '2026-02-02',
      PoliceStationID: unitRows[2].ROWID,
      CrimeMajorHeadID: 101,
      latitude: 12.9698,
      longitude: 77.7500,
      CaseStatus: 'Under Investigation',
      BriefFacts: 'Vehicle theft of two-wheeler parked outside Whitefield IT Park gate number 2 between 10 AM and 6 PM.'
    },
    {
      CrimeNo: '104430006202600005',
      CrimeRegisteredDate: '2026-02-14',
      PoliceStationID: unitRows[3].ROWID,
      CrimeMajorHeadID: 104,
      latitude: 12.9716,
      longitude: 77.5946,
      CaseStatus: 'Pending Trial',
      BriefFacts: 'Physical altercation and assault reported between shopkeepers regarding commercial parking obstruction on Brigade Road.'
    },
    {
      CrimeNo: '104430006202600006',
      CrimeRegisteredDate: '2026-02-20',
      PoliceStationID: unitRows[3].ROWID,
      CrimeMajorHeadID: 106,
      latitude: 12.9750,
      longitude: 77.6010,
      CaseStatus: 'Charged',
      BriefFacts: 'Seizure of illicit narcotics (1.2 kg ganja) during night patrolling check near MG Road metro station.'
    },
    {
      CrimeNo: '104430006202600007',
      CrimeRegisteredDate: '2026-03-05',
      PoliceStationID: unitRows[4].ROWID,
      CrimeMajorHeadID: 102,
      latitude: 12.9250,
      longitude: 77.5938,
      CaseStatus: 'Charge Sheeted',
      BriefFacts: 'Armed robbery attempt at a jewellery store in Jayanagar 4th Block averted by prompt intervention of beat police patrol.'
    },
    {
      CrimeNo: '104430006202600008',
      CrimeRegisteredDate: '2026-03-12',
      PoliceStationID: unitRows[2].ROWID,
      CrimeMajorHeadID: 103,
      latitude: 12.9720,
      longitude: 77.7450,
      CaseStatus: 'Under Investigation',
      BriefFacts: 'Cyber financial fraud involving fake cryptocurrency trading scheme promising high guaranteed returns promoted via Telegram group.'
    },
    {
      CrimeNo: '104430006202600009',
      CrimeRegisteredDate: '2026-03-22',
      PoliceStationID: unitRows[5].ROWID,
      CrimeMajorHeadID: 105,
      latitude: 13.0035,
      longitude: 77.5703,
      CaseStatus: 'Under Investigation',
      BriefFacts: 'Commercial burglary at an electronics showroom in Malleswaram; multiple high-end laptops and mobile phones stolen overnight.'
    },
    {
      CrimeNo: '104430006202600010',
      CrimeRegisteredDate: '2026-04-01',
      PoliceStationID: unitRows[2].ROWID,
      CrimeMajorHeadID: 104,
      latitude: 12.9560,
      longitude: 77.7010,
      CaseStatus: 'Closed',
      BriefFacts: 'Hit-and-run road traffic collision on Outer Ring Road near Marathahalli junction damaging complainant car and causing minor injury.'
    },
    {
      CrimeNo: '104430006202600011',
      CrimeRegisteredDate: '2026-04-10',
      PoliceStationID: unitRows[3].ROWID,
      CrimeMajorHeadID: 103,
      latitude: 12.9770,
      longitude: 77.5990,
      CaseStatus: 'Under Investigation',
      BriefFacts: 'Extortion threats received via international VoIP calls demanding ransom from a local restaurant owner in Cubbon Park limits.'
    },
    {
      CrimeNo: '104430006202600012',
      CrimeRegisteredDate: '2026-04-18',
      PoliceStationID: unitRows[4].ROWID,
      CrimeMajorHeadID: 103,
      latitude: 12.9290,
      longitude: 77.5850,
      CaseStatus: 'Charged',
      BriefFacts: 'ATM skimming alert where cloned debit cards were used to withdraw unauthorized cash from multiple ATM kiosks across South Bengaluru.'
    },
    {
      CrimeNo: '104430006202600013',
      CrimeRegisteredDate: '2026-04-28',
      PoliceStationID: unitRows[6].ROWID,
      CrimeMajorHeadID: 103,
      latitude: 12.3051,
      longitude: 76.6551,
      CaseStatus: 'Charge Sheeted',
      BriefFacts: 'Counterfeit currency notes circulation detected at a wholesale market in Devaraja limits, Mysuru during evening shopping hours.'
    },
    {
      CrimeNo: '104430006202600014',
      CrimeRegisteredDate: '2026-05-04',
      PoliceStationID: unitRows[4].ROWID,
      CrimeMajorHeadID: 101,
      latitude: 12.9100,
      longitude: 77.5860,
      CaseStatus: 'Under Investigation',
      BriefFacts: 'Impersonation of police officers looting cash and jewellery from elderly citizens walking morning park trails in JP Nagar.'
    },
    {
      CrimeNo: '104430006202600015',
      CrimeRegisteredDate: '2026-05-15',
      PoliceStationID: unitRows[0].ROWID,
      CrimeMajorHeadID: 103,
      latitude: 12.9790,
      longitude: 77.6430,
      CaseStatus: 'Under Investigation',
      BriefFacts: 'Unauthorized online travel booking racket duping passengers of advance holiday package payments.'
    },
    {
      CrimeNo: '104430006202600016',
      CrimeRegisteredDate: '2026-05-25',
      PoliceStationID: unitRows[3].ROWID,
      CrimeMajorHeadID: 101,
      latitude: 12.9718,
      longitude: 77.5955,
      CaseStatus: 'Closed',
      BriefFacts: 'Shoplifting and criminal trespass reported at a retail outlet in UB City shopping complex.'
    },
    {
      CrimeNo: '104430006202600017',
      CrimeRegisteredDate: '2026-06-03',
      PoliceStationID: unitRows[6].ROWID,
      CrimeMajorHeadID: 106,
      latitude: 12.3120,
      longitude: 76.6500,
      CaseStatus: 'Charged',
      BriefFacts: 'Illegal transportation of liquor without valid excise permit intercepted near Mysuru highway checkpost.'
    },
    {
      CrimeNo: '104430006202600018',
      CrimeRegisteredDate: '2026-06-12',
      PoliceStationID: unitRows[1].ROWID,
      CrimeMajorHeadID: 103,
      latitude: 12.9340,
      longitude: 77.6180,
      CaseStatus: 'Charge Sheeted',
      BriefFacts: 'Workplace financial embezzlement by an accountant transferring Rs 18 Lakhs to dummy vendor accounts.'
    },
    {
      CrimeNo: '104430006202600019',
      CrimeRegisteredDate: '2026-06-20',
      PoliceStationID: unitRows[7].ROWID,
      CrimeMajorHeadID: 104,
      latitude: 15.3647,
      longitude: 75.1240,
      CaseStatus: 'Under Investigation',
      BriefFacts: 'Vandalism of public infrastructure and streetlights along Hubballi-Dharwad bypass road during night hours.'
    },
    {
      CrimeNo: '104430006202600020',
      CrimeRegisteredDate: '2026-06-28',
      PoliceStationID: unitRows[2].ROWID,
      CrimeMajorHeadID: 103,
      latitude: 12.9850,
      longitude: 77.7550,
      CaseStatus: 'Under Investigation',
      BriefFacts: 'Fraudulent real estate document forgery attempting illegal registration of disputed land parcel in Whitefield.'
    }
  ];

  const caseRows = [];
  for (const f of firTemplates) {
    const row = await app.datastore().table('CaseMaster').insertRow(f);
    caseRows.push(row);
  }
  console.log(`✅ Seeded ${caseRows.length} CaseMaster FIR records.`);

  // Step 5: Seed AccusedDetails table
  console.log('⚖️ Seeding AccusedDetails records...');
  const accusedRows = [];
  for (let i = 0; i < caseRows.length; i++) {
    const accusedData = {
      CaseID: caseRows[i].ROWID,
      AccusedCount: (i % 3) + 1,
      ArrestedMale: (i % 2) + 1,
      ArrestedFemale: i % 4 === 0 ? 1 : 0,
      ChargeSheetedCount: caseRows[i].CaseStatus === 'Charge Sheeted' || caseRows[i].CaseStatus === 'Charged' ? 1 : 0,
      ConvictionCount: caseRows[i].CaseStatus === 'Closed' ? 1 : 0
    };
    const row = await app.datastore().table('AccusedDetails').insertRow(accusedData);
    accusedRows.push(row);
  }
  console.log(`✅ Seeded ${accusedRows.length} AccusedDetails records.`);

  // Step 6: Seed VictimDetails table
  console.log('🛡️ Seeding VictimDetails records...');
  const victimRows = [];
  for (let i = 0; i < caseRows.length; i++) {
    const victimData = {
      CaseID: caseRows[i].ROWID,
      VictimCount: ((i + 1) % 3) + 1,
      Male: i % 2 === 0 ? 1 : 0,
      Female: i % 2 === 1 ? 1 : 0,
      Boy: i % 5 === 0 ? 1 : 0,
      Girl: i % 7 === 0 ? 1 : 0
    };
    const row = await app.datastore().table('VictimDetails').insertRow(victimData);
    victimRows.push(row);
  }
  console.log(`✅ Seeded ${victimRows.length} VictimDetails records.`);

  console.log('\n====================================================');
  console.log('🎉 DATA SEEDING COMPLETE! SUMMARY OF RECORDS SEEDED:');
  console.log('====================================================');
  console.table([
    { Table: 'District', RowsSeeded: districtRows.length },
    { Table: 'Unit (Police Station)', RowsSeeded: unitRows.length },
    { Table: 'CaseMaster (FIR)', RowsSeeded: caseRows.length },
    { Table: 'AccusedDetails', RowsSeeded: accusedRows.length },
    { Table: 'VictimDetails', RowsSeeded: victimRows.length }
  ]);
  console.log('\n✨ Database ready for KSP Crime Analytics Dashboard!\n');
}

seedDatabase().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
