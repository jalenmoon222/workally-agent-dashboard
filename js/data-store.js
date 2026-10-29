(function () {
  const STORAGE_KEY = 'workerAllyCommandCenter.v1';
  const INTAKE_KEYS = ['workerAllyIntake', 'worker_ally_intake', 'workerAllyProfile', 'workerAllyCompletedProfile'];
  let db;

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (saved && saved.version === 1 && Array.isArray(saved.workers) && Array.isArray(saved.cases)) return saved;
    } catch (error) {
      console.warn('Demo store could not be read; restoring seeded records.', error);
    }
    db = WAMock.makeDatabase();
    persist();
    return db;
  }
  function persist() { localStorage.setItem(STORAGE_KEY, JSON.stringify(db)); }
  function now() { return new Date().toISOString(); }
  function id(prefix) { return prefix + '-' + Math.random().toString(36).slice(2, 8).toUpperCase(); }
  function logActivity(type, message, workerId, caseId) {
    const activity = { id: id('AC'), type, message, workerId, caseId: caseId || null, createdAt: now() };
    db.activities.unshift(activity);
    const record = caseId && db.cases.find(function (item) { return item.id === caseId; });
    if (record) record.activities.unshift(activity);
  }
  function save() { persist(); window.dispatchEvent(new CustomEvent('wa:data-changed')); }
  db = load();

  const Store = {
    storageKey: STORAGE_KEY,
    getDatabase: function () { return db; },
    getWorkers: function () { return db.workers; },
    getWorkerById: function (workerId) { return db.workers.find(function (worker) { return worker.id === workerId; }) || null; },
    getCases: function () { return db.cases; },
    getCasesByWorker: function (workerId) { return db.cases.filter(function (item) { return item.workerId === workerId; }); },
    getCasesByAgent: function (agentId) { return db.cases.filter(function (item) { return item.assignedAgentId === agentId; }); },
    getAgents: function () { return db.agents; },
    getNotes: function (workerId) { return db.notes.filter(function (note) { return !workerId || note.workerId === workerId; }); },
    getActivities: function (workerId) { return db.activities.filter(function (item) { return !workerId || item.workerId === workerId; }); },
    addNote: function (workerId, text, category, internal, caseId, author) {
      const record = { id: id('NT'), workerId, caseId: caseId || null, text: text.trim(), category, internal: Boolean(internal), author: author || 'Demo agent', createdAt: now(), updatedAt: now() };
      db.notes.unshift(record);
      logActivity('Note added', category + ' note recorded', workerId, caseId);
      save(); return record;
    },
    updateNote: function (noteId, text, author) {
      const note = db.notes.find(function (item) { return item.id === noteId; });
      if (!note || note.author !== author) return false;
      note.text = text.trim(); note.updatedAt = now(); save(); return true;
    },
    createCase: function (workerId, category, priority, agentId) {
      const worker = Store.getWorkerById(workerId);
      if (!worker) return null;
      const record = { id: id('CS'), workerId, category, status: agentId ? 'Assigned' : 'New Intake', priority, assignedAgentId: agentId || null, createdAt: now(), updatedAt: now(), followUpDate: null, notes: [], referrals: [], activities: [] };
      db.cases.unshift(record);
      if (agentId) worker.assignedAgentId = agentId;
      worker.caseStatus = record.status;
      logActivity('Case created', category + ' case created', workerId, record.id);
      save(); return record;
    },
    assignCase: function (caseId, agentId) {
      const record = db.cases.find(function (item) { return item.id === caseId; });
      if (!record) return false;
      record.assignedAgentId = agentId || null; record.updatedAt = now();
      if (agentId && record.status === 'New Intake') record.status = 'Assigned';
      logActivity('Assignment updated', 'Case assignment changed', record.workerId, caseId); save(); return true;
    },
    assignWorker: function (workerId, agentId) {
      const worker = Store.getWorkerById(workerId); if (!worker) return false;
      worker.assignedAgentId = agentId || null;
      logActivity('Assignment updated', 'Worker assigned to ' + (agentId || 'unassigned'), workerId); save(); return true;
    },
    updateCaseStatus: function (caseId, status) {
      const record = db.cases.find(function (item) { return item.id === caseId; }); if (!record) return false;
      record.status = status; record.updatedAt = now();
      const worker = Store.getWorkerById(record.workerId);
      if (worker) { worker.caseStatus = status; worker.caseResolved = status === 'Resolved' || status === 'Closed'; }
      logActivity('Status changed', 'Case moved to ' + status, record.workerId, caseId); save(); return true;
    },
    updateWorkerStatus: function (workerId, status) {
      const worker = Store.getWorkerById(workerId); if (!worker) return false;
      worker.caseStatus = status; worker.caseResolved = status === 'Resolved' || status === 'Closed';
      const related = Store.getCasesByWorker(workerId);
      if (related[0]) { related[0].status = status; related[0].updatedAt = now(); }
      logActivity('Status changed', 'Worker status updated to ' + status, workerId); save(); return true;
    },
    setFollowUp: function (caseId, date) {
      const record = db.cases.find(function (item) { return item.id === caseId; }); if (!record) return false;
      record.followUpDate = date || null; record.updatedAt = now();
      const worker = Store.getWorkerById(record.workerId); if (worker) worker.followUpDate = date || null;
      logActivity('Follow-up scheduled', date ? 'Follow-up scheduled for ' + date : 'Follow-up date cleared', record.workerId, caseId); save(); return true;
    },
    addReferral: function (caseId, name, service, status) {
      const record = db.cases.find(function (item) { return item.id === caseId; }); if (!record) return null;
      const referral = { id: id('RF'), caseId, workerId: record.workerId, name: name.trim(), service: service.trim(), status, createdAt: now(), outcome: null };
      db.referrals.unshift(referral); record.referrals.push(referral.id); record.updatedAt = now();
      const worker = Store.getWorkerById(record.workerId); if (worker) worker.referralsMade.push(referral.id);
      logActivity('Referral recorded', service + ' referral recorded', record.workerId, caseId); save(); return referral;
    },
    updateReferralStatus: function (referralId, status) {
      const referral = db.referrals.find(function (item) { return item.id === referralId; }); if (!referral) return false;
      referral.status = status;
      logActivity('Referral updated', 'Referral status changed to ' + status, referral.workerId, referral.caseId); save(); return true;
    },
    recordContactAttempt: function (caseId, result) {
      const record = db.cases.find(function (item) { return item.id === caseId; }); if (!record) return false;
      record.updatedAt = now();
      logActivity('Contact attempt', result.trim(), record.workerId, caseId); save(); return true;
    },
    updateCasePriority: function (caseId, priority) {
      const record = db.cases.find(function (item) { return item.id === caseId; }); if (!record) return false;
      record.priority = priority; record.updatedAt = now();
      logActivity('Priority changed', 'Case priority changed to ' + priority, record.workerId, caseId); save(); return true;
    },
    recordOutcome: function (caseId, description, verified) {
      const record = db.cases.find(function (item) { return item.id === caseId; }); if (!record) return null;
      const outcome = { id: id('OUT'), caseId, workerId: record.workerId, description: description.trim(), reportedAt: now(), verifiedAt: verified ? now() : null, verifiedBy: verified ? 'Demo agent' : null };
      db.outcomes.unshift(outcome);
      const worker = Store.getWorkerById(record.workerId); if (worker && verified) worker.verifiedOutcomes.push(outcome.id);
      logActivity(verified ? 'Outcome verified' : 'Outcome reported', verified ? 'Worker-reported outcome explicitly verified in demo' : 'Worker-reported outcome recorded', record.workerId, caseId); save(); return outcome;
    },
    verifyOutcome: function (outcomeId, verifiedBy) {
      const outcome = db.outcomes.find(function (item) { return item.id === outcomeId; }); if (!outcome || outcome.verifiedAt) return false;
      outcome.verifiedAt = now(); outcome.verifiedBy = verifiedBy || 'Demo agent';
      const worker = Store.getWorkerById(outcome.workerId); if (worker && !worker.verifiedOutcomes.includes(outcome.id)) worker.verifiedOutcomes.push(outcome.id);
      logActivity('Outcome verified', 'Worker-reported outcome explicitly verified in demo', outcome.workerId, outcome.caseId); save(); return true;
    },
    importLocalIntake: function () {
      const candidates = [];
      INTAKE_KEYS.forEach(function (key) {
        try { const value = JSON.parse(localStorage.getItem(key) || 'null'); if (value) candidates.push({ key, value }); } catch (error) { /* Ignore unsupported payloads. */ }
      });
      try {
        for (let index = 0; index < localStorage.length; index += 1) {
          const key = localStorage.key(index);
          if (key && key.startsWith('workerAllyIntake:') && !INTAKE_KEYS.includes(key)) {
            try { const value = JSON.parse(localStorage.getItem(key) || 'null'); if (value) candidates.push({ key, value }); } catch (error) { /* Ignore unsupported payloads. */ }
          }
        }
      } catch (error) { return { imported: 0, skipped: 0, reason: 'Browser storage is unavailable.' }; }
      let imported = 0; let skipped = 0;
      candidates.forEach(function (candidate) {
        const source = candidate.value.profile || candidate.value.worker || candidate.value;
        const name = source.name || [source.firstName, source.lastName].filter(Boolean).join(' ');
        if (!name || typeof name !== 'string') { skipped += 1; return; }
        const externalId = source.id || source.workerId || candidate.key;
        if (db.workers.some(function (worker) { return worker.importSourceId === externalId || worker.importKey === candidate.key; })) { skipped += 1; return; }
        const read = function (keys) { for (let i = 0; i < keys.length; i += 1) if (source[keys[i]] !== undefined && source[keys[i]] !== '') return source[keys[i]]; return null; };
        const rawPlatforms = read(['platforms', 'platform']);
        const importedWorker = {
          id: id('IM'), importSourceId: externalId, importKey: candidate.key, name: name.trim(),
          contact: read(['contact', 'email', 'phone']), borough: read(['borough', 'location']), language: read(['language', 'preferredLanguage']),
          intakeDate: read(['intakeDate', 'completedAt', 'createdAt']) || now(), assignedAgentId: null, caseStatus: 'New Intake',
          workerType: read(['workerType', 'classification', 'workType']), platforms: Array.isArray(rawPlatforms) ? rawPlatforms : (rawPlatforms ? [rawPlatforms] : []),
          weeklyHours: read(['weeklyHours', 'hours']), weeklyIncome: read(['weeklyIncome', 'incomeRange']), workExpenses: read(['workExpenses', 'expenses']),
          incomeConsistency: read(['incomeConsistency']), insuranceStatus: read(['insuranceStatus', 'insurance']), healthcareAffordable: read(['healthcareAffordable', 'coverageAffordable']),
          healthcareBarriers: read(['healthcareBarriers', 'coverageBarriers']), healthcareAssistance: read(['healthcareAssistance', 'healthcareHelpRequested']),
          healthcareCaseStatus: null, paySatisfaction: read(['paySatisfaction']), workplaceConcerns: read(['workplaceConcerns', 'concerns']),
          wageAssistanceNeed: null, safetyConcerns: null, deactivationConcern: null, requestedBenefits: read(['requestedBenefits', 'benefits']),
          primaryPriority: read(['primaryPriority', 'assistanceNeed']), benefitsAssistanceStatus: null, referralsMade: [], applicationsSupported: [], caseResolved: false,
          verifiedOutcomes: [], estimatedSavings: null, verifiedSavings: null, followUpDate: null, primaryAssistanceNeed: read(['primaryAssistanceNeed', 'assistanceNeed']) || 'Not provided', isDemo: false
        };
        if (importedWorker.healthcareBarriers !== null && !Array.isArray(importedWorker.healthcareBarriers)) importedWorker.healthcareBarriers = [importedWorker.healthcareBarriers];
        if (importedWorker.workplaceConcerns !== null && !Array.isArray(importedWorker.workplaceConcerns)) importedWorker.workplaceConcerns = [importedWorker.workplaceConcerns];
        if (importedWorker.requestedBenefits !== null && !Array.isArray(importedWorker.requestedBenefits)) importedWorker.requestedBenefits = [importedWorker.requestedBenefits];
        db.workers.unshift(importedWorker); imported += 1;
        logActivity('Intake imported', 'Completed local intake imported', importedWorker.id);
      });
      if (imported) save();
      return { imported, skipped, reason: candidates.length ? null : 'No supported completed intake records found in this browser.' };
    },
    applyScenario: function (scenario) {
      db = WAMock.makeDatabase(); db.scenario = scenario;
      const demoWorkers = db.workers;
      if (scenario === 'healthcare') demoWorkers.forEach(function (worker, index) { if (index % 2 === 0) { worker.healthcareAffordable = true; worker.healthcareAssistance = true; worker.healthcareBarriers = ['Cost']; worker.insuranceStatus = index % 4 === 0 ? 'Uninsured' : worker.insuranceStatus; } });
      if (scenario === 'wages') demoWorkers.forEach(function (worker, index) { if (worker.platforms.some(function (platform) { return ['DoorDash', 'Uber Eats', 'Grubhub'].includes(platform); }) && index % 2 === 0) worker.workplaceConcerns = Array.from(new Set(worker.workplaceConcerns.concat(['Low pay', 'Missing payments']))); });
      if (scenario === 'benefits') demoWorkers.forEach(function (worker, index) { if (index % 2 === 0) worker.requestedBenefits = Array.from(new Set(worker.requestedBenefits.concat(['Affordable healthcare', 'Paid leave']))); });
      if (scenario === 'workload') db.cases.forEach(function (record, index) { if (index % 3 === 0) { record.status = 'Follow-up Needed'; record.followUpDate = now().slice(0, 10); } });
      save();
    },
    reset: function () { db = WAMock.makeDatabase(); save(); },
    clear: function () { db = { version: 1, workers: [], cases: [], agents: db.agents, notes: [], referrals: [], activities: [], outcomes: [], restrictedAdvocacy: [], generatedAt: now(), scenario: 'cleared' }; save(); },
    updateReferralOutcome: function (referralId, outcome) {
      const referral = db.referrals.find(function (item) { return item.id === referralId; }); if (!referral) return false;
      referral.outcome = outcome; save(); return true;
    }
  };
  window.WAStore = Store;
})();
