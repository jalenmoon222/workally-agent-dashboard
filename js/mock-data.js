(function () {
  const agents = [
    { id: 'AG-001', name: 'Maya Chen', team: 'Healthcare', status: 'Available' },
    { id: 'AG-002', name: 'Luis Rivera', team: 'Worker Rights', status: 'Available' },
    { id: 'AG-003', name: 'Nina Patel', team: 'Benefits', status: 'Available' },
    { id: 'AG-004', name: 'Andre Brooks', team: 'General Support', status: 'Available' },
    { id: 'AG-005', name: 'Sam Okafor', team: 'Worker Advocacy', status: 'Available' }
  ];
  const firstNames = ['Jordan', 'Avery', 'Riley', 'Morgan', 'Cameron', 'Taylor', 'Casey', 'Quinn', 'Drew', 'Skyler', 'Jamie', 'Reese', 'Alex', 'Robin', 'Emerson', 'Kai', 'Noah', 'Amari', 'Sasha', 'Micah', 'Inez', 'Mateo', 'Lena', 'Omar', 'Zoe', 'Elias', 'Maya', 'Theo', 'Nia', 'Rafael'];
  const lastNames = ['Brooks', 'Rivera', 'Chen', 'Patel', 'Johnson', 'Williams', 'Diaz', 'Kim', 'Okafor', 'Singh', 'Carter', 'Lopez', 'Reed', 'Bennett', 'Morales', 'Ali', 'Park', 'Foster', 'Green', 'Santos', 'Price', 'Nguyen', 'Wright', 'James', 'Flores'];
  const workerTypes = ['Uber driver', 'Lyft driver', 'DoorDash delivery worker', 'Uber Eats delivery worker', 'Grubhub delivery worker', 'TaskRabbit worker', 'Freelance designer', 'Freelance developer', 'Independent cleaner', 'Other gig worker'];
  const boroughs = ['Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island', 'Multiple boroughs'];
  const languages = ['English', 'Spanish', 'Mandarin', 'Bengali', 'Haitian Creole', 'Arabic', 'Not provided'];
  const insurance = ['Uninsured', 'Medicaid', 'Marketplace', 'Employer-sponsored', 'Other coverage', 'Not provided'];
  const barriers = ['Cost', 'Lack of information', 'Potential eligibility concerns', 'Loss of previous coverage', 'Finding in-network care', 'Other reported barrier'];
  const concerns = ['Low pay', 'Missing payments', 'Unpaid work time', 'Unpredictable income', 'Deactivation concern', 'Unsafe conditions', 'Lack of benefits', 'Difficulty accessing support'];
  const benefits = ['Affordable healthcare', 'Dental', 'Vision', 'Paid leave', 'Disability protection', 'Retirement', 'Tax help', 'Legal assistance', 'Emergency support', 'Training'];
  const statuses = ['New Intake', 'Awaiting Assignment', 'Assigned', 'In Progress', 'Waiting on Partner', 'Follow-up Needed', 'Resolved', 'Closed'];
  const categories = ['Healthcare', 'Wage Assistance', 'Worker Rights', 'Additional Benefits', 'General Support'];

  function seeded(seed) {
    let value = seed >>> 0;
    return function () {
      value = (value * 1664525 + 1013904223) >>> 0;
      return value / 4294967296;
    };
  }
  function pick(random, list) { return list[Math.floor(random() * list.length)]; }
  function uniquePicks(random, list, min, max) {
    const count = min + Math.floor(random() * (max - min + 1));
    const copy = list.slice();
    const result = [];
    while (result.length < count && copy.length) result.push(copy.splice(Math.floor(random() * copy.length), 1)[0]);
    return result;
  }
  function dateAgo(random, maxDays) {
    const days = Math.floor(random() * maxDays);
    const date = new Date(Date.UTC(2026, 9, 29));
    date.setUTCDate(date.getUTCDate() - days);
    date.setUTCHours(9 + Math.floor(random() * 9), Math.floor(random() * 60), 0, 0);
    return date.toISOString();
  }
  function makeWorkers() {
    const random = seeded(913721);
    return Array.from({ length: 240 }, function (_, index) {
      const type = workerTypes[index % workerTypes.length];
      const platform = type.startsWith('Uber driver') ? ['Uber'] : type.startsWith('Lyft') ? ['Lyft'] : type.startsWith('DoorDash') ? ['DoorDash'] : type.startsWith('Uber Eats') ? ['Uber Eats'] : type.startsWith('Grubhub') ? ['Grubhub'] : type.startsWith('TaskRabbit') ? ['TaskRabbit'] : [type.startsWith('Freelance') ? 'Independent clients' : type.startsWith('Independent cleaner') ? 'Independent clients' : 'Other platform'];
      if (random() < 0.19 && platform[0] !== 'Independent clients') platform.push(pick(random, ['Uber', 'Lyft', 'DoorDash', 'Uber Eats', 'Grubhub']));
      const healthStatus = pick(random, insurance);
      const healthAffordability = healthStatus === 'Not provided' ? null : random() < 0.48;
      const workerConcerns = uniquePicks(random, concerns, 0, 3);
      const requestedBenefits = uniquePicks(random, benefits, 0, 4);
      const assistance = [];
      if (random() < 0.43) assistance.push('Healthcare');
      if (workerConcerns.some(function (item) { return ['Low pay', 'Missing payments', 'Unpaid work time', 'Deactivation concern', 'Unsafe conditions'].includes(item); }) && random() < 0.6) assistance.push('Worker Rights');
      if (requestedBenefits.length && random() < 0.5) assistance.push('Benefits');
      const intakeDate = dateAgo(random, 180);
      const assigned = random() < 0.2 ? null : agents[Math.floor(random() * 4)].id;
      const status = pick(random, statuses);
      const hours = pick(random, ['Under 20', '20–35', '36–50', 'Over 50', 'Not provided']);
      const worker = {
        id: 'WA-' + String(index + 1).padStart(4, '0'),
        name: pick(random, firstNames) + ' ' + pick(random, lastNames),
        contact: 'demo+' + String(index + 1).padStart(4, '0') + '@workerally.example',
        borough: pick(random, boroughs), language: pick(random, languages), intakeDate,
        assignedAgentId: assigned, caseStatus: status, workerType: type, platforms: Array.from(new Set(platform)),
        weeklyHours: hours, weeklyIncome: pick(random, ['$0–$499', '$500–$999', '$1,000–$1,499', '$1,500+', 'Not provided']),
        workExpenses: pick(random, ['$0–$99', '$100–$249', '$250–$499', '$500+', 'Not provided']),
        incomeConsistency: pick(random, ['Consistent', 'Somewhat unpredictable', 'Very unpredictable', 'Not provided']),
        insuranceStatus: healthStatus, healthcareAffordable: healthAffordability,
        healthcareBarriers: healthAffordability === true || healthStatus === 'Uninsured' ? uniquePicks(random, barriers, 1, 2) : [],
        healthcareAssistance: assistance.includes('Healthcare') || healthStatus === 'Uninsured' && random() < 0.62,
        healthcareCaseStatus: pick(random, ['Not started', 'In progress', 'Referred', 'Resolved', 'Not requested']),
        paySatisfaction: pick(random, ['Satisfied', 'Neutral', 'Dissatisfied', 'Not provided']),
        workplaceConcerns: workerConcerns,
        wageAssistanceNeed: workerConcerns.some(function (item) { return ['Low pay', 'Missing payments', 'Unpaid work time'].includes(item); }),
        safetyConcerns: workerConcerns.includes('Unsafe conditions'), deactivationConcern: workerConcerns.includes('Deactivation concern'),
        requestedBenefits, primaryPriority: requestedBenefits.length ? requestedBenefits[0] : (assistance[0] || 'General support'),
        benefitsAssistanceStatus: requestedBenefits.length ? pick(random, ['Not started', 'In progress', 'Referred', 'Resolved']) : 'Not requested',
        referralsMade: [], applicationsSupported: [], caseResolved: status === 'Resolved' || status === 'Closed',
        verifiedOutcomes: [], estimatedSavings: random() < 0.15 ? Math.floor(random() * 600) + 50 : null,
        verifiedSavings: null, followUpDate: random() < 0.22 ? dateAgo(random, 20) : null,
        primaryAssistanceNeed: pick(random, assistance.length ? assistance : ['General Support']),
        isDemo: true
      };
      return worker;
    });
  }
  function makeCases(workers) {
    const random = seeded(77210);
    const cases = [];
    workers.forEach(function (worker, index) {
      const count = index % 8 === 0 ? 2 : 1;
      for (let slot = 0; slot < count; slot += 1) {
        if (random() < 0.25 && slot === 0) continue;
        let category = slot === 1 ? pick(random, ['Healthcare', 'Wage Assistance', 'Additional Benefits']) : worker.primaryAssistanceNeed;
        if (category === 'Benefits') category = 'Additional Benefits';
        if (category === 'Worker Rights' && !categories.includes(category)) category = 'General Support';
        cases.push({
          id: 'CS-' + String(cases.length + 1).padStart(4, '0'), workerId: worker.id, category,
          status: worker.caseStatus, priority: pick(random, ['Standard', 'Standard', 'High', 'Urgent']),
          assignedAgentId: worker.assignedAgentId, createdAt: worker.intakeDate,
          updatedAt: worker.intakeDate, followUpDate: worker.followUpDate, notes: [], referrals: [], activities: []
        });
      }
    });
    return cases;
  }
  function makeDatabase() {
    const workers = makeWorkers();
    const cases = makeCases(workers);
    const restrictedAdvocacy = workers.filter(function (_, index) { return index % 17 === 0; }).map(function (worker) {
      return { id: 'RA-' + worker.id, workerId: worker.id, requested: true, requestDate: worker.intakeDate, note: 'Synthetic opt-in record for role-preview demonstration.' };
    });
    return { version: 1, workers, cases, agents: agents.map(function (item) { return Object.assign({}, item); }), notes: [], referrals: [], activities: [], outcomes: [], restrictedAdvocacy, generatedAt: new Date().toISOString(), scenario: 'baseline' };
  }
  window.WAMock = { makeDatabase, workerTypes, boroughs, insurance, benefits, categories, statuses };
})();
