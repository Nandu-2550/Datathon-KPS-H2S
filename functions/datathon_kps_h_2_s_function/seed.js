const catalyst = require('zcatalyst-sdk-node');

// Helper to check if a table already has rows
async function getRowCount(datastore, tableName) {
  try {
    const table = datastore.table(tableName);
    const paged = await table.getPagedRows({ maxRows: 5 });
    return (paged.data || []).length;
  } catch (err) {
    return 0;
  }
}

async function seedDatabase(req = null) {
  console.log('====================================================');
  console.log('🚀 KSP CrimeIQ Phase 2 Idempotent Seeder');
  console.log('====================================================');

  let app;
  if (req && req.headers) {
    // Optional HTTP guard check
    const seedKey = req.headers['x-seed-key'];
    if (seedKey !== 'dtathon2026') {
      throw new Error('Unauthorized seeder execution. Missing or invalid x-seed-key.');
    }
    app = catalyst.initialize(req);
  } else {
    try {
      app = catalyst.initialize();
    } catch (e) {
      // Fallback for CLI/local execution if needed
      app = catalyst.initializeApp ? catalyst.initializeApp() : catalyst.initialize();
    }
  }

  const ds = app.datastore();

  // 1. CrimeHead
  let headRows = [];
  const headCount = await getRowCount(ds, 'CrimeHead');
  if (headCount === 0) {
    console.log('Seeding CrimeHead table...');
    const heads = [
      { CrimeGroupName: 'Theft / Chain Snatching' },
      { CrimeGroupName: 'Robbery / Extortion' },
      { CrimeGroupName: 'Cybercrime / Financial Fraud' },
      { CrimeGroupName: 'Assault / Bodily Offence' },
      { CrimeGroupName: 'Burglary / House Break-in' },
      { CrimeGroupName: 'NDPS / Narcotics Seizure' }
    ];
    for (const h of heads) {
      const r = await ds.table('CrimeHead').insertRow(h);
      headRows.push(r);
    }
    console.log(`✅ Seeded ${headRows.length} CrimeHead records.`);
  } else {
    console.log('⏭️ CrimeHead table already has rows. Skipping insert.');
    const p = await ds.table('CrimeHead').getPagedRows({ maxRows: 50 });
    headRows = p.data || [];
  }

  // 2. District
  let districtRows = [];
  const distCount = await getRowCount(ds, 'District');
  if (distCount === 0) {
    console.log('Seeding District table...');
    const districts = [
      { DistrictName: 'Bengaluru City' },
      { DistrictName: 'Bengaluru North' },
      { DistrictName: 'Bengaluru South' },
      { DistrictName: 'Mysuru City' },
      { DistrictName: 'Hubballi-Dharwad' }
    ];
    for (const d of districts) {
      const r = await ds.table('District').insertRow(d);
      districtRows.push(r);
    }
    console.log(`✅ Seeded ${districtRows.length} District records.`);
  } else {
    console.log('⏭️ District table already has rows. Skipping insert.');
    const p = await ds.table('District').getPagedRows({ maxRows: 50 });
    districtRows = p.data || [];
  }

  // 3. Unit (Police Stations)
  let unitRows = [];
  const unitCount = await getRowCount(ds, 'Unit');
  if (unitCount === 0) {
    console.log('Seeding Unit table...');
    const blrCity = districtRows[0] ? districtRows[0].ROWID : null;
    const blrNorth = districtRows[1] ? districtRows[1].ROWID : null;
    const blrSouth = districtRows[2] ? districtRows[2].ROWID : null;
    const mysuru = districtRows[3] ? districtRows[3].ROWID : null;
    const hubballi = districtRows[4] ? districtRows[4].ROWID : null;

    const units = [
      { UnitName: 'Indiranagar Police Station', DistrictID: blrCity },
      { UnitName: 'Koramangala Police Station', DistrictID: blrCity },
      { UnitName: 'Whitefield Police Station', DistrictID: blrCity },
      { UnitName: 'Cubbon Park Police Station', DistrictID: blrCity },
      { UnitName: 'Jayanagar Police Station', DistrictID: blrSouth },
      { UnitName: 'Malleswaram Police Station', DistrictID: blrNorth },
      { UnitName: 'Devaraja Police Station', DistrictID: mysuru },
      { UnitName: 'Suburban Police Station', DistrictID: hubballi }
    ];
    for (const u of units) {
      const r = await ds.table('Unit').insertRow(u);
      unitRows.push(r);
    }
    console.log(`✅ Seeded ${unitRows.length} Unit records.`);
  } else {
    console.log('⏭️ Unit table already has rows. Skipping insert.');
    const p = await ds.table('Unit').getPagedRows({ maxRows: 50 });
    unitRows = p.data || [];
  }

  // 4. CaseMaster (40+ realistic Karnataka FIRs)
  let caseRows = [];
  const caseCount = await getRowCount(ds, 'CaseMaster');
  if (caseCount < 30) {
    console.log('Seeding CaseMaster table (+40 FIRs)...');
    const briefFactsTemplates = [
      'Honda Activa theft reported from metro station parking area during daytime hours.',
      'Physical assault and brawl inside XL Bar over billing dispute resulting in severe injuries.',
      'UPI payment fraud where complainant was duped via fraudulent cashback verification call.',
      'Dowry harassment and domestic dispute filed under IPC 498A at local police station.',
      'Gold chain snatching by high-speed motorcycle riders wearing helmets on 100ft road.',
      'ATM cash machine robbery attempt involving gas cutters during early morning hours.',
      'Seizure of commercial quantity ganja (NDPS Act) from interstate vehicle interception.',
      'Hit-and-run road accident on highway junction damaging vehicle and injuring pedestrian.',
      'Night-time house break-in and burglary at locked residential apartment complex.',
      'Fraudulent KAS officer recruitment bribe scam duping job aspirants of lakhs.'
    ];
    const statuses = ['Under Investigation', 'Charge Sheeted', 'Closed', 'Pending Trial', 'Referred to Court'];

    for (let i = 1; i <= 40; i++) {
      const unit = unitRows[i % (unitRows.length || 1)] || { ROWID: null };
      const head = headRows[i % (headRows.length || 1)] || { ROWID: 101 };
      const lat = 12.0 + (Math.random() * 6.5);
      const lng = 74.0 + (Math.random() * 4.6);
      const crimeNo = `1044300062026${String(i + 100).padStart(5, '0')}`;
      const firData = {
        CrimeNo: crimeNo,
        CrimeRegisteredDate: `2026-0${(i % 6) + 1}-${String((i % 28) + 1).padStart(2, '0')}`,
        PoliceStationID: unit.ROWID,
        CrimeMajorHeadID: head.ROWID,
        latitude: parseFloat(lat.toFixed(4)),
        longitude: parseFloat(lng.toFixed(4)),
        CaseStatus: statuses[i % statuses.length],
        BriefFacts: briefFactsTemplates[i % briefFactsTemplates.length]
      };
      const r = await ds.table('CaseMaster').insertRow(firData);
      caseRows.push(r);
    }
    console.log(`✅ Seeded ${caseRows.length} CaseMaster records.`);
  } else {
    console.log('⏭️ CaseMaster table already has sufficient rows. Skipping insert.');
    const p = await ds.table('CaseMaster').getPagedRows({ maxRows: 100 });
    caseRows = p.data || [];
  }

  // 5. AccusedDetails (+30 rows including repeat offenders)
  const accusedCount = await getRowCount(ds, 'AccusedDetails');
  if (accusedCount < 20) {
    console.log('Seeding AccusedDetails table (+30 records with repeat offenders)...');
    const repeatOffendersList = [
      { name: 'Suresh Gowda', count: 4, age: 34 },
      { name: 'Raju Kumar', count: 3, age: 28 },
      { name: 'Santosh Naidu', count: 3, age: 39 },
      { name: 'Mohammed Irfan', count: 2, age: 31 },
      { name: 'Lokesh B', count: 2, age: 26 },
      { name: 'Manjunath K', count: 2, age: 41 },
      { name: 'Vijay Pillai', count: 2, age: 29 },
      { name: 'Imran Khan', count: 2, age: 33 }
    ];

    let seededAccused = 0;
    let caseIdx = 0;
    for (const ro of repeatOffendersList) {
      for (let c = 0; c < ro.count; c++) {
        const targetCase = caseRows[caseIdx % (caseRows.length || 1)] || { ROWID: null };
        caseIdx++;
        await ds.table('AccusedDetails').insertRow({
          AccusedName: ro.name,
          AgeYear: ro.age,
          GenderID: 'Male',
          CaseMasterID: targetCase.ROWID,
          CaseID: targetCase.ROWID
        });
        seededAccused++;
      }
    }

    // Additional single accused rows to reach 30+
    while (seededAccused < 30) {
      const targetCase = caseRows[caseIdx % (caseRows.length || 1)] || { ROWID: null };
      caseIdx++;
      await ds.table('AccusedDetails').insertRow({
        AccusedName: `Accused Person #${seededAccused + 1}`,
        AgeYear: 25 + (seededAccused % 20),
        GenderID: seededAccused % 4 === 0 ? 'Female' : 'Male',
        CaseMasterID: targetCase.ROWID,
        CaseID: targetCase.ROWID
      });
      seededAccused++;
    }
    console.log(`✅ Seeded ${seededAccused} AccusedDetails records.`);
  } else {
    console.log('⏭️ AccusedDetails table already has rows. Skipping insert.');
  }

  // 6. VictimDetails (+30 rows)
  const victimCount = await getRowCount(ds, 'VictimDetails');
  if (victimCount < 20) {
    console.log('Seeding VictimDetails table (+30 records)...');
    for (let i = 0; i < 30; i++) {
      const targetCase = caseRows[i % (caseRows.length || 1)] || { ROWID: null };
      await ds.table('VictimDetails').insertRow({
        VictimName: `Victim Citizen #${i + 1}`,
        AgeYear: 20 + (i % 45),
        GenderID: i % 2 === 0 ? 'Female' : 'Male',
        CaseMasterID: targetCase.ROWID,
        CaseID: targetCase.ROWID
      });
    }
    console.log('✅ Seeded 30 VictimDetails records.');
  } else {
    console.log('⏭️ VictimDetails table already has rows. Skipping insert.');
  }

  console.log('🎉 Idempotent Seeding Completed Successfully.');
}

if (require.main === module) {
  seedDatabase().catch((err) => {
    console.error('❌ Seeder failed:', err);
    process.exit(1);
  });
}

module.exports = { seedDatabase };
