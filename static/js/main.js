/* ===================================================
   KigaliJobs Dashboard — main.js
   Rwanda | Africa | Remote
   =================================================== */

const API = {
  search:    '/api/jobs/search/',
  skills:    '/api/jobs/skills/',
  salary:    '/api/jobs/salary/',
  companies: '/api/jobs/companies/',
  countries: '/api/jobs/countries/',
  africa:    '/api/jobs/africa/',
  remote:    '/api/jobs/remote/',
};

// ── State ──────────────────────────────────────────
let state = {
  // Global mode
  currentPage:  1,
  totalPages:   1,
  lastQuery:    '',
  lastCountry:  'gb',
  skillsChart:  null,
  salaryChart:  null,
  // Africa mode
  africaPage:   1,
  // Current mode
  activeMode: 'global',
};

// ── DOM refs ───────────────────────────────────────
const $ = (id) => document.getElementById(id);

// Global
const queryInput     = $('queryInput');
const countrySelect  = $('countrySelect');
const searchBtn      = $('searchBtn');
const salaryMin      = $('salaryMin');
const salaryMax      = $('salaryMax');
const sortBy         = $('sortBy');
const fullTimeOnly   = $('fullTimeOnly');
const resultsPerPage = $('resultsPerPage');
const errorBanner    = $('errorBanner');
const statsBar       = $('statsBar');
const mainContent    = $('mainContent');
const jobList        = $('jobList');
const pagination     = $('pagination');
const totalResults   = $('totalResults');
const searchSummary  = $('searchSummary');
const skillsJobCount = $('skillsJobCount');
const noSkills       = $('noSkills');
const salaryBadge    = $('salaryBadge');
const noSalary       = $('noSalary');
const companiesBadge = $('companiesBadge');
const companiesTable = $('companiesTable');
const noCompanies    = $('noCompanies');

// Africa
const africaQuery       = $('africaQuery');
const africaLocation    = $('africaLocation');
const africaSortBy      = $('africaSortBy');
const africaSearchBtn   = $('africaSearchBtn');
const africaError       = $('africaError');
const africaStatsBar    = $('africaStatsBar');
const africaTotalResults= $('africaTotalResults');
const africaSummary     = $('africaSummary');
const africaContent     = $('africaContent');
const africaJobList     = $('africaJobList');
const africaPagination  = $('africaPagination');

// Remote
const remoteQuery       = $('remoteQuery');
const remoteCategory    = $('remoteCategory');
const remoteLimit       = $('remoteLimit');
const remoteSearchBtn   = $('remoteSearchBtn');
const remoteError       = $('remoteError');
const remoteStatsBar    = $('remoteStatsBar');
const remoteTotalResults= $('remoteTotalResults');
const remoteSummary     = $('remoteSummary');
const remoteContent     = $('remoteContent');
const remoteJobList     = $('remoteJobList');

// Modal / Loading
const jobModal       = $('jobModal');
const modalClose     = $('modalClose');
const modalContent   = $('modalContent');
const loadingOverlay = $('loadingOverlay');

// ── Init ───────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initModeTabs();
  initInsightTabs();
  loadCountries();

  // Global
  searchBtn.addEventListener('click', () => handleGlobalSearch());
  queryInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleGlobalSearch(); });

  // Popular jobs quick-pick (Global)
  $('popularJobs').addEventListener('change', (e) => {
    if (!e.target.value) return;
    queryInput.value = e.target.value;
    queryInput.focus();
    handleGlobalSearch();
    e.target.value = ''; // reset dropdown
  });

  // Africa
  africaSearchBtn.addEventListener('click', () => handleAfricaSearch());
  africaQuery.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleAfricaSearch(); });

  // Popular jobs quick-pick (Africa)
  $('africaPopularJobs').addEventListener('change', (e) => {
    if (!e.target.value) return;
    africaQuery.value = e.target.value;
    africaQuery.focus();
    handleAfricaSearch();
    e.target.value = ''; // reset dropdown
  });

  // Remote — auto-load on first visit to remote tab
  remoteSearchBtn.addEventListener('click', () => handleRemoteSearch());
  remoteQuery.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleRemoteSearch(); });

  // Modal
  modalClose.addEventListener('click', closeModal);
  jobModal.addEventListener('click', (e) => { if (e.target === jobModal) closeModal(); });
});

// ── Mode tabs ───────────────────────────────────────
let remoteAutoLoaded = false;

function initModeTabs() {
  document.querySelectorAll('.mode-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode;
      state.activeMode = mode;

      document.querySelectorAll('.mode-btn').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.mode-panel').forEach((p) => p.classList.add('hidden'));

      btn.classList.add('active');
      $(`mode-${mode}`).classList.remove('hidden');

      // Auto-load remote jobs on first switch
      if (mode === 'remote' && !remoteAutoLoaded) {
        remoteAutoLoaded = true;
        handleRemoteSearch();
      }
    });
  });
}

// ── Insight tabs (Global sidebar) ──────────────────
function initInsightTabs() {
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;
      document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach((p) => p.classList.add('hidden'));
      btn.classList.add('active');
      $(`tab-${target}`).classList.remove('hidden');
    });
  });
}

// ── Load countries (Adzuna) ─────────────────────────
async function loadCountries() {
  try {
    const data = await apiFetch(API.countries);
    // Prioritise African countries at top
    const african = ['za'];
    const reordered = [
      ...data.filter((c) => african.includes(c.code)),
      ...data.filter((c) => !african.includes(c.code)),
    ];
    reordered.forEach((c) => {
      const opt = document.createElement('option');
      opt.value = c.code;
      opt.textContent = (c.code === 'za' ? '🌍 ' : '') + c.name;
      if (c.code === 'gb') opt.selected = true;
      countrySelect.appendChild(opt);
    });
  } catch {
    // fallback: add gb so search doesn't break
    const opt = document.createElement('option');
    opt.value = 'gb'; opt.textContent = 'United Kingdom'; opt.selected = true;
    countrySelect.appendChild(opt);
  }
}

// ════════════════════════════════════════════════════
//  GLOBAL MODE (Adzuna)
// ════════════════════════════════════════════════════
async function handleGlobalSearch(page = 1) {
  const query = queryInput.value.trim();
  if (!query) { showError(errorBanner, 'Please enter a job title or keyword.'); return; }

  state.currentPage = page;
  state.lastQuery   = query;
  state.lastCountry = countrySelect.value;

  clearError(errorBanner);
  showLoading(true);

  try {
    const jobsData = await fetchGlobalJobs(query, countrySelect.value, page);
    renderGlobalJobs(jobsData);
    fetchAndRenderSkills(query, countrySelect.value);
    fetchAndRenderSalary(query, countrySelect.value);
    fetchAndRenderCompanies(query, countrySelect.value);
  } catch (err) {
    showError(errorBanner, err.message || 'Something went wrong. Please try again.');
  } finally {
    showLoading(false);
  }
}

async function fetchGlobalJobs(query, country, page) {
  const params = new URLSearchParams({
    query, country, page,
    sort_by: sortBy.value,
    results_per_page: resultsPerPage.value,
  });
  if (salaryMin.value) params.append('salary_min', salaryMin.value);
  if (salaryMax.value) params.append('salary_max', salaryMax.value);
  if (fullTimeOnly.checked) params.append('full_time', '1');
  return apiFetch(`${API.search}?${params}`);
}

function renderGlobalJobs(data) {
  const results = data.results || [];
  const count   = data.count   || 0;

  state.totalPages = Math.ceil(count / parseInt(resultsPerPage.value));
  totalResults.textContent  = `${count.toLocaleString()} jobs found`;
  searchSummary.textContent = `"${state.lastQuery}" · ${getCountryName()}`;
  statsBar.style.display  = 'block';
  mainContent.style.display = 'grid';

  jobList.innerHTML = '';
  if (!results.length) {
    jobList.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:2rem 0;">No jobs found. Try a different search.</p>';
    renderPagination(pagination, 0, handleGlobalSearch);
    return;
  }
  results.forEach((job) => jobList.appendChild(buildAdzunaCard(job)));
  renderPagination(pagination, state.totalPages, handleGlobalSearch);
}

// ── Skills chart ────────────────────────────────────
async function fetchAndRenderSkills(query, country) {
  try {
    const data = await apiFetch(`${API.skills}?query=${encodeURIComponent(query)}&country=${country}`);
    renderSkillsChart(data);
  } catch { noSkills.classList.remove('hidden'); }
}

function renderSkillsChart(data) {
  const skills = data.skills || [];
  noSkills.classList.toggle('hidden', skills.length > 0);
  if (!skills.length) return;
  skillsJobCount.textContent = `from ${data.total_jobs_analysed} listings`;
  const labels = skills.map((s) => s.skill);
  const values = skills.map((s) => s.count);
  if (state.skillsChart) state.skillsChart.destroy();
  const ctx = $('skillsChart').getContext('2d');
  state.skillsChart = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: [{ label: 'Mentions', data: values, backgroundColor: generateColors(skills.length), borderRadius: 5, borderSkipped: false }] },
    options: {
      indexAxis: 'y', responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => ` ${c.parsed.x} mentions` } } },
      scales: { x: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 11 } } }, y: { grid: { display: false }, ticks: { font: { size: 11 } } } },
    },
  });
}

// ── Salary chart ────────────────────────────────────
async function fetchAndRenderSalary(query, country) {
  try {
    const data = await apiFetch(`${API.salary}?query=${encodeURIComponent(query)}&country=${country}`);
    renderSalaryChart(data);
  } catch { noSalary.classList.remove('hidden'); }
}

function renderSalaryChart(data) {
  const histogram = data.histogram || {};
  const entries = Object.entries(histogram).map(([k, v]) => ({ range: Number(k), count: v })).sort((a, b) => a.range - b.range);
  noSalary.classList.toggle('hidden', entries.length > 0);
  if (!entries.length) return;
  salaryBadge.textContent = `${entries.length} salary bands`;
  if (state.salaryChart) state.salaryChart.destroy();
  const ctx = $('salaryChart').getContext('2d');
  state.salaryChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: entries.map((e) => `$${(e.range / 1000).toFixed(0)}k`),
      datasets: [{ label: 'Jobs', data: entries.map((e) => e.count), backgroundColor: 'rgba(30,181,58,0.7)', borderColor: '#1EB53A', borderWidth: 1, borderRadius: 4 }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { x: { grid: { display: false }, ticks: { font: { size: 10 }, maxRotation: 45 } }, y: { grid: { color: '#f1f5f9' } } },
    },
  });
}

// ── Top companies ────────────────────────────────────
async function fetchAndRenderCompanies(query, country) {
  try {
    const data = await apiFetch(`${API.companies}?query=${encodeURIComponent(query)}&country=${country}`);
    renderCompanies(data);
  } catch { noCompanies.classList.remove('hidden'); }
}

function renderCompanies(data) {
  const leaderboard = data.leaderboard || [];
  noCompanies.classList.toggle('hidden', leaderboard.length > 0);
  companiesTable.innerHTML = '';
  if (!leaderboard.length) return;
  companiesBadge.textContent = `${leaderboard.length} companies`;
  const maxCount = leaderboard[0]?.count || 1;
  const rankClass = (i) => i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
  const table = document.createElement('table');
  table.className = 'companies-table';
  table.innerHTML = `<thead><tr><th>#</th><th>Company</th><th>Jobs</th><th class="company-bar-cell"></th></tr></thead>`;
  const tbody = document.createElement('tbody');
  leaderboard.forEach((item, i) => {
    const pct = Math.round((item.count / maxCount) * 100);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="company-rank ${rankClass(i)}">${i + 1}</span></td>
      <td>${escapeHtml(item.canonical_name)}</td>
      <td><strong>${item.count}</strong></td>
      <td class="company-bar-cell"><div class="company-bar-bg"><div class="company-bar-fill" style="width:${pct}%"></div></div></td>`;
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  companiesTable.appendChild(table);
}

// ════════════════════════════════════════════════════
//  AFRICA & RWANDA MODE (JSearch)
// ════════════════════════════════════════════════════
async function handleAfricaSearch(page = 1) {
  const query    = africaQuery.value.trim();
  const location = africaLocation.value;
  const sortBy   = africaSortBy.value;
  if (!query) { showError(africaError, 'Please enter a job title or keyword.'); return; }

  state.africaPage = page;
  clearError(africaError);
  showLoading(true);

  try {
    const params = new URLSearchParams({ query, location, page });
    const data = await apiFetch(`${API.africa}?${params}`);
    renderAfricaJobs(data, query, location, sortBy);
  } catch (err) {
    showError(africaError, err.message || 'Could not fetch Africa jobs. Please try again.');
  } finally {
    showLoading(false);
  }
}

function renderAfricaJobs(data, query, location, sortBy = 'relevance') {
  let results = data.data || [];
  const count = results.length;

  // Sort client-side — relevance keeps API order, date sorts by posted time
  if (sortBy === 'date') {
    results = [...results].sort((a, b) => {
      const dateA = a.job_posted_at_datetime_utc ? new Date(a.job_posted_at_datetime_utc) : new Date(0);
      const dateB = b.job_posted_at_datetime_utc ? new Date(b.job_posted_at_datetime_utc) : new Date(0);
      return dateB - dateA; // newest first
    });
  }

  const sortLabel = sortBy === 'date' ? ' · Latest first' : ' · By relevance';
  africaTotalResults.textContent = count > 0 ? `${count} jobs found` : 'No jobs found';
  africaSummary.textContent = `"${query}" · ${location}${sortLabel}`;
  africaStatsBar.style.display = 'block';
  africaContent.style.display  = 'block';
  africaJobList.innerHTML = '';

  if (!results.length) {
    africaJobList.innerHTML = `<p style="color:var(--text-muted);text-align:center;padding:2rem 0;">
      No jobs found in ${escapeHtml(location)}. Try a broader keyword or different location.</p>`;
    return;
  }
  results.forEach((job) => africaJobList.appendChild(buildJSearchCard(job)));
}

function buildJSearchCard(job) {
  const card = document.createElement('div');
  card.className = 'job-card africa-job';
  card.addEventListener('click', () => openJSearchModal(job));

  const company  = job.employer_name   || 'Company not specified';
  const city     = job.job_city        || '';
  const country  = job.job_country     || '';
  const location = [city, country].filter(Boolean).join(', ') || 'Location not specified';
  const type     = job.job_employment_type ? job.job_employment_type.replace('_', ' ') : '';
  const dateStr  = job.job_posted_at_datetime_utc ? timeAgo(new Date(job.job_posted_at_datetime_utc)) : '';

  card.innerHTML = `
    <div class="job-card-top">
      <div>
        <div class="job-title">${escapeHtml(job.job_title)}</div>
        <div class="job-company">${escapeHtml(company)}</div>
      </div>
      <span class="job-date">${dateStr}</span>
    </div>
    <div class="job-meta">
      <span class="tag tag-location">📍 ${escapeHtml(location)}</span>
      ${type ? `<span class="tag tag-type">${capitalize(type)}</span>` : ''}
      ${job.job_is_remote ? `<span class="tag tag-remote">🌐 Remote</span>` : ''}
    </div>`;
  return card;
}

function openJSearchModal(job) {
  const company  = job.employer_name || 'Company not specified';
  const city     = job.job_city || '';
  const country  = job.job_country || '';
  const location = [city, country].filter(Boolean).join(', ') || 'Location not specified';
  const desc     = stripHtml(job.job_description || 'No description available.').slice(0, 1200);

  modalContent.innerHTML = `
    <div class="modal-title">${escapeHtml(job.job_title)}</div>
    <div class="modal-company">${escapeHtml(company)} &mdash; ${escapeHtml(location)}</div>
    <div class="modal-tags">
      <span class="tag tag-location">📍 ${escapeHtml(location)}</span>
      ${job.job_employment_type ? `<span class="tag tag-type">${capitalize(job.job_employment_type.replace('_',' '))}</span>` : ''}
      ${job.job_is_remote ? `<span class="tag tag-remote">🌐 Remote-friendly</span>` : ''}
    </div>
    <div class="modal-description">${escapeHtml(desc)}${desc.length >= 1200 ? '…' : ''}</div>
    <a class="modal-apply" href="${job.job_apply_link}" target="_blank" rel="noopener noreferrer">Apply Now ↗</a>`;

  jobModal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

// ════════════════════════════════════════════════════
//  REMOTE MODE (Remotive)
// ════════════════════════════════════════════════════
async function handleRemoteSearch() {
  const search   = remoteQuery.value.trim();
  const category = remoteCategory.value;
  const limit    = remoteLimit.value;

  clearError(remoteError);
  showLoading(true);

  try {
    const params = new URLSearchParams({ limit });
    if (search)   params.append('search', search);
    if (category) params.append('category', category);
    const data = await apiFetch(`${API.remote}?${params}`);
    renderRemoteJobs(data, search, category);
  } catch (err) {
    showError(remoteError, err.message || 'Could not fetch remote jobs. Please try again.');
  } finally {
    showLoading(false);
  }
}

function renderRemoteJobs(data, search, category) {
  const jobs  = data.jobs || [];
  const count = data['job-count'] || jobs.length;

  remoteTotalResults.textContent = `${count.toLocaleString()} remote jobs available`;
  remoteSummary.textContent = search ? `"${search}"${category ? ' · ' + category : ''}` : 'All remote jobs';
  remoteStatsBar.style.display = 'block';
  remoteContent.style.display  = 'block';
  remoteJobList.innerHTML = '';

  if (!jobs.length) {
    remoteJobList.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:2rem 0;">No remote jobs found. Try a different search.</p>';
    return;
  }
  jobs.forEach((job) => remoteJobList.appendChild(buildRemotiveCard(job)));
}

function buildRemotiveCard(job) {
  const card = document.createElement('div');
  card.className = 'job-card remote-job';
  card.addEventListener('click', () => openRemotiveModal(job));

  const dateStr = job.publication_date ? timeAgo(new Date(job.publication_date)) : '';
  const tags    = (job.tags || []).slice(0, 4);

  card.innerHTML = `
    <div class="job-card-top">
      <div>
        <div class="job-title">${escapeHtml(job.title)}</div>
        <div class="job-company">${escapeHtml(job.company_name)}</div>
      </div>
      <span class="job-date">${dateStr}</span>
    </div>
    <div class="job-meta">
      <span class="tag tag-remote">🌐 ${escapeHtml(job.candidate_required_location || 'Worldwide')}</span>
      ${job.salary ? `<span class="tag tag-salary">💰 ${escapeHtml(job.salary)}</span>` : ''}
      ${job.job_type ? `<span class="tag tag-type">${capitalize(job.job_type.replace('_', ' '))}</span>` : ''}
      ${tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join('')}
    </div>`;
  return card;
}

function openRemotiveModal(job) {
  const desc = stripHtml(job.description || 'No description available.').slice(0, 1500);
  modalContent.innerHTML = `
    <div class="modal-title">${escapeHtml(job.title)}</div>
    <div class="modal-company">${escapeHtml(job.company_name)} &mdash; ${escapeHtml(job.category || '')}</div>
    <div class="modal-tags">
      <span class="tag tag-remote">🌐 ${escapeHtml(job.candidate_required_location || 'Worldwide')}</span>
      ${job.salary ? `<span class="tag tag-salary">💰 ${escapeHtml(job.salary)}</span>` : ''}
      ${job.job_type ? `<span class="tag tag-type">${capitalize(job.job_type.replace('_', ' '))}</span>` : ''}
    </div>
    <div class="modal-description">${escapeHtml(desc)}${desc.length >= 1500 ? '…' : ''}</div>
    <a class="modal-apply" href="${job.url}" target="_blank" rel="noopener noreferrer">Apply Now ↗</a>`;
  jobModal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

// ════════════════════════════════════════════════════
//  GLOBAL CARD & PAGINATION (Adzuna)
// ════════════════════════════════════════════════════
function buildAdzunaCard(job) {
  const card = document.createElement('div');
  card.className = 'job-card';
  card.addEventListener('click', () => openAdzunaModal(job));

  const salary   = formatSalary(job.salary_min, job.salary_max);
  const location = job.location?.display_name || 'Location not specified';
  const company  = job.company?.display_name   || 'Company not specified';
  const dateStr  = job.created ? timeAgo(new Date(job.created)) : '';

  card.innerHTML = `
    <div class="job-card-top">
      <div>
        <div class="job-title">${escapeHtml(job.title)}</div>
        <div class="job-company">${escapeHtml(company)}</div>
      </div>
      <span class="job-date">${dateStr}</span>
    </div>
    <div class="job-meta">
      <span class="tag">📍 ${escapeHtml(location)}</span>
      ${salary ? `<span class="tag tag-salary">💰 ${salary}</span>` : ''}
      ${job.contract_time ? `<span class="tag tag-type">${capitalize(job.contract_time.replace('_', ' '))}</span>` : ''}
      ${job.category?.label ? `<span class="tag">${escapeHtml(job.category.label)}</span>` : ''}
    </div>`;
  return card;
}

function openAdzunaModal(job) {
  const salary   = formatSalary(job.salary_min, job.salary_max);
  const company  = job.company?.display_name  || 'Company not specified';
  const location = job.location?.display_name || 'Location not specified';
  const desc     = stripHtml(job.description  || 'No description available.');

  modalContent.innerHTML = `
    <div class="modal-title">${escapeHtml(job.title)}</div>
    <div class="modal-company">${escapeHtml(company)} &mdash; ${escapeHtml(location)}</div>
    <div class="modal-tags">
      ${salary ? `<span class="tag tag-salary">💰 ${salary}</span>` : ''}
      ${job.contract_time ? `<span class="tag tag-type">${capitalize(job.contract_time.replace('_',' '))}</span>` : ''}
      ${job.category?.label ? `<span class="tag">${escapeHtml(job.category.label)}</span>` : ''}
    </div>
    <div class="modal-description">${escapeHtml(desc)}</div>
    <a class="modal-apply" href="${job.redirect_url}" target="_blank" rel="noopener noreferrer">Apply Now ↗</a>`;
  jobModal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function renderPagination(container, totalPages, searchFn) {
  container.innerHTML = '';
  if (totalPages <= 1) return;
  const current = state.activeMode === 'global' ? state.currentPage : state.africaPage;
  const maxVisible = 5;

  const prev = document.createElement('button');
  prev.className = 'page-btn'; prev.textContent = '← Prev'; prev.disabled = current === 1;
  prev.addEventListener('click', () => searchFn(current - 1));
  container.appendChild(prev);

  const start = Math.max(1, current - Math.floor(maxVisible / 2));
  const end   = Math.min(totalPages, start + maxVisible - 1);
  for (let i = start; i <= end; i++) {
    const btn = document.createElement('button');
    btn.className = `page-btn${i === current ? ' active' : ''}`;
    btn.textContent = i;
    btn.addEventListener('click', () => searchFn(i));
    container.appendChild(btn);
  }

  const next = document.createElement('button');
  next.className = 'page-btn'; next.textContent = 'Next →'; next.disabled = current >= totalPages;
  next.addEventListener('click', () => searchFn(current + 1));
  container.appendChild(next);
}

function closeModal() {
  jobModal.classList.add('hidden');
  document.body.style.overflow = '';
}

// ════════════════════════════════════════════════════
//  HELPERS
// ════════════════════════════════════════════════════
async function apiFetch(url) {
  const res  = await fetch(url);
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); }
  catch { throw new Error(`Server error (${res.status}). Check that the server is running.`); }
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
  return json;
}

function showLoading(visible) { loadingOverlay.classList.toggle('hidden', !visible); }
function showError(el, msg)   { el.textContent = msg; el.classList.remove('hidden'); }
function clearError(el)       { el.textContent = ''; el.classList.add('hidden'); }

function formatSalary(min, max) {
  const fmt = (n) => n ? `$${Math.round(n).toLocaleString()}` : null;
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (min) return `From ${fmt(min)}`;
  if (max) return `Up to ${fmt(max)}`;
  return null;
}

function timeAgo(date) {
  const diff = Math.floor((Date.now() - date) / 1000);
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function capitalize(str) { return String(str).charAt(0).toUpperCase() + String(str).slice(1); }

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function stripHtml(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

function getCountryName() {
  const opt = countrySelect.options[countrySelect.selectedIndex];
  return opt ? opt.textContent : countrySelect.value.toUpperCase();
}

function generateColors(n) {
  const palette = [
    '#1EB53A','#20B2CD','#FAD201','#ef4444','#8b5cf6',
    '#ec4899','#06b6d4','#84cc16','#f97316','#6366f1',
    '#14b8a6','#e11d48','#0ea5e9','#a3e635','#fb923c',
    '#a855f7','#22c55e','#eab308','#64748b','#94a3b8',
  ];
  return Array.from({ length: n }, (_, i) => palette[i % palette.length]);
}
