(function () {
  const navItems = [
    ['overview', 'Overview', '◫', ['admin']], ['workers', 'Workers', '♙', ['admin']],
    ['cases', 'Cases', '▤', ['admin', 'healthcare', 'benefits', 'rights']], ['healthcare', 'Healthcare', '＋', ['admin', 'healthcare']],
    ['rights', 'Worker Rights', '⚖', ['admin', 'rights']], ['benefits', 'Benefits', '◇', ['admin', 'benefits']],
    ['analytics', 'Analytics', '⌁', ['admin']], ['agents', 'Agent Performance', '◷', ['admin']],
    ['reports', 'Reports', '▧', ['admin']], ['settings', 'Settings', '⚙', ['admin']], ['advocacy', 'Restricted Advocacy', '◉', ['advocacy']]
  ];
  const roleNames = { admin: 'Agency Admin', healthcare: 'Healthcare Agent', benefits: 'Benefits Specialist', rights: 'Worker Rights Specialist', advocacy: 'Worker Advocacy Specialist' };
  const statusList = WAMock.statuses;
  const state = { view: 'overview', role: 'admin', workerId: null, profileTab: 'Overview', page: 1, pageSize: 10, sort: 'intakeDate', sortDir: -1, globalFilters: { period: 'all', borough: '', type: '', platform: '', insurance: '', income: '' }, report: 'Overall Worker Needs Summary', reportGenerated: false, filtersApplied: false };
  const main = document.getElementById('mainContent');
  const nav = document.getElementById('mainNav');
  const esc = function (value) { return String(value === null || value === undefined || value === '' ? 'Not provided' : value).replace(/[&<>"']/g, function (char) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]; }); };
  const date = function (value) { if (!value) return 'Not scheduled'; const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? esc(value) : parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }); };
  const pct = function (n, d) { return d ? Math.round(n / d * 100) : null; };
  const answerCount = function (items, getter) { return items.filter(function (item) { const value = getter(item); return value !== null && value !== undefined && value !== '' && value !== 'Not provided'; }).length; };
  const count = function (items, predicate) { return items.filter(predicate).length; };
  const agentName = function (id) { const agent = WAStore.getAgents().find(function (item) { return item.id === id; }); return agent ? agent.name : (id ? id : 'Unassigned'); };
  const initials = function (name) { return String(name || 'WA').split(' ').map(function (part) { return part[0] || ''; }).slice(0, 2).join('').toUpperCase(); };
  const slug = function (value) { return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); };
  const val = function (value) { if (Array.isArray(value)) return value.length ? value.join(', ') : 'None reported'; if (value === true) return 'Yes'; if (value === false) return 'No'; return value == null || value === '' ? 'Not provided' : value; };
  const list = function (value) { return Array.isArray(value) ? value : []; };
  const allWorkers = function () { return WAStore.getWorkers(); };
  const allCases = function () { return WAStore.getCases(); };
  const allAgents = function () { return WAStore.getAgents(); };
  function roleCaseCategories(role) { return { healthcare: ['Healthcare'], benefits: ['Additional Benefits'], rights: ['Worker Rights', 'Wage Assistance'] }[role] || []; }
  function notesForRole(workerId) { return WAStore.getNotes(workerId).filter(function (note) { return state.role === 'admin' || (roleCaseCategories(state.role).includes(note.category) || note.category === 'General Support'); }); }
  function metric(label, value, note, icon) { return '<article class="metric-card"><div class="metric-top"><div class="metric-label">' + esc(label) + '</div><span class="metric-icon">' + icon + '</span></div><div class="metric-value">' + esc(value) + '</div><div class="metric-foot">' + note + '</div><span class="metric-accent"></span></article>'; }
  function head(title, description, actions, eyebrow) { return '<div class="page-head"><div class="page-head-copy"><div class="eyebrow">' + (eyebrow || 'WORKER ALLY · SIMULATED DATA') + '</div><h1>' + title + '</h1><p>' + description + '</p></div><div class="head-actions">' + (actions || '') + '</div></div>'; }
  function panel(title, subtitle, content, span, action) { return '<section class="panel span-' + (span || 6) + '"><div class="panel-head"><div><h2 class="panel-title">' + title + '</h2>' + (subtitle ? '<p class="panel-subtitle">' + subtitle + '</p>' : '') + '</div>' + (action || '') + '</div><div class="panel-body">' + content + '</div></section>'; }
  function pill(status) { return '<span class="status-pill status-' + slug(status) + '">' + esc(status) + '</span>'; }
  function table(rows, headers, className) { return '<div class="table-scroll"><table class="data-table ' + (className || '') + '"><thead><tr>' + headers.map(function (header) { return '<th>' + header + '</th>'; }).join('') + '</tr></thead><tbody>' + rows + '</tbody></table></div>'; }
  function allowedNav() { return navItems.filter(function (item) { return item[3].includes(state.role); }); }
  function renderNav() {
    nav.innerHTML = allowedNav().map(function (item) { return '<button class="nav-item ' + (state.view === item[0] || state.view === 'profile' && item[0] === 'workers' ? 'active' : '') + '" data-view="' + item[0] + '"><span class="nav-icon" aria-hidden="true">' + item[2] + '</span>' + item[1] + '</button>'; }).join('');
    document.getElementById('roleName').textContent = roleNames[state.role];
    document.getElementById('topTitle').textContent = (navItems.find(function (item) { return item[0] === state.view; }) || ['', 'Worker Profile'])[1];
  }
  function currentFilters() {
    const filters = state.globalFilters;
    const now = new Date(); const days = filters.period === '30' ? 30 : filters.period === '90' ? 90 : filters.period === '180' ? 180 : null;
    return allWorkers().filter(function (worker) {
      if (days && new Date(worker.intakeDate) < new Date(now.getTime() - days * 86400000)) return false;
      if (filters.borough && worker.borough !== filters.borough) return false;
      if (filters.type && worker.workerType !== filters.type) return false;
      if (filters.platform && !(worker.platforms || []).includes(filters.platform)) return false;
      if (filters.insurance && worker.insuranceStatus !== filters.insurance) return false;
      if (filters.income && worker.weeklyIncome !== filters.income) return false;
      return true;
    });
  }
  function globalFilterBar() {
    const f = state.globalFilters;
    return '<div class="filter-bar" id="globalFilter"><div class="field"><label for="filterPeriod">Intake period</label><select id="filterPeriod" data-filter="period"><option value="all">All available</option><option value="30" ' + (f.period === '30' ? 'selected' : '') + '>Last 30 days</option><option value="90" ' + (f.period === '90' ? 'selected' : '') + '>Last 90 days</option><option value="180" ' + (f.period === '180' ? 'selected' : '') + '>Last 6 months</option></select></div><div class="field"><label for="filterBorough">Borough</label><select id="filterBorough" data-filter="borough"><option value="">All boroughs</option>' + WAMock.boroughs.map(function (item) { return '<option ' + (f.borough === item ? 'selected' : '') + '>' + esc(item) + '</option>'; }).join('') + '</select></div><div class="field"><label for="filterType">Worker type</label><select id="filterType" data-filter="type"><option value="">All worker types</option>' + Array.from(new Set(allWorkers().map(function (worker) { return worker.workerType; }).filter(Boolean))).sort().map(function (item) { return '<option ' + (f.type === item ? 'selected' : '') + '>' + esc(item) + '</option>'; }).join('') + '</select></div><div class="field"><label for="filterPlatform">Platform</label><select id="filterPlatform" data-filter="platform"><option value="">All platforms</option>' + Array.from(new Set(allWorkers().flatMap(function (worker) { return worker.platforms || []; }))).sort().map(function (item) { return '<option ' + (f.platform === item ? 'selected' : '') + '>' + esc(item) + '</option>'; }).join('') + '</select></div><div class="field"><label for="filterInsurance">Insurance status</label><select id="filterInsurance" data-filter="insurance"><option value="">All statuses</option>' + WAMock.insurance.map(function (item) { return '<option ' + (f.insurance === item ? 'selected' : '') + '>' + esc(item) + '</option>'; }).join('') + '</select></div><div class="field"><label for="filterIncome">Income range</label><select id="filterIncome" data-filter="income"><option value="">All ranges</option>' + Array.from(new Set(allWorkers().map(function (worker) { return worker.weeklyIncome; }).filter(Boolean))).sort().map(function (item) { return '<option ' + (f.income === item ? 'selected' : '') + '>' + esc(item) + '</option>'; }).join('') + '</select></div><div class="field-actions"><button class="button button-primary button-sm" data-action="apply-filters">Apply</button><button class="button button-sm" data-action="reset-filters">Reset</button></div><span class="privacy-note">' + currentFilters().length + ' workers in current sample</span></div>';
  }
  function percentageNote(n, d, wording) { return d ? Math.round(n / d * 100) + '% of ' + d + ' respondents ' + wording : 'No workers answered this question'; }
  function healthCounts(workers) {
    return {
      uninsured: count(workers, function (worker) { return worker.insuranceStatus === 'Uninsured'; }),
      medicaid: count(workers, function (worker) { return worker.insuranceStatus === 'Medicaid'; }),
      marketplace: count(workers, function (worker) { return worker.insuranceStatus === 'Marketplace'; }),
      employer: count(workers, function (worker) { return worker.insuranceStatus === 'Employer-sponsored'; }),
      unaffordable: count(workers, function (worker) { return worker.healthcareAffordable === true; }),
      affordableAnswered: answerCount(workers, function (worker) { return worker.healthcareAffordable; }),
      assistance: count(workers, function (worker) { return worker.healthcareAssistance === true; })
    };
  }
  function concernsCount(workers, concern) { return count(workers, function (worker) { return list(worker.workplaceConcerns).includes(concern); }); }
  function overview() {
    const workers = allWorkers(), cases = allCases(), thisMonth = count(workers, function (worker) { const date = new Date(worker.intakeDate); const now = new Date(); return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear(); });
    const health = healthCounts(workers); const active = count(cases, function (item) { return !['Resolved', 'Closed'].includes(item.status); });
    const waiting = count(workers, function (worker) { return !worker.assignedAgentId; });
    const resolved = count(cases, function (item) { return item.status === 'Resolved' || item.status === 'Closed'; });
    const rights = count(workers, function (worker) { return worker.primaryAssistanceNeed === 'Worker Rights' || worker.wageAssistanceNeed === true; });
    const benefit = count(workers, function (worker) { return (worker.requestedBenefits || []).length > 0; });
    const rows = [
      ['Workers registered', workers.length, 'Synthetic records in this browser', '♙'], ['New this month', thisMonth, 'Based on intake timestamps', '↗'],
      ['Active cases', active, 'Excludes resolved and closed', '▤'], ['Awaiting assignment', waiting, 'Cases with no assigned agent', '◷'],
      ['Healthcare requests', health.assistance, 'Worker-reported assistance need', '＋'], ['Worker rights needs', rights, 'Reported pay or rights concern', '⚖'],
      ['Benefits requests', benefit, 'Workers selecting one or more benefits', '◇'], ['Resolved cases', resolved, 'Cases marked resolved or closed', '✓'],
      ['Avg. resolution time', 'N/A', 'No resolution timestamps recorded', '◴'], ['Healthcare affordability', health.affordableAnswered ? pct(health.unaffordable, health.affordableAnswered) + '%' : 'N/A', percentageNote(health.unaffordable, health.affordableAnswered, 'reported coverage as unaffordable'), '♡']
    ];
    const metrics = '<div class="metrics-grid">' + rows.map(function (row) { const note = row[0] === 'Healthcare affordability' ? '<span>' + esc(row[2]) + '</span>' : '<span>' + esc(row[2]) + '</span>'; return metric(row[0], row[1], note, row[3]); }).join('') + '</div>';
    const pain = painPoints(workers).slice(0, 6);
    const recent = allCases().slice().sort(function (a, b) { return new Date(b.updatedAt) - new Date(a.updatedAt); }).slice(0, 6).map(function (record) { const worker = WAStore.getWorkerById(record.workerId); return '<tr><td class="name-cell">' + esc(worker ? worker.name : record.workerId) + '</td><td>' + esc(record.category) + '</td><td>' + pill(record.status) + '</td><td>' + esc(agentName(record.assignedAgentId)) + '</td><td>' + date(record.updatedAt) + '</td><td><button class="table-action" data-action="open-worker" data-id="' + record.workerId + '">Open</button></td></tr>'; }).join('');
    const notice = '<div class="notice"><span>ⓘ</span><span><strong>Simulation notice.</strong> ' + workers.length + ' fictional worker profiles are stored in this browser. LocalStorage is not a shared database and is not suitable for real sensitive records.</span></div>';
    main.innerHTML = head('Overview', 'A practical view of worker needs, active cases, and agency activity.', '<button class="button" data-view="workers">Browse workers <span>→</span></button><button class="button button-primary" data-view="cases">Open case board</button>') + notice + metrics + '<div class="content-grid">' + panel('Most reported needs', 'Calculated from answered questions across the current fictional worker set.', '<div class="chart-wrap" id="overviewPain"></div><p class="privacy-note">Counts and respondent percentages; unanswered items are excluded from question denominators.</p>', 5) + panel('Recent case activity', 'Latest case records and status updates.', table(recent, ['Worker', 'Category', 'Status', 'Assigned agent', 'Updated', '']), 7) + panel('Agency snapshot', 'This dashboard contains synthetic demonstration data only.', '<div class="key-value"><span>Workers in directory</span><strong>' + workers.length + '</strong></div><div class="key-value"><span>Cases in workspace</span><strong>' + cases.length + '</strong></div><div class="key-value"><span>Explicitly verified outcomes</span><strong>' + WAStore.getDatabase().outcomes.filter(function (item) { return Boolean(item.verifiedAt); }).length + '</strong></div><p class="privacy-note">Metrics are derived from source records. No actual agency performance is represented.</p>', 12) + '</div>';
    WACharts.horizontal(document.getElementById('overviewPain'), pain.map(function (item) { return { label: item.label, value: item.count, displayValue: item.count }; }), 'Most reported worker needs');
  }
  function painPoints(workers) {
    const answeredHealthcare = answerCount(workers, function (worker) { return worker.healthcareAffordable; });
    const output = [
      { label: 'Healthcare affordability', count: count(workers, function (worker) { return worker.healthcareAffordable === true; }), denominator: answeredHealthcare },
      { label: 'Low pay', count: concernsCount(workers, 'Low pay'), denominator: answerCount(workers, function (worker) { return worker.workplaceConcerns; }) },
      { label: 'Lack of benefits', count: concernsCount(workers, 'Lack of benefits'), denominator: answerCount(workers, function (worker) { return worker.workplaceConcerns; }) },
      { label: 'Missing payments', count: concernsCount(workers, 'Missing payments'), denominator: answerCount(workers, function (worker) { return worker.workplaceConcerns; }) },
      { label: 'Unpredictable income', count: count(workers, function (worker) { return worker.incomeConsistency === 'Somewhat unpredictable' || worker.incomeConsistency === 'Very unpredictable'; }), denominator: answerCount(workers, function (worker) { return worker.incomeConsistency; }) },
      { label: 'Platform deactivation', count: concernsCount(workers, 'Deactivation concern'), denominator: answerCount(workers, function (worker) { return worker.workplaceConcerns; }) },
      { label: 'Workplace safety', count: concernsCount(workers, 'Unsafe conditions'), denominator: answerCount(workers, function (worker) { return worker.workplaceConcerns; }) },
      { label: 'Difficulty accessing support', count: concernsCount(workers, 'Difficulty accessing support'), denominator: answerCount(workers, function (worker) { return worker.workplaceConcerns; }) }
    ];
    return output.sort(function (a, b) { return b.count - a.count; });
  }
  function workerDirectory() {
    const workers = allWorkers();
    const filters = state.directoryFilters || (state.directoryFilters = { q: '', type: '', borough: '', health: '', assistance: '', agent: '', status: '', from: '', to: '' });
    let list = workers.filter(function (worker) {
      const query = filters.q.trim().toLowerCase();
      if (query && ![worker.name, worker.id, worker.borough, (worker.platforms || []).join(' ')].join(' ').toLowerCase().includes(query)) return false;
      if (filters.type && worker.workerType !== filters.type) return false;
      if (filters.borough && worker.borough !== filters.borough) return false;
      if (filters.health && worker.insuranceStatus !== filters.health) return false;
      if (filters.assistance && worker.primaryAssistanceNeed !== filters.assistance && !(filters.assistance === 'Benefits' && list(worker.requestedBenefits).length)) return false;
      if (filters.agent && (filters.agent === 'unassigned' ? Boolean(worker.assignedAgentId) : worker.assignedAgentId !== filters.agent)) return false;
      if (filters.status && worker.caseStatus !== filters.status) return false;
      if (filters.from && new Date(worker.intakeDate) < new Date(filters.from)) return false;
      if (filters.to && new Date(worker.intakeDate) > new Date(filters.to + 'T23:59:59')) return false;
      return true;
    });
    list.sort(function (a, b) { const av = a[state.sort] || '', bv = b[state.sort] || ''; return String(av).localeCompare(String(bv)) * state.sortDir; });
    const total = list.length, pages = Math.max(1, Math.ceil(total / state.pageSize)); state.page = Math.min(state.page, pages);
    const pageRows = list.slice((state.page - 1) * state.pageSize, state.page * state.pageSize);
    const rows = pageRows.map(function (worker) { return '<tr><td class="name-cell">' + esc(worker.id) + '</td><td class="name-cell">' + esc(worker.name) + '</td><td>' + esc(worker.workerType) + '</td><td>' + esc(worker.borough) + '</td><td>' + esc(worker.insuranceStatus) + '</td><td>' + esc(worker.primaryAssistanceNeed) + '</td><td>' + esc(agentName(worker.assignedAgentId)) + '</td><td>' + pill(worker.caseStatus) + '</td><td>' + date(worker.intakeDate) + '</td><td><button class="table-action" data-action="open-worker" data-id="' + worker.id + '">View profile</button></td></tr>'; }).join('');
    const filter = '<div class="filter-bar"><div class="field field-wide search-box"><label for="workerSearch">Search name, ID, platform, borough</label><input id="workerSearch" data-directory="q" placeholder="Search workers" value="' + esc(filters.q) + '"></div><div class="field"><label>Worker type</label><select data-directory="type"><option value="">All types</option>' + WAMock.workerTypes.map(function (value) { return '<option ' + (filters.type === value ? 'selected' : '') + '>' + esc(value) + '</option>'; }).join('') + '</select></div><div class="field"><label>Borough</label><select data-directory="borough"><option value="">All boroughs</option>' + WAMock.boroughs.map(function (value) { return '<option ' + (filters.borough === value ? 'selected' : '') + '>' + esc(value) + '</option>'; }).join('') + '</select></div><div class="field"><label>Healthcare status</label><select data-directory="health"><option value="">All statuses</option>' + WAMock.insurance.map(function (value) { return '<option ' + (filters.health === value ? 'selected' : '') + '>' + esc(value) + '</option>'; }).join('') + '</select></div><div class="field"><label>Assistance</label><select data-directory="assistance"><option value="">All needs</option><option>Healthcare</option><option>Worker Rights</option><option>Benefits</option><option>General Support</option></select></div><div class="field"><label>Assigned agent</label><select data-directory="agent"><option value="">All agents</option><option value="unassigned">Unassigned</option>' + allAgents().map(function (agent) { return '<option value="' + agent.id + '" ' + (filters.agent === agent.id ? 'selected' : '') + '>' + esc(agent.name) + '</option>'; }).join('') + '</select></div><div class="field"><label>Case status</label><select data-directory="status"><option value="">All statuses</option>' + statusList.map(function (value) { return '<option ' + (filters.status === value ? 'selected' : '') + '>' + esc(value) + '</option>'; }).join('') + '</select></div><div class="field"><label>Registered from</label><input type="date" data-directory="from" value="' + esc(filters.from) + '"></div><div class="field"><label>Registered to</label><input type="date" data-directory="to" value="' + esc(filters.to) + '"></div><div class="field-actions"><button class="button button-sm" data-action="clear-directory">Clear</button><button class="button button-sm" data-action="export-workers">⇩ CSV</button></div></div>';
    const sortHead = function (label, key) { return '<th><button class="table-action" data-action="sort-workers" data-key="' + key + '">' + label + (state.sort === key ? (state.sortDir === 1 ? ' ↑' : ' ↓') : '') + '</button></th>'; };
    const heads = [sortHead('Worker ID', 'id'), sortHead('Worker name', 'name'), sortHead('Worker type', 'workerType'), sortHead('Borough', 'borough'), '<th>Healthcare</th>', '<th>Primary need</th>', '<th>Assigned agent</th>', sortHead('Case status', 'caseStatus'), sortHead('Registered', 'intakeDate'), '<th>Action</th>'];
    main.innerHTML = head('Workers', 'Search the simulated worker directory and open authorized case details.', '<button class="button" data-action="export-workers">⇩ Export CSV</button>') + '<div class="notice"><span>ⓘ</span><span>Demo contacts are fictional placeholders. Organizing interest is kept in a separate restricted collection and is not included in this directory.</span></div>' + filter + '<section class="panel"><div class="panel-head"><div><h2 class="panel-title">Worker directory</h2><p class="panel-subtitle">' + total + ' matching records · multiple filters can be combined</p></div></div>' + (rows ? table(rows, heads) : '<div class="empty-state"><strong>No workers match these filters</strong>Clear one or more filters to see records.</div>') + '<div class="table-footer"><span>Showing ' + (total ? (state.page - 1) * state.pageSize + 1 : 0) + '–' + Math.min(state.page * state.pageSize, total) + ' of ' + total + '</span><div class="pagination"><button class="button button-sm" data-action="page" data-page="' + Math.max(1, state.page - 1) + '" ' + (state.page <= 1 ? 'disabled' : '') + '>← Prev</button><span>Page ' + state.page + ' of ' + pages + '</span><button class="button button-sm" data-action="page" data-page="' + Math.min(pages, state.page + 1) + '" ' + (state.page >= pages ? 'disabled' : '') + '>Next →</button></div></div></section>';
  }
  function fieldRow(label, value) { return '<div class="detail-row"><label>' + label + '</label><strong>' + esc(val(value)) + '</strong></div>'; }
  function profile() {
    const worker = WAStore.getWorkerById(state.workerId);
    if (!worker) { state.view = 'workers'; return render(); }
    const cases = WAStore.getCasesByWorker(worker.id).filter(function (record) { return state.role === 'admin' || roleCaseCategories(state.role).includes(record.category); });
    const summaryParts = [worker.name + ' is a simulated ' + val(worker.workerType), 'based in ' + val(worker.borough), 'typically working ' + val(worker.weeklyHours) + ' hours per week'];
    if (state.role === 'admin' || state.role === 'healthcare') summaryParts.push(worker.insuranceStatus === 'Uninsured' ? 'reported being uninsured' : worker.insuranceStatus && worker.insuranceStatus !== 'Not provided' ? 'reported ' + worker.insuranceStatus.toLowerCase() + ' coverage' : '', worker.healthcareAffordable === true ? 'reported coverage affordability concerns' : '');
    if (state.role === 'admin' || state.role === 'rights') summaryParts.push(list(worker.workplaceConcerns).length ? 'reported concerns about ' + list(worker.workplaceConcerns).join(', ').toLowerCase() : '');
    if (state.role === 'admin' || state.role === 'benefits') summaryParts.push(list(worker.requestedBenefits).length ? 'requested ' + list(worker.requestedBenefits).join(', ').toLowerCase() : '');
    const demoSummary = summaryParts.filter(Boolean).join(', ') + '.';
    const tabs = state.role === 'healthcare' ? ['Overview', 'Healthcare', 'Case History', 'Agent Notes'] : state.role === 'benefits' ? ['Overview', 'Benefits', 'Case History', 'Agent Notes'] : state.role === 'rights' ? ['Overview', 'Employment & Income', 'Case History', 'Agent Notes'] : ['Overview', 'Employment & Income', 'Healthcare', 'Benefits', 'Case History', 'Agent Notes'];
    if (!tabs.includes(state.profileTab)) state.profileTab = tabs[0];
    let body = '';
    if (state.profileTab === 'Overview') body = '<p class="summary-copy">' + esc(demoSummary) + '</p><div class="detail-grid">' + fieldRow('Worker ID', worker.id) + fieldRow('Preferred language', worker.language) + fieldRow('Registration date', date(worker.intakeDate)) + fieldRow('Assigned agent', agentName(worker.assignedAgentId)) + fieldRow('Overall case status', worker.caseStatus) + fieldRow('Primary assistance need', worker.primaryAssistanceNeed) + fieldRow('Estimated savings (unverified)', worker.estimatedSavings) + fieldRow('Verified savings', worker.verifiedSavings) + '</div><h3 class="panel-title" style="margin:20px 0 8px">Open cases</h3>' + (cases.length ? cases.map(function (record) { return '<div class="key-value"><span>' + esc(record.category) + ' · ' + esc(record.id) + '</span><strong>' + pill(record.status) + '</strong></div>'; }).join('') : '<p class="privacy-note">No case records attached to this profile.</p>');
    if (state.profileTab === 'Employment & Income') body = '<div class="detail-grid">' + fieldRow('Worker type', worker.workerType) + fieldRow('Platforms', worker.platforms) + fieldRow('Weekly hours', worker.weeklyHours) + fieldRow('Weekly income range', worker.weeklyIncome) + fieldRow('Work-related expenses', worker.workExpenses) + fieldRow('Income consistency', worker.incomeConsistency) + fieldRow('Pay satisfaction', worker.paySatisfaction) + fieldRow('Reported workplace concerns', worker.workplaceConcerns) + fieldRow('Wage assistance need', worker.wageAssistanceNeed) + fieldRow('Safety concerns', worker.safetyConcerns) + fieldRow('Deactivation concern', worker.deactivationConcern) + '</div>';
    if (state.profileTab === 'Healthcare') body = '<div class="detail-grid">' + fieldRow('Insurance status', worker.insuranceStatus) + fieldRow('Coverage affordability', worker.healthcareAffordable) + fieldRow('Reported coverage barriers', worker.healthcareBarriers) + fieldRow('Healthcare assistance requested', worker.healthcareAssistance) + fieldRow('Healthcare case status', worker.healthcareCaseStatus) + fieldRow('Referrals', WAStore.getDatabase().referrals.filter(function (item) { return item.workerId === worker.id; }).map(function (item) { return item.service + ' (' + item.status + ')'; })) + '</div><p class="privacy-note">No insurance eligibility conclusions or medical diagnoses are stored.</p>';
    if (state.profileTab === 'Benefits') body = '<div class="detail-grid">' + fieldRow('Requested benefits', worker.requestedBenefits) + fieldRow('Primary priority', worker.primaryPriority) + fieldRow('Benefits assistance status', worker.benefitsAssistanceStatus) + fieldRow('Applications supported', worker.applicationsSupported) + '</div>';
    if (state.profileTab === 'Case History') {
      const activities = WAStore.getActivities(worker.id).filter(function (activity) { return state.role === 'admin' || activity.type !== 'Note added' && (!activity.caseId || cases.some(function (record) { return record.id === activity.caseId; })); }).slice().sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
      const notes = notesForRole(worker.id).map(function (note) { return { createdAt: note.createdAt, type: 'Note added', message: note.category + ' note recorded' }; });
      const events = [{ createdAt: worker.intakeDate, type: 'Intake completed', message: 'Simulated intake record created' }].concat(activities, notes).sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
      body = '<div class="timeline">' + events.map(function (item) { return '<div class="timeline-item"><strong>' + esc(item.type) + '</strong><small>' + date(item.createdAt) + '</small><p>' + esc(item.message) + '</p></div>'; }).join('') + '</div>';
    }
    if (state.profileTab === 'Agent Notes') {
      const notes = notesForRole(worker.id);
      body = '<div class="head-actions" style="justify-content:flex-start;margin-bottom:12px"><button class="button button-primary button-sm" data-action="note" data-id="' + worker.id + '">＋ Add note</button></div>' + (notes.length ? notes.map(function (note) { return '<article class="panel" style="padding:12px;margin-bottom:8px;box-shadow:none"><div class="case-card-top"><strong>' + esc(note.category) + (note.internal ? ' · Internal' : '') + '</strong><small class="privacy-note">' + date(note.createdAt) + '</small></div><p class="summary-copy" style="font-size:11px;margin:9px 0">' + esc(note.text) + '</p><small class="privacy-note">' + esc(note.author) + (note.author === roleNames[state.role] ? ' · ' + '<button class="table-action" data-action="edit-note" data-id="' + note.id + '">Edit</button>' : '') + '</small></article>'; }).join('') : '<div class="empty-state"><strong>No agent notes</strong>Notes are only created through an explicit agent action.</div>');
    }
    const actions = '<button class="button button-sm" data-action="assign-worker" data-id="' + worker.id + '">Assign agent</button><button class="button button-sm" data-action="note" data-id="' + worker.id + '">＋ Add note</button><button class="button button-sm" data-action="create-case" data-id="' + worker.id + '">＋ Create case</button><button class="button button-sm" data-action="schedule-worker" data-id="' + worker.id + '">Schedule follow-up</button><button class="button button-sm" data-action="profile-referral" data-id="' + worker.id + '">Record referral</button><button class="button button-sm" data-action="status-worker" data-id="' + worker.id + '">Update status</button>';
    main.innerHTML = '<div class="page-head"><div class="page-head-copy"><div class="eyebrow">SIMULATED WORKER RECORD</div><div class="profile-head"><div class="profile-avatar">' + initials(worker.name) + '</div><div><h1 class="profile-title">' + esc(worker.name) + '</h1><div class="profile-subline">' + esc(worker.id) + ' · ' + esc(worker.workerType) + ' · ' + esc((worker.platforms || []).join(', ')) + ' · ' + esc(worker.borough) + ' · ' + date(worker.intakeDate) + '</div><div style="margin-top:7px">' + pill(worker.caseStatus) + ' <span class="privacy-note">Assigned to ' + esc(agentName(worker.assignedAgentId)) + '</span></div></div></div></div><div class="head-actions"><button class="button button-sm" data-view="workers">← Directory</button></div></div><div class="profile-actions" style="margin:-7px 0 17px">' + actions + '</div><section class="panel"><div class="panel-body"><div class="tabs">' + tabs.map(function (tab) { return '<button class="tab-button ' + (state.profileTab === tab ? 'active' : '') + '" data-action="profile-tab" data-tab="' + esc(tab) + '">' + esc(tab) + '</button>'; }).join('') + '</div>' + body + '</div></section><p class="privacy-note" style="margin-top:12px">This role preview is a UI demonstration, not authentication or access control. Use synthetic data only.</p>';
  }
  function caseCard(record) {
    const worker = WAStore.getWorkerById(record.workerId);
    const overdue = record.followUpDate && new Date(record.followUpDate) < new Date(new Date().toDateString());
    return '<article class="case-card ' + (overdue ? 'overdue' : '') + '" draggable="true" tabindex="0" data-case="' + record.id + '" aria-label="' + esc(record.category + ' case for ' + (worker ? worker.name : record.workerId)) + '"><div class="case-card-top"><span class="case-card-id">' + esc(record.id) + '</span><span class="priority-pill priority-' + slug(record.priority) + '">' + esc(record.priority) + '</span></div><strong class="case-card-name">' + esc(worker ? worker.name : record.workerId) + '</strong><div class="case-card-meta"><span>' + esc(record.category) + '</span><span>' + esc(agentName(record.assignedAgentId)) + '</span></div><div class="case-card-meta"><span>Updated ' + date(record.updatedAt) + '</span><span>' + (record.followUpDate ? 'Follow-up ' + date(record.followUpDate) : 'No follow-up') + '</span></div><select aria-label="Change case status" data-action="case-status" data-id="' + record.id + '">' + statusList.map(function (status) { return '<option ' + (record.status === status ? 'selected' : '') + '>' + esc(status) + '</option>'; }).join('') + '</select><button class="table-action" data-action="case-detail" data-id="' + record.id + '">Open case actions →</button><button class="table-action" data-action="case-contact" data-id="' + record.id + '">Record contact attempt</button><button class="table-action" data-action="case-outcome" data-id="' + record.id + '">Record outcome</button><button class="table-action" data-action="verify-outcomes" data-id="' + record.id + '">Verify outcome</button></article>';
  }
  function casesView() {
    let cases = allCases();
    if (state.role !== 'admin') {
      const categories = roleCaseCategories(state.role);
      cases = cases.filter(function (record) { return categories.includes(record.category); });
    }
    const columns = statusList.map(function (status) { const items = cases.filter(function (record) { return record.status === status; }); return '<section class="board-column" data-drop-status="' + esc(status) + '"><div class="board-column-head"><span>' + esc(status) + '</span><span>' + items.length + '</span></div>' + items.map(caseCard).join('') + '</section>'; }).join('');
    main.innerHTML = head('Cases', 'Track case work across teams. Drag a card to change status, or use its status menu.', '<button class="button" data-action="reset-workflow">↺ Reset workflow</button><button class="button button-primary" data-action="create-case">＋ Create case</button>') + '<div class="notice"><span>↔</span><span>Status changes update the case record and dashboard metrics. Use the status menu for keyboard and mobile access.</span></div><div class="board" id="caseBoard">' + columns + '</div>';
  }
  function distribution(workers, key) {
    const counts = {}; workers.forEach(function (worker) { const value = worker[key]; if (value !== null && value !== undefined && value !== '') counts[value] = (counts[value] || 0) + 1; });
    return Object.keys(counts).map(function (label) { return { label, value: counts[label] }; }).sort(function (a, b) { return b.value - a.value; });
  }
  function healthcareView() {
    const workers = currentFilters(), metrics = healthCounts(workers);
    const coverage = distribution(workers, 'insuranceStatus');
    const types = Array.from(new Set(workers.map(function (worker) { return worker.workerType; }).filter(Boolean))).map(function (type) { const members = workers.filter(function (worker) { return worker.workerType === type; }); const answered = answerCount(members, function (worker) { return worker.healthcareAffordable; }); const n = count(members, function (worker) { return worker.healthcareAffordable === true; }); return { label: type.replace(/ worker| driver/gi, ''), value: n, displayValue: (pct(n, answered) === null ? '—' : pct(n, answered) + '%'), count: n, sample: answered }; }).filter(function (item) { return item.sample; });
    const barriers = WAMock.categories.length && ['Cost', 'Lack of information', 'Potential eligibility concerns', 'Loss of previous coverage', 'Finding in-network care', 'Other reported barrier'].map(function (label) { return { label, value: count(workers, function (worker) { return (worker.healthcareBarriers || []).includes(label); }) }; });
    const byBorough = WAMock.boroughs.map(function (borough) { const sample = workers.filter(function (worker) { return worker.borough === borough; }); return { label: borough, value: count(sample, function (worker) { return worker.healthcareAssistance === true; }), displayValue: count(sample, function (worker) { return worker.healthcareAssistance === true; }) + ' / ' + sample.length }; });
    const metricsHtml = '<div class="metrics-grid">' + metric('Uninsured workers', metrics.uninsured, 'Of ' + workers.length + ' filtered workers', '♡') + metric('Medicaid coverage', metrics.medicaid, 'Reported coverage status', '＋') + metric('Marketplace coverage', metrics.marketplace, 'Reported coverage status', '▧') + metric('Employer coverage', metrics.employer, 'Reported coverage status', '▣') + metric('Unaffordable coverage', metrics.unaffordable, percentageNote(metrics.unaffordable, metrics.affordableAnswered, 'reported coverage as too expensive'), '↗') + metric('Enrollment assistance', metrics.assistance, 'Workers requesting healthcare assistance', '→') + '</div>';
    main.innerHTML = head('Healthcare', 'Worker-reported coverage status, affordability, and assistance requests.', '<span class="tag">Self-reported · ' + workers.length + ' in sample</span>') + globalFilterBar() + metricsHtml + '<div class="content-grid">' + panel('Insurance coverage distribution', 'Reported insurance status; unanswered records excluded.', '<div class="chart-wrap" id="coverageDonut"></div>' + chartTable(coverage), 6) + panel('Affordability by worker type', 'Share reporting coverage as unaffordable; n is answered affordability responses.', '<div class="chart-wrap" id="healthByType"></div><p class="privacy-note">Bar labels show percentages; hover for answered count.</p>', 6) + panel('Reported healthcare barriers', 'Workers may select more than one barrier.', '<div class="chart-wrap" id="healthBarriers"></div>' + chartTable(barriers), 6) + panel('Healthcare requests by borough', 'Counts by borough; sample size shown in the table.', '<div class="chart-wrap" id="healthBorough"></div>' + chartTable(byBorough), 6) + '</div><p class="privacy-note">These fictional records do not indicate eligibility for coverage or an individual premium amount.</p>';
    WACharts.donut(document.getElementById('coverageDonut'), coverage, 'Insurance status distribution');
    WACharts.vertical(document.getElementById('healthByType'), types.map(function (item) { return { label: item.label, value: item.value / Math.max(1, item.sample) * 100, displayValue: item.displayValue }; }), 'Affordability by worker type');
    WACharts.horizontal(document.getElementById('healthBarriers'), barriers, 'Reported healthcare barriers'); WACharts.horizontal(document.getElementById('healthBorough'), byBorough, 'Healthcare assistance by borough');
    attachChartData('healthByType', types);
  }
  function chartTable(rows) { return '<details class="chart-data"><summary class="privacy-note">View chart data</summary>' + table((rows || []).map(function (item) { return '<tr><td>' + esc(item.label) + '</td><td>' + esc(item.displayValue === undefined ? item.value : item.displayValue) + '</td>' + (item.sample !== undefined ? '<td>' + item.count + ' / ' + item.sample + '</td>' : '') + '</tr>'; }).join(''), ['Category', 'Value', (rows || []).some(function (item) { return item.sample !== undefined; }) ? 'Count / answered' : '']) + '</details>'; }
  function attachChartData(targetId, rows) { const target = document.getElementById(targetId); if (target) target.insertAdjacentHTML('afterend', chartTable(rows)); }
  function rightsView() {
    const workers = currentFilters();
    const issueLabels = ['Low pay', 'Missing payments', 'Unpaid work time', 'Unpredictable income', 'Deactivation concern', 'Unsafe conditions', 'Lack of benefits', 'Difficulty accessing support'];
    const issues = issueLabels.map(function (label) { return { label, value: concernsCount(workers, label) }; }).sort(function (a, b) { return b.value - a.value; });
    const kpis = [ ['Low pay', concernsCount(workers, 'Low pay')], ['Missing payments', concernsCount(workers, 'Missing payments')], ['Unpaid work time', concernsCount(workers, 'Unpaid work time')], ['Deactivation concern', concernsCount(workers, 'Deactivation concern')], ['Unsafe conditions', concernsCount(workers, 'Unsafe conditions')], ['Rights assistance', count(workers, function (worker) { return worker.primaryAssistanceNeed === 'Worker Rights' || worker.wageAssistanceNeed === true; })] ];
    const platforms = ['Uber', 'Lyft', 'DoorDash', 'Uber Eats', 'Other'];
    const stackRows = WAMock.boroughs.slice(0, 5).map(function (borough) { const group = workers.filter(function (worker) { return worker.borough === borough; }); return { label: borough, values: { 'Low pay': concernsCount(group, 'Low pay'), 'Missing payments': concernsCount(group, 'Missing payments'), 'Safety': concernsCount(group, 'Unsafe conditions') } }; });
    const platformRows = platforms.map(function (platform) { const group = workers.filter(function (worker) { return (worker.platforms || []).some(function (value) { return platform === 'Other' ? !['Uber', 'Lyft', 'DoorDash', 'Uber Eats'].includes(value) : value === platform; }); }); return { label: platform, values: { 'Low pay': concernsCount(group, 'Low pay'), 'Missing payments': concernsCount(group, 'Missing payments'), 'Deactivation': concernsCount(group, 'Deactivation concern') } }; });
    const satisfaction = Array.from(new Set(workers.map(function (worker) { return worker.workerType; }).filter(Boolean))).map(function (type) { const group = workers.filter(function (worker) { return worker.workerType === type; }); const answered = answerCount(group, function (worker) { return worker.paySatisfaction; }); const dissat = count(group, function (worker) { return worker.paySatisfaction === 'Dissatisfied'; }); return { label: type.replace(/ worker| driver/gi, ''), value: answered ? dissat / answered * 100 : 0, displayValue: answered ? Math.round(dissat / answered * 100) + '%' : '—', count: dissat, sample: answered }; }).filter(function (item) { return item.value > 0; });
    const trend = monthlyTrend(workers, 'rights');
    main.innerHTML = head('Worker Rights', 'Patterns in reported pay, platform, and workplace concerns. Reports are not verified legal findings.', '<span class="tag">Self-reported · ' + workers.length + ' in sample</span>') + globalFilterBar() + '<div class="metrics-grid">' + kpis.map(function (item, index) { return metric(item[0], item[1], 'Worker-reported concern', ['↓', '$', '◷', '!', '⚠', '⚖'][index]); }).join('') + '</div><div class="content-grid">' + panel('Top workplace problems', 'Selected concerns, not verified legal violations.', '<div class="chart-wrap" id="rightsIssues"></div>' + chartTable(issues), 6) + panel('Problems by platform', 'Workers can report more than one issue; platform overlaps are possible.', '<div class="chart-wrap" id="rightsPlatforms"></div><div class="legend-row"><span class="legend-item"><i class="legend-swatch"></i>Low pay</span><span class="legend-item"><i class="legend-swatch" style="background:#467db1"></i>Missing payments</span><span class="legend-item"><i class="legend-swatch" style="background:#e3a04b"></i>Deactivation</span></div>', 6) + panel('Pay satisfaction by worker type', 'Share of answered pay-satisfaction responses marked dissatisfied.', '<div class="chart-wrap" id="rightsSatisfaction"></div>', 6) + panel('Worker concerns by borough', 'Counts of reported concerns across respondents.', '<div class="chart-wrap" id="rightsBorough"></div>', 6) + panel('Rights assistance trends', 'Intake counts by month in the selected time window; no causal conclusions.', '<div class="chart-wrap" id="rightsTrend"></div>', 12) + '</div><p class="privacy-note">General rights analytics exclude individual organizing interest.</p>';
    WACharts.horizontal(document.getElementById('rightsIssues'), issues, 'Top self-reported workplace problems'); WACharts.stacked(document.getElementById('rightsPlatforms'), platformRows, ['Low pay', 'Missing payments', 'Deactivation'], 'Reported problems by platform'); WACharts.vertical(document.getElementById('rightsSatisfaction'), satisfaction, 'Dissatisfied pay responses'); WACharts.stacked(document.getElementById('rightsBorough'), stackRows, ['Low pay', 'Missing payments', 'Safety'], 'Reported concerns by borough'); WACharts.line(document.getElementById('rightsTrend'), trend, 'Rights-related concern intake over time');
    attachChartData('rightsPlatforms', platformRows.flatMap(function (row) { return Object.keys(row.values).map(function (key) { return { label: row.label + ' · ' + key, value: row.values[key] }; }); }));
    attachChartData('rightsSatisfaction', satisfaction); attachChartData('rightsBorough', stackRows.flatMap(function (row) { return Object.keys(row.values).map(function (key) { return { label: row.label + ' · ' + key, value: row.values[key] }; }); })); attachChartData('rightsTrend', trend);
  }
  function benefitsView() {
    const workers = currentFilters();
    const names = ['Affordable healthcare', 'Dental', 'Vision', 'Paid leave', 'Disability protection', 'Retirement', 'Tax help', 'Legal assistance', 'Emergency support', 'Training'];
    const demand = names.map(function (label) { return { label, value: count(workers, function (worker) { return (worker.requestedBenefits || []).includes(label); }) }; }).sort(function (a, b) { return b.value - a.value; });
    const groupChart = function (key, labels) { return labels.map(function (label) { const sample = workers.filter(function (worker) { return worker[key] === label || key === 'platforms' && (worker.platforms || []).includes(label); }); const answered = answerCount(sample, function (worker) { return worker.requestedBenefits; }); const requests = count(sample, function (worker) { return list(worker.requestedBenefits).length > 0; }); return { label, value: pct(requests, answered) || 0, displayValue: (pct(requests, answered) || 0) + '%', count: requests, sample: answered }; }); };
    const industries = Array.from(new Set(workers.map(function (worker) { return worker.workerType; }).filter(Boolean)));
    const boroughRows = groupChart('borough', WAMock.boroughs);
    const incomeRows = groupChart('weeklyIncome', Array.from(new Set(workers.map(function (worker) { return worker.weeklyIncome; }).filter(Boolean))));
    const classRows = groupChart('workerType', industries);
    const industryRows = groupChart('platforms', Array.from(new Set(workers.flatMap(function (worker) { return worker.platforms || []; }))).slice(0, 9));
    main.innerHTML = head('Benefits', 'Understand demand across selected benefits and compare worker groups.', '<span class="tag">' + workers.length + ' workers in sample</span>') + globalFilterBar() + '<div class="metrics-grid">' + metric('Workers requesting benefits', count(workers, function (worker) { return list(worker.requestedBenefits).length > 0; }), 'Multiple selections are allowed', '◇') + metric('Most requested', demand[0] ? demand[0].label : 'N/A', (demand[0] ? demand[0].value : 0) + ' selections', '↗') + metric('Benefits assistance in progress', count(workers, function (worker) { return worker.benefitsAssistanceStatus === 'In progress'; }), 'Current recorded case status', '◷') + '</div><div class="content-grid">' + panel('Most requested benefits', 'Multiple-select answers; percentages may total more than 100%.', '<div class="chart-wrap" id="benefitDemand"></div>' + chartTable(demand), 12) + panel('Demand by platform', 'Workers may use multiple platforms.', '<div class="chart-wrap" id="benefitIndustry"></div>', 6) + panel('Demand by borough', 'Requesting workers / workers in group.', '<div class="chart-wrap" id="benefitBorough"></div>' + chartTable(boroughRows), 6) + panel('Demand by weekly income range', 'Requesting workers / workers in group.', '<div class="chart-wrap" id="benefitIncome"></div>', 6) + panel('Demand by worker type', 'Requesting workers / workers in group.', '<div class="chart-wrap" id="benefitType"></div>', 6) + '</div>';
    WACharts.horizontal(document.getElementById('benefitDemand'), demand, 'Most requested benefits'); WACharts.horizontal(document.getElementById('benefitIndustry'), industryRows, 'Benefits requests by platform'); WACharts.horizontal(document.getElementById('benefitBorough'), boroughRows, 'Benefits demand by borough'); WACharts.horizontal(document.getElementById('benefitIncome'), incomeRows, 'Benefits demand by income range'); WACharts.horizontal(document.getElementById('benefitType'), classRows, 'Benefits demand by worker type');
    attachChartData('benefitIndustry', industryRows); attachChartData('benefitIncome', incomeRows); attachChartData('benefitType', classRows);
  }
  function industry(worker) {
    if (/delivery|doordash|grubhub|eats/i.test(worker.workerType)) return 'Food delivery';
    if (/uber driver|lyft/i.test(worker.workerType)) return 'Rideshare';
    if (/freelance/i.test(worker.workerType)) return 'Freelance';
    if (/taskrabbit|cleaner/i.test(worker.workerType)) return 'Task-based gigs';
    return 'Other gig work';
  }
  function needsIntelligence() {
    const workers = currentFilters(); const pains = painPoints(workers);
    const groups = ['Food delivery', 'Rideshare', 'Freelance', 'Task-based gigs', 'Other gig work'];
    const needs = ['Healthcare', 'Fair pay', 'Worker rights', 'Benefits'];
    const heatRows = groups.map(function (group) {
      const sample = workers.filter(function (worker) { return industry(worker) === group; }); const values = {};
      needs.forEach(function (need) {
        const getNeed = function (worker) { if (need === 'Healthcare') return worker.healthcareAffordable === true || worker.insuranceStatus === 'Uninsured'; if (need === 'Fair pay') return list(worker.workplaceConcerns).includes('Low pay'); if (need === 'Worker rights') return list(worker.workplaceConcerns).some(function (concern) { return ['Missing payments', 'Unpaid work time', 'Deactivation concern', 'Unsafe conditions'].includes(concern); }); return list(worker.requestedBenefits).length > 0; };
        const getAnswered = function (worker) { if (need === 'Healthcare') return worker.healthcareAffordable !== null && worker.healthcareAffordable !== undefined || worker.insuranceStatus !== null && worker.insuranceStatus !== undefined && worker.insuranceStatus !== 'Not provided'; if (need === 'Benefits') return worker.requestedBenefits !== null && worker.requestedBenefits !== undefined; return worker.workplaceConcerns !== null && worker.workplaceConcerns !== undefined; };
        const answered = count(sample, getAnswered); const num = count(sample, function (worker) { return getAnswered(worker) && getNeed(worker); });
        values[need] = { percent: pct(num, answered) || 0, count: num, sample: answered };
      }); return { label: group, values };
    });
    const boroughRows = WAMock.boroughs.map(function (borough) { const group = workers.filter(function (worker) { return worker.borough === borough; }); const denominator = answerCount(group, function (worker) { return worker.healthcareAffordable; }); const numerator = count(group, function (worker) { return worker.healthcareAffordable === true; }); return { label: borough, value: pct(numerator, denominator) || 0, displayValue: (pct(numerator, denominator) || 0) + '%', sample: denominator }; });
    const pairs = [
      ['Uninsured + low pay', function (worker) { return worker.insuranceStatus === 'Uninsured' && list(worker.workplaceConcerns).includes('Low pay'); }],
      ['Uninsured + unpredictable income', function (worker) { return worker.insuranceStatus === 'Uninsured' && (worker.incomeConsistency === 'Very unpredictable' || worker.incomeConsistency === 'Somewhat unpredictable'); }],
      ['Low pay + missing payments', function (worker) { return list(worker.workplaceConcerns).includes('Low pay') && list(worker.workplaceConcerns).includes('Missing payments'); }],
      ['No benefits + 36+ hours', function (worker) { return worker.requestedBenefits !== null && worker.requestedBenefits !== undefined && !list(worker.requestedBenefits).length && ['36–50', 'Over 50'].includes(worker.weeklyHours); }]
    ].map(function (item) { return { label: item[0], value: count(workers, item[1]) }; }).sort(function (a, b) { return b.value - a.value; });
    const scope = state.globalFilters.period === 'all' ? 'all available intake dates' : 'last ' + state.globalFilters.period + ' days';
    const recommendations = [];
    const health = healthCounts(workers);
    if (health.affordableAnswered && health.unaffordable / health.affordableAnswered > .35) recommendations.push('Healthcare affordability was reported by ' + pct(health.unaffordable, health.affordableAnswered) + '% of respondents with an answer (' + health.unaffordable + ' of ' + health.affordableAnswered + ') in ' + scope + '. Consider expanding insurance-navigation capacity.');
    const lowPay = concernsCount(workers, 'Low pay'); const expenseConcern = count(workers, function (worker) { return worker.workExpenses && worker.workExpenses !== 'Not provided' && list(worker.workplaceConcerns).includes('Low pay'); });
    if (lowPay) recommendations.push(lowPay + ' workers selected low pay; ' + expenseConcern + ' of them also recorded a work-expense range, in ' + scope + '. Consider offering earnings and expense education.');
    const trendBenefits = count(workers, function (worker) { return list(worker.requestedBenefits).length > 0; });
    if (trendBenefits) recommendations.push(trendBenefits + ' workers selected at least one benefit in ' + scope + '. Consider reviewing referral-partner capacity.');
    main.innerHTML = head('Worker Needs Intelligence', 'Compare documented needs across worker groups and boroughs. This synthetic sample is not representative of NYC.', '<span class="tag">' + workers.length + ' workers in sample</span>') + globalFilterBar() + '<div class="content-grid">' + panel('A · Top worker pain points', 'Question-specific denominator is shown; unanswered responses are excluded.', '<div class="chart-wrap" id="intelPains"></div>' + table(pains.slice(0, 8).map(function (item) { return '<tr><td>' + esc(item.label) + '</td><td>' + item.count + '</td><td>' + (item.denominator ? pct(item.count, item.denominator) + '% of ' + item.denominator : 'No answers') + '</td></tr>'; }).join(''), ['Documented need', 'Workers', 'Respondent share']), 7) + panel('B · Worker needs by industry', 'Percent in group reporting each need; n shown per cell.', '<div class="chart-wrap" id="intelHeat"></div><p class="privacy-note">Healthcare reflects uninsured or unaffordable response; other columns use direct selections.</p>', 5) + panel('C · Geographic analysis', 'Share of answered affordability responses by borough.', '<div class="chart-wrap" id="intelBorough"></div>' + chartTable(boroughRows.map(function (row) { return { label: row.label, value: row.displayValue, sample: row.sample }; })), 6) + panel('D · Common problem combinations', 'Combinations derived from recorded selections only.', '<div class="chart-wrap" id="intelPairs"></div>' + chartTable(pairs), 6) + panel('E · Emerging trends', 'Monthly reported need counts within the selected intake period.', '<div class="chart-wrap" id="intelTrend"></div><p class="privacy-note">Trends describe recorded intake dates; they do not establish cause.</p>', 6) + panel('F · Where Should We Focus Next?', 'Suggested strategic actions based on transparent rules, not definitive AI findings.', '<div class="insight-list">' + (recommendations.length ? recommendations.map(function (text, index) { return '<div class="insight-row"><span class="insight-number">' + (index + 1) + '</span><div><strong>Suggested action</strong><small>' + esc(text) + '</small></div></div>'; }).join('') : '<div class="empty-state">No recommendations for the current sample.</div>') + '</div>', 6) + '</div><p class="privacy-note">All values are calculated from the filtered records in the browser. Results are synthetic and not representative of NYC workers.</p>';
    WACharts.horizontal(document.getElementById('intelPains'), pains.slice(0, 8).map(function (item) { return { label: item.label, value: item.count }; }), 'Top worker pain points'); WACharts.heatmap(document.getElementById('intelHeat'), heatRows, needs, 'Worker needs by industry'); WACharts.horizontal(document.getElementById('intelBorough'), boroughRows.map(function (row) { return { label: row.label, value: row.value, displayValue: row.displayValue }; }), 'Healthcare affordability by borough'); WACharts.horizontal(document.getElementById('intelPairs'), pairs, 'Common problem combinations'); WACharts.line(document.getElementById('intelTrend'), monthlyTrend(workers, 'all'), 'Worker-reported concerns over time');
    attachChartData('intelHeat', heatRows.flatMap(function (row) { return needs.map(function (need) { const cell = row.values[need]; return { label: row.label + ' · ' + need, value: cell.percent + '%', displayValue: cell.percent + '%', count: cell.count, sample: cell.sample }; }); }));
  }
  function monthlyTrend(workers, mode) {
    const buckets = {};
    workers.forEach(function (worker) {
      const dateValue = new Date(worker.intakeDate);
      if (Number.isNaN(dateValue.getTime())) return;
      const key = dateValue.getFullYear() + '-' + String(dateValue.getMonth() + 1).padStart(2, '0');
      buckets[key] = (buckets[key] || 0) + (mode === 'rights' ? list(worker.workplaceConcerns).length : list(worker.workplaceConcerns).length + list(worker.requestedBenefits).length + (worker.healthcareAssistance ? 1 : 0));
    });
    return Object.keys(buckets).sort().slice(-8).map(function (key) { const parts = key.split('-'); return { label: new Date(Number(parts[0]), Number(parts[1]) - 1).toLocaleDateString(undefined, { month: 'short', year: '2-digit' }), value: buckets[key] }; });
  }
  function agentsView() {
    const agents = allAgents(); const cases = allCases();
    const rows = agents.map(function (agent) {
      const assigned = cases.filter(function (record) { return record.assignedAgentId === agent.id; });
      const active = assigned.filter(function (record) { return !['Resolved', 'Closed'].includes(record.status); });
      const resolved = assigned.filter(function (record) { return ['Resolved', 'Closed'].includes(record.status); });
      const overdue = assigned.filter(function (record) { return record.followUpDate && new Date(record.followUpDate) < new Date(new Date().toDateString()) && !['Resolved', 'Closed'].includes(record.status); });
      const verified = WAStore.getDatabase().outcomes.filter(function (item) { return item.verifiedAt && assigned.some(function (record) { return record.id === item.caseId; }); }).length;
      return '<tr><td class="name-cell">' + esc(agent.name) + '</td><td>' + esc(agent.team) + '</td><td>' + assigned.length + '</td><td>' + active.length + '</td><td>' + resolved.length + '</td><td>Not available</td><td>' + overdue.length + '</td><td>' + verified + '</td></tr>';
    }).join('');
    main.innerHTML = head('Agent Performance', 'Operational workload and follow-up visibility. Case volume is not a quality score.', '') + '<div class="notice"><span>ⓘ</span><span>Response-time and resolution-duration metrics are unavailable until actual event timestamps exist. Verified outcomes require a separate explicit action.</span></div><section class="panel">' + table(rows, ['Agent', 'Team', 'Cases assigned', 'Active', 'Resolved', 'Avg. response time', 'Overdue follow-ups', 'Verified outcomes']) + '</section><div class="content-grid" style="margin-top:15px">' + panel('Case status mix', 'Current assigned case counts by status.', '<div class="chart-wrap" id="agentStatus"></div>', 6) + panel('Workload note', 'Compare assignment context, not only volume.', '<p class="summary-copy">These counts reflect the synthetic cases currently assigned in this browser. They do not measure complexity, worker outcomes, service quality, or agent effectiveness.</p>', 6) + '</div>';
    WACharts.vertical(document.getElementById('agentStatus'), statusList.map(function (status) { return { label: status.replace(' ', '\n'), value: count(cases, function (record) { return record.status === status; }) }; }), 'Cases by status');
  }
  const reportTypes = ['Worker Demographics & Employment', 'Healthcare Needs', 'Worker Rights Concerns', 'Benefits Demand', 'Agency Performance', 'Overall Worker Needs Summary'];
  function reportData(workers, selection) {
    if (selection === 'Healthcare Needs') { const h = healthCounts(workers); return [['Uninsured workers', h.uninsured], ['Reported unaffordable coverage', h.unaffordable + ' / ' + h.affordableAnswered], ['Healthcare assistance requests', h.assistance]]; }
    if (selection === 'Worker Rights Concerns') return ['Low pay', 'Missing payments', 'Unpaid work time', 'Deactivation concern', 'Unsafe conditions'].map(function (issue) { return [issue, concernsCount(workers, issue)]; });
    if (selection === 'Benefits Demand') return WAMock.benefits.map(function (benefit) { return [benefit, count(workers, function (worker) { return list(worker.requestedBenefits).includes(benefit); })]; });
    if (selection === 'Agency Performance') return [['Total cases', allCases().length], ['Active cases', count(allCases(), function (record) { return !['Resolved', 'Closed'].includes(record.status); })], ['Verified outcomes', WAStore.getDatabase().outcomes.filter(function (item) { return Boolean(item.verifiedAt); }).length], ['Average resolution time', 'Not available']];
    if (selection === 'Worker Demographics & Employment') return [['Workers in sample', workers.length], ['Worker types represented', new Set(workers.map(function (worker) { return worker.workerType; })).size], ['Boroughs represented', new Set(workers.map(function (worker) { return worker.borough; })).size], ['Weekly hours answered', answerCount(workers, function (worker) { return worker.weeklyHours; })], ['Income range answered', answerCount(workers, function (worker) { return worker.weeklyIncome; })]];
    return [['Workers in sample', workers.length], ['Worker types represented', new Set(workers.map(function (worker) { return worker.workerType; })).size], ['Boroughs represented', new Set(workers.map(function (worker) { return worker.borough; })).size], ['Workers with healthcare affordability answer', answerCount(workers, function (worker) { return worker.healthcareAffordable; })], ['Workers reporting low pay', concernsCount(workers, 'Low pay')], ['Workers requesting benefits', count(workers, function (worker) { return list(worker.requestedBenefits).length > 0; })]];
  }
  function reportsView() {
    const workers = currentFilters(); const selection = state.report;
    const rows = reportData(workers, selection);
    const reportHtml = state.reportGenerated ? '<section class="panel" id="printReport"><div class="panel-head"><div><div class="eyebrow">GENERATED ' + new Date().toLocaleString() + '</div><h2 class="panel-title" style="font-size:17px">' + esc(selection) + '</h2><p class="panel-subtitle">Sample size: ' + workers.length + ' workers · Current filters applied</p></div><button class="button button-sm" data-action="print-report">Print report</button></div><div class="panel-body"><div class="notice notice-warn"><span>!</span><span><strong>All data is simulated for demonstration purposes and does not represent actual NYC gig worker conditions.</strong></span></div>' + table(rows.map(function (item) { return '<tr><td>' + esc(item[0]) + '</td><td>' + esc(item[1]) + '</td></tr>'; }).join(''), ['Measure', 'Value']) + '<p class="privacy-note">Data limitations: simulated, seeded sample; intake answers may be missing; overlapping multi-select responses are not mutually exclusive; no confidential organizing information is included.</p></div></section>' : '<section class="panel"><div class="empty-state"><strong>Choose report options</strong>Select a report type, apply filters, and generate an on-screen summary.</div></section>';
    main.innerHTML = head('Reports', 'Build a filtered on-screen summary, download permitted data, or print a report.') + globalFilterBar() + '<section class="panel" style="margin-bottom:14px"><div class="panel-head"><div><h2 class="panel-title">Report configuration</h2><p class="panel-subtitle">Only general, synthetic fields are included. Restricted organizing information is never exported.</p></div></div><div class="panel-body"><div class="filter-bar" style="padding:0;border:0;box-shadow:none;margin:0"><div class="field field-wide"><label for="reportType">Report type</label><select id="reportType">' + reportTypes.map(function (type) { return '<option ' + (selection === type ? 'selected' : '') + '>' + esc(type) + '</option>'; }).join('') + '</select></div><div class="field-actions"><button class="button button-primary" data-action="generate-report">Generate report</button><button class="button" data-action="export-report">⇩ CSV</button></div></div></div></section>' + reportHtml;
  }
  function settingsView() {
    const db = WAStore.getDatabase();
    main.innerHTML = head('Settings', 'Manage the local demonstration dataset and intake import.', '') + '<div class="notice notice-warn"><span>!</span><span>Role switching is a visual demonstration, not access control. Browser localStorage is not shared across devices and must never contain real sensitive worker information.</span></div><div class="content-grid">' + panel('Data management', 'Schema version ' + db.version + ' · ' + db.workers.length + ' records in this browser.', '<div class="head-actions" style="justify-content:flex-start"><button class="button button-primary" data-action="generate-demo">Generate demo workers</button><button class="button" data-action="import-intake">Import local intake</button><button class="button" data-action="export-json">Export demo JSON</button><button class="button button-danger" data-action="reset-data">Reset demo data</button></div><p class="privacy-note" style="margin-top:14px">Import scans supported Worker Ally intake keys (workerAllyIntake, worker_ally_intake, workerAllyProfile, workerAllyCompletedProfile, and workerAllyIntake:*). Unsupported shapes are skipped without inventing fields. Duplicate source IDs are ignored.</p><p class="privacy-note">Export omits the separate restricted advocacy collection. Use clear-data to remove all local demo records.</p>', 12) + panel('Load demo scenarios', 'Scenarios regenerate the synthetic data before applying the selected demand pattern.', '<div class="head-actions" style="justify-content:flex-start"><button class="button" data-action="scenario" data-scenario="healthcare">High healthcare demand</button><button class="button" data-action="scenario" data-scenario="wages">Delivery wage concerns</button><button class="button" data-action="scenario" data-scenario="benefits">Growing benefits requests</button><button class="button" data-action="scenario" data-scenario="workload">Heavy case workload</button><button class="button button-quiet" data-action="scenario" data-scenario="baseline">Restore baseline</button></div><p class="privacy-note" style="margin-top:12px">Current scenario: ' + esc(db.scenario || 'baseline') + '. Applying a scenario replaces the local demo records and work history.</p>', 12) + panel('Privacy & prototype limits', 'Synthetic data only. This prototype is not a secure production case-management system.', '<div class="key-value"><span>External data transmission</span><strong>None</strong></div><div class="key-value"><span>Confidential organizing data</span><strong>Separate restricted collection</strong></div><div class="key-value"><span>Authentication / authorization</span><strong>Not implemented</strong></div><div class="key-value"><span>Production safeguards</span><strong>Server-side permissions, audit logs, secure data storage required</strong></div><p class="privacy-note">Do not enter real names, contact details, healthcare data, government IDs, or other sensitive information. This prototype makes no HIPAA-compliance claim.</p>', 12) + '</div>';
  }
  function advocacyView() {
    if (state.role !== 'advocacy') { main.innerHTML = head('Restricted advocacy', 'This collection is only visible in the Worker Advocacy Specialist role preview.') + '<div class="notice notice-warn">Role preview is not real security. Do not enter actual confidential information.</div>'; return; }
    const items = WAStore.getDatabase().restrictedAdvocacy;
    main.innerHTML = head('Restricted worker advocacy', 'Separate synthetic opt-in records for the advocacy role demonstration.', '<span class="tag">Restricted preview</span>') + '<div class="notice notice-warn"><span>!</span><span>These records are fictional. Role switching is not authentication; this client-side view does not protect data from other browser users.</span></div><section class="panel">' + table(items.map(function (item) { const worker = WAStore.getWorkerById(item.workerId); return '<tr><td>' + esc(item.id) + '</td><td>' + esc(worker ? worker.id : item.workerId) + '</td><td>' + date(item.requestDate) + '</td><td>Voluntary request recorded</td></tr>'; }).join(''), ['Record ID', 'Worker reference', 'Request date', 'Recorded field']) + '</section>';
  }
  function render() {
    renderNav();
    const roleViews = { healthcare: 'healthcare', benefits: 'benefits', rights: 'rights', advocacy: 'advocacy' };
    if (state.role !== 'admin' && state.view !== 'profile' && !allowedNav().some(function (item) { return item[0] === state.view; })) state.view = roleViews[state.role] || 'overview';
    renderNav();
    const views = { overview, workers: workerDirectory, profile, cases: casesView, healthcare: healthcareView, rights: rightsView, benefits: benefitsView, analytics: needsIntelligence, agents: agentsView, reports: reportsView, settings: settingsView, advocacy: advocacyView };
    (views[state.view] || overview)();
    main.focus({ preventScroll: true });
  }
  function toast(message, error) {
    const region = document.getElementById('toastRegion'); const node = document.createElement('div'); node.className = 'toast' + (error ? ' error' : ''); node.textContent = message; region.appendChild(node); window.setTimeout(function () { node.remove(); }, 3300);
  }
  function showModal(title, subtitle, body, submitLabel, onSubmit, destructive) {
    const root = document.getElementById('modalRoot');
    root.innerHTML = '<div class="modal-backdrop" data-action="backdrop-close"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle"><div class="modal-head"><div><h2 id="modalTitle">' + title + '</h2><p>' + (subtitle || '') + '</p></div><button class="modal-close" type="button" data-action="close-modal" aria-label="Close dialog">×</button></div><form id="activeForm"><div class="modal-body">' + body + '</div><div class="modal-footer"><button class="button" type="button" data-action="close-modal">Cancel</button><button class="button ' + (destructive ? 'button-danger' : 'button-primary') + '" type="submit">' + submitLabel + '</button></div></form></section></div>';
    root.querySelector('[data-action="backdrop-close"]').addEventListener('click', function (event) { if (event.target === event.currentTarget) closeModal(); });
    const form = root.querySelector('#activeForm'); form.addEventListener('submit', function (event) { event.preventDefault(); if (onSubmit(new FormData(form)) !== false) closeModal(); });
    const first = root.querySelector('input,select,textarea,button'); if (first) first.focus();
  }
  function closeModal() { document.getElementById('modalRoot').replaceChildren(); }
  function selectOptions(items, selected, emptyLabel) { return (emptyLabel ? '<option value="">' + emptyLabel + '</option>' : '') + items.map(function (item) { const value = typeof item === 'string' ? item : item.id; const label = typeof item === 'string' ? item : item.name; return '<option value="' + esc(value) + '" ' + (value === selected ? 'selected' : '') + '>' + esc(label) + '</option>'; }).join(''); }
  function openProfile(workerId) { state.workerId = workerId; state.profileTab = 'Overview'; state.view = 'profile'; render(); }
  function openCase(recordId) {
    const record = allCases().find(function (item) { return item.id === recordId; }); if (!record) return;
    const worker = WAStore.getWorkerById(record.workerId); const referrals = WAStore.getDatabase().referrals.filter(function (item) { return item.caseId === record.id; }); const outcomes = WAStore.getDatabase().outcomes.filter(function (item) { return item.caseId === record.id; });
    const body = '<div class="detail-grid">' + fieldRow('Case ID', record.id) + fieldRow('Worker', worker ? worker.name + ' (' + worker.id + ')' : record.workerId) + fieldRow('Category', record.category) + fieldRow('Priority', record.priority) + fieldRow('Status', record.status) + fieldRow('Assigned agent', agentName(record.assignedAgentId)) + fieldRow('Last updated', date(record.updatedAt)) + fieldRow('Next follow-up', date(record.followUpDate)) + '</div><div class="form-stack" style="margin-top:15px"><div class="form-row"><button class="button" type="button" data-action="case-assign" data-id="' + record.id + '">Assign case</button><button class="button" type="button" data-action="case-priority" data-id="' + record.id + '">Change priority</button></div><div class="form-row"><button class="button" type="button" data-action="case-note" data-id="' + record.id + '">Add case note</button><button class="button" type="button" data-action="case-followup" data-id="' + record.id + '">Schedule follow-up</button></div><div class="form-row"><button class="button" type="button" data-action="case-referral" data-id="' + record.id + '">Record referral</button><button class="button" type="button" data-action="case-outcome" data-id="' + record.id + '">Record outcome</button></div><div class="field"><label for="caseStatusModal">Change status</label><select id="caseStatusModal" data-action="case-status" data-id="' + record.id + '">' + selectOptions(statusList, record.status) + '</select></div></div><h3 class="panel-title" style="margin:18px 0 7px">Referrals (' + referrals.length + ')</h3>' + (referrals.map(function (item) { return '<div class="key-value"><span>' + esc(item.service) + ' · ' + esc(item.name) + '</span><strong>' + esc(item.status) + '</strong></div>'; }).join('') || '<p class="privacy-note">No referrals recorded.</p>') + '<h3 class="panel-title" style="margin:15px 0 7px">Worker-reported outcomes (' + outcomes.length + ')</h3>' + (outcomes.map(function (item) { return '<div class="key-value"><span>' + esc(item.description) + '</span><strong>' + (item.verifiedAt ? 'Verified in demo' : 'Not verified') + '</strong></div>'; }).join('') || '<p class="privacy-note">No outcomes recorded.</p>');
    showModal('Case ' + esc(record.id), 'Case actions update this browser’s simulated record.', body, 'Done', function () { return true; });
  }
  function openNote(workerId, caseId, noteId) {
    if (!workerId && caseId) { const caseRecord = allCases().find(function (item) { return item.id === caseId; }); workerId = caseRecord ? caseRecord.workerId : null; }
    const note = noteId ? WAStore.getNotes(workerId).find(function (item) { return item.id === noteId; }) : null;
    const categories = ['Healthcare', 'Worker Rights', 'Benefits', 'General Support', 'Internal'];
    const body = '<div class="form-stack"><div class="field"><label for="noteCategory">Service area</label><select id="noteCategory" name="category">' + selectOptions(categories, note ? note.category : 'General Support') + '</select></div><div class="field"><label for="noteText">Note</label><textarea id="noteText" name="text" required maxlength="2000" placeholder="Enter a concise case note">' + (note ? esc(note.text) : '') + '</textarea></div><label class="privacy-note"><input type="checkbox" name="internal" ' + (note && note.internal ? 'checked' : '') + '> Mark as internal</label><p class="privacy-note">Notes are simulated and should not contain real sensitive information.</p></div>';
    showModal(note ? 'Edit agent note' : 'Add agent note', 'Notes are associated with the selected worker and timestamped.', body, note ? 'Save changes' : 'Add note', function (form) {
      const text = form.get('text').trim(); if (!text) return false;
      const author = roleNames[state.role];
      if (note) { if (!WAStore.updateNote(note.id, text, author)) { toast('Only the note author can edit this note.', true); return false; } }
      else WAStore.addNote(workerId, text, form.get('category'), form.get('internal') === 'on', caseId, author);
      render(); toast(note ? 'Note updated.' : 'Note added.'); return true;
    });
  }
  function openAssign(workerId, caseId) {
    const record = caseId ? allCases().find(function (item) { return item.id === caseId; }) : null; const worker = WAStore.getWorkerById(workerId || (record && record.workerId));
    const body = '<div class="form-stack"><div class="field"><label for="agentSelect">Assign to agent</label><select id="agentSelect" name="agentId">' + selectOptions(allAgents(), record ? record.assignedAgentId : (worker && worker.assignedAgentId), 'Unassigned') + '</select></div></div>';
    showModal('Assign agent', 'Assignment is saved in this browser.', body, 'Save assignment', function (form) { const agentId = form.get('agentId'); if (record) WAStore.assignCase(record.id, agentId); else WAStore.assignWorker(workerId, agentId); render(); toast('Assignment updated.'); return true; });
  }
  function openCreateCase(workerId) {
    const workers = allWorkers(); const body = '<div class="form-stack"><div class="field"><label for="caseWorker">Worker</label><select id="caseWorker" name="workerId" required>' + selectOptions(workers.map(function (worker) { return { id: worker.id, name: worker.name + ' · ' + worker.id }; }), workerId) + '</select></div><div class="form-row"><div class="field"><label>Category</label><select name="category">' + selectOptions(WAMock.categories) + '</select></div><div class="field"><label>Priority</label><select name="priority">' + selectOptions(['Standard', 'High', 'Urgent']) + '</select></div></div><div class="field"><label>Assign now (optional)</label><select name="agentId">' + selectOptions(allAgents(), '', 'Unassigned') + '</select></div></div>';
    showModal('Create case', 'A worker may have more than one specialized case.', body, 'Create case', function (form) { const record = WAStore.createCase(form.get('workerId'), form.get('category'), form.get('priority'), form.get('agentId')); if (!record) { toast('Unable to create case.', true); return false; } state.view = 'cases'; render(); toast('Case created.'); return true; });
  }
  function openFollowup(workerId, caseId) {
    const record = caseId ? allCases().find(function (item) { return item.id === caseId; }) : WAStore.getCasesByWorker(workerId)[0];
    const body = '<div class="form-stack"><div class="field"><label for="followDate">Follow-up date</label><input id="followDate" name="date" type="date" value="' + (record ? record.followUpDate || '' : '') + '" required></div>' + (!record ? '<p class="privacy-note">A General Support case will be created to hold this follow-up.</p>' : '') + '</div>';
    showModal('Schedule follow-up', 'Follow-up date is stored on the case record.', body, 'Schedule', function (form) { const selected = record || WAStore.createCase(workerId, 'General Support', 'Standard', null); WAStore.setFollowUp(selected.id, form.get('date')); render(); toast('Follow-up scheduled.'); return true; });
  }
  function openReferral(caseId, workerId) {
    const workerCases = workerId ? WAStore.getCasesByWorker(workerId) : [];
    const caseField = workerId && workerCases.length ? '<div class="field"><label>Case</label><select name="caseId">' + workerCases.map(function (record) { return '<option value="' + record.id + '">' + esc(record.category + ' · ' + record.id) + '</option>'; }).join('') + '</select></div>' : '';
    const body = '<div class="form-stack">' + caseField + '<div class="field"><label>Partner name</label><input name="name" required maxlength="100" placeholder="Demo enrollment partner"></div><div class="field"><label>Service</label><input name="service" required maxlength="120" placeholder="Enrollment navigation"></div><div class="field"><label>Referral status</label><select name="status">' + selectOptions(['Submitted', 'Pending', 'Completed']) + '</select></div>' + (workerId && !workerCases.length ? '<p class="privacy-note">A General Support case will be created to hold this referral.</p>' : '') + '</div>';
    showModal('Record referral', 'Record a simulated referral. No partner is contacted.', body, 'Save referral', function (form) { let selectedCase = form.get('caseId') || caseId; if (!selectedCase && workerId) selectedCase = WAStore.createCase(workerId, 'General Support', 'Standard', null).id; WAStore.addReferral(selectedCase, form.get('name'), form.get('service'), form.get('status')); render(); toast('Referral recorded in demo.'); return true; });
  }
  function openWorkerStatus(workerId) {
    const worker = WAStore.getWorkerById(workerId); if (!worker) return;
    const body = '<div class="field"><label>Overall case status</label><select name="status">' + selectOptions(statusList, worker.caseStatus) + '</select></div>';
    showModal('Update worker status', 'Updates the worker summary and latest related case.', body, 'Update status', function (form) { WAStore.updateWorkerStatus(workerId, form.get('status')); render(); toast('Worker status updated.'); return true; });
  }
  function openContactAttempt(caseId) {
    const body = '<div class="form-stack"><div class="field"><label>Contact attempt result</label><textarea name="result" required maxlength="500" placeholder="Example: left a demo follow-up message"></textarea></div><p class="privacy-note">This records a simulated activity only. No message is sent.</p></div>';
    showModal('Record contact attempt', 'The attempt is timestamped in case history.', body, 'Save attempt', function (form) { if (!WAStore.recordContactAttempt(caseId, form.get('result'))) return false; render(); toast('Contact attempt recorded.'); return true; });
  }
  function openOutcome(caseId) {
    const body = '<div class="form-stack"><div class="field"><label>Worker-reported outcome</label><textarea name="description" required maxlength="800" placeholder="Record only a reported outcome; do not imply verification."></textarea></div><p class="privacy-note">This is saved as unverified. A separate verification action is available from the case card.</p></div>';
    showModal('Record outcome', 'Outcome is recorded as worker-reported and unverified.', body, 'Save outcome', function (form) { WAStore.recordOutcome(caseId, form.get('description'), false); render(); toast('Worker-reported outcome saved as unverified.'); return true; });
  }
  function openVerifyOutcomes(caseId) {
    const outcomes = WAStore.getDatabase().outcomes.filter(function (item) { return item.caseId === caseId; });
    const body = outcomes.length ? outcomes.map(function (item) { return '<div class="key-value"><span>' + esc(item.description) + '</span><strong>' + (item.verifiedAt ? 'Verified' : '<button type="button" class="button button-sm" data-action="verify-outcome" data-id="' + item.id + '">Verify outcome</button>') + '</strong></div>'; }).join('') : '<div class="empty-state"><strong>No reported outcomes</strong>Record a worker-reported outcome before verifying it.</div>';
    showModal('Verify reported outcome', 'Verification is a separate explicit demo action.', body, 'Done', function () { return true; });
  }
  function openPriority(caseId) {
    const body = '<div class="field"><label>Priority</label><select name="priority">' + selectOptions(['Standard', 'High', 'Urgent']) + '</select></div>';
    showModal('Change case priority', '', body, 'Update priority', function (form) { WAStore.updateCasePriority(caseId, form.get('priority')); render(); toast('Case priority updated.'); return true; });
  }
  function openRole() {
    const roles = Object.keys(roleNames); const descriptors = { admin: 'Full operational workspace and aggregate reporting.', healthcare: 'Healthcare cases and related profile views.', benefits: 'Benefits assistance cases and related profile views.', rights: 'Worker rights and wage assistance cases.', advocacy: 'Separate restricted synthetic advocacy collection.' };
    const body = '<div class="notice notice-warn">Role switching is only a UI demonstration. It is not authentication or authorization.</div><div class="role-options">' + roles.map(function (role) { return '<label class="role-option"><input type="radio" name="role" value="' + role + '" ' + (state.role === role ? 'checked' : '') + '><span><strong>' + roleNames[role] + '</strong><small>' + descriptors[role] + '</small></span></label>'; }).join('') + '</div>';
    showModal('Preview dashboard role', 'Navigation and visible records change for demonstration.', body, 'Switch role', function (form) { state.role = form.get('role'); state.view = state.role === 'healthcare' ? 'healthcare' : state.role === 'benefits' ? 'benefits' : state.role === 'rights' ? 'rights' : state.role === 'advocacy' ? 'advocacy' : 'overview'; render(); toast('Role preview switched to ' + roleNames[state.role] + '.'); return true; });
  }
  function confirmModal(title, text, label, callback) {
    showModal(title, '', '<div class="notice notice-warn">' + text + '</div>', label, function () { callback(); render(); toast('Completed.'); return true; }, true);
  }
  function csvDownload(filename, headers, rows) {
    const quote = function (value) { return '"' + String(value == null ? '' : value).replace(/"/g, '""') + '"'; };
    const content = [headers].concat(rows).map(function (row) { return row.map(quote).join(','); }).join('\r\n');
    const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8' })); link.download = filename; link.click(); URL.revokeObjectURL(link.href);
  }
  function exportWorkers(list) {
    list = list || allWorkers(); csvDownload('worker-ally-demo-directory.csv', ['Worker ID', 'Name', 'Worker type', 'Platforms', 'Borough', 'Insurance status', 'Primary assistance need', 'Assigned agent', 'Case status', 'Registration date'], list.map(function (worker) { return [worker.id, worker.name, worker.workerType, (worker.platforms || []).join('; '), worker.borough, worker.insuranceStatus, worker.primaryAssistanceNeed, agentName(worker.assignedAgentId), worker.caseStatus, worker.intakeDate]; })); toast('Permitted directory fields exported.');
  }
  function exportJson() {
    const db = JSON.parse(JSON.stringify(WAStore.getDatabase())); delete db.restrictedAdvocacy;
    const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' })); link.download = 'worker-ally-demo-dataset.json'; link.click(); URL.revokeObjectURL(link.href); toast('Demo dataset exported without restricted advocacy data.');
  }
  function exportReport() {
    const workers = currentFilters();
    csvDownload('worker-ally-' + slug(state.report) + '.csv', ['Measure', 'Value'], reportData(workers, state.report)); toast('Filtered report summary exported.');
  }
  function resetWorkflow() {
    confirmModal('Reset workflow demonstration?', 'This removes case actions, notes, referrals, and outcomes by restoring the seeded demo dataset. Worker records will also return to baseline.', 'Reset workflow', function () { WAStore.reset(); });
  }
  function handleAction(action, target) {
    const id = target.dataset.id;
    if (action === 'close-modal') closeModal();
    else if (action === 'role') openRole();
    else if (action === 'privacy') showModal('Privacy & data use', 'Prototype limitations', '<div class="notice notice-warn">All records are simulated. Do not enter real worker information.</div><p class="summary-copy">This static application stores records in this browser’s localStorage. Data is not shared between users or devices, and client-side role switching is not security. No data is sent to external services. Organizing records are separated from general views and exports. Production use would require secure server-side authorization, audit logs, and properly managed permissions.</p><p class="privacy-note">No HIPAA compliance or production security claim is made.</p>', 'Close', function () { return true; });
    else if (action === 'open-worker') openProfile(id);
    else if (action === 'profile-tab') { state.profileTab = target.dataset.tab; render(); }
    else if (action === 'note') openNote(id, null, null);
    else if (action === 'case-note') openNote(null, id, null);
    else if (action === 'edit-note') { const note = WAStore.getNotes().find(function (item) { return item.id === id; }); if (note) openNote(note.workerId, note.caseId, note.id); }
    else if (action === 'assign-worker') openAssign(id, null);
    else if (action === 'case-assign') openAssign(null, id);
    else if (action === 'profile-referral') openReferral(null, id);
    else if (action === 'status-worker') openWorkerStatus(id);
    else if (action === 'open-case-worker') { const record = allCases().find(function (item) { return item.id === id; }); if (record) { closeModal(); openProfile(record.workerId); } }
    else if (action === 'create-case') openCreateCase(id || null);
    else if (action === 'schedule-worker') openFollowup(id, null);
    else if (action === 'case-followup') openFollowup(null, id);
    else if (action === 'case-referral') openReferral(id, null);
    else if (action === 'case-outcome') openOutcome(id);
    else if (action === 'case-priority') openPriority(id);
    else if (action === 'case-detail') openCase(id);
    else if (action === 'case-contact') openContactAttempt(id);
    else if (action === 'verify-outcomes') openVerifyOutcomes(id);
    else if (action === 'verify-outcome') confirmModal('Verify this reported outcome?', 'This records an explicit verification timestamp in the synthetic demo. It does not represent a production verification process.', 'Verify outcome', function () { WAStore.verifyOutcome(id, roleNames[state.role]); render(); });
    else if (action === 'export-workers') exportWorkers();
    else if (action === 'export-json') exportJson();
    else if (action === 'import-intake') { const result = WAStore.importLocalIntake(); render(); toast(result.reason || (result.imported + ' intake record(s) imported; ' + result.skipped + ' skipped.'), Boolean(result.reason)); }
    else if (action === 'generate-demo') confirmModal('Restore seeded demo workers?', 'This replaces local demo records and workflow actions with 240 consistent fictional profiles.', 'Restore dataset', function () { WAStore.reset(); });
    else if (action === 'reset-data') confirmModal('Reset demo data?', 'This clears locally stored workers, cases, agents, notes, referrals, outcomes, and activity. Generate demo workers again from Settings when needed.', 'Clear demo data', function () { WAStore.clear(); });
    else if (action === 'scenario') confirmModal('Load demo scenario?', 'Loading this scenario regenerates the fictional database and replaces local case activity.', 'Load scenario', function () { WAStore.applyScenario(target.dataset.scenario); });
    else if (action === 'apply-filters') { state.filtersApplied = true; render(); }
    else if (action === 'reset-filters') { state.globalFilters = { period: 'all', borough: '', type: '', platform: '', insurance: '', income: '' }; render(); }
    else if (action === 'clear-directory') { state.directoryFilters = { q: '', type: '', borough: '', health: '', assistance: '', agent: '', status: '', from: '', to: '' }; state.page = 1; render(); }
    else if (action === 'sort-workers') { const key = target.dataset.key; state.sortDir = state.sort === key ? -state.sortDir : 1; state.sort = key; render(); }
    else if (action === 'page') { state.page = Number(target.dataset.page); render(); }
    else if (action === 'generate-report') { state.report = document.getElementById('reportType').value; state.reportGenerated = true; render(); }
    else if (action === 'export-report') exportReport();
    else if (action === 'print-report') window.print();
    else if (action === 'reset-workflow') resetWorkflow();
  }

  document.addEventListener('click', function (event) {
    const viewButton = event.target.closest('[data-view]');
    if (viewButton) { const targetView = viewButton.dataset.view; if (targetView === 'workers' && state.role !== 'admin') { state.view = 'cases'; } else state.view = targetView; document.getElementById('sidebar').classList.remove('open'); render(); return; }
    const actionTarget = event.target.closest('[data-action]'); if (actionTarget) { handleAction(actionTarget.dataset.action, actionTarget); return; }
    const caseCardTarget = event.target.closest('.case-card');
    if (caseCardTarget && !event.target.closest('select,button')) { const record = allCases().find(function (item) { return item.id === caseCardTarget.dataset.case; }); if (record) openProfile(record.workerId); }
  });
  document.addEventListener('change', function (event) {
    const target = event.target;
    if (target.dataset.filter) { state.globalFilters[target.dataset.filter] = target.value; return; }
    if (target.dataset.directory) { state.directoryFilters[target.dataset.directory] = target.value; state.page = 1; if (target.dataset.directory !== 'q') render(); return; }
    if (target.dataset.action === 'case-status') { const caseId = target.dataset.id; const inModal = Boolean(target.closest('.modal')); WAStore.updateCaseStatus(caseId, target.value); if (inModal) { closeModal(); openCase(caseId); } else render(); toast('Case status updated.'); return; }
    if (target.id === 'reportType') state.report = target.value;
  });
  document.addEventListener('input', function (event) {
    if (event.target.dataset.directory === 'q') { state.directoryFilters.q = event.target.value; const cursor = event.target.selectionStart; workerDirectory(); const search = document.getElementById('workerSearch'); search.focus(); search.setSelectionRange(cursor, cursor); }
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') closeModal();
    const card = event.target.closest('.case-card');
    if (card && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); openProfile(WAStore.getCases().find(function (item) { return item.id === card.dataset.case; }).workerId); }
  });
  let draggedCase = null;
  document.addEventListener('dragstart', function (event) { const card = event.target.closest('.case-card'); if (card) { draggedCase = card.dataset.case; card.classList.add('dragging'); event.dataTransfer.effectAllowed = 'move'; } });
  document.addEventListener('dragend', function (event) { const card = event.target.closest('.case-card'); if (card) card.classList.remove('dragging'); draggedCase = null; });
  document.addEventListener('dragover', function (event) { const column = event.target.closest('[data-drop-status]'); if (column) { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; } });
  document.addEventListener('drop', function (event) { const column = event.target.closest('[data-drop-status]'); if (column && draggedCase) { event.preventDefault(); WAStore.updateCaseStatus(draggedCase, column.dataset.dropStatus); render(); toast('Case moved to ' + column.dataset.dropStatus + '.'); } });
  document.getElementById('roleButton').addEventListener('click', openRole);
  document.getElementById('privacyButton').addEventListener('click', function () { handleAction('privacy', this); });
  document.getElementById('mobileMenu').addEventListener('click', function () { document.getElementById('sidebar').classList.toggle('open'); });
  window.addEventListener('wa:data-changed', function () { if (!document.getElementById('modalRoot').firstChild) render(); });
  window.addEventListener('storage', function () { location.reload(); });
  window.WAApp = { render, openProfile };
  render();
})();
