/* ===================================================
   Job Market Skills Dashboard — main.js
   =================================================== */

const API = {
  search: '/api/jobs/search/',
  skills: '/api/jobs/skills/',
  countries: '/api/jobs/countries/',
};

// ── State ──────────────────────────────────────────
let state = {
  currentPage: 1,
  totalPages: 1,
  totalCount: 0,
  lastQuery: '',
  lastCountry: 'gb',
  skillsChart: null,
};

// ── DOM references ─────────────────────────────────
const $ = (id) => document.getElementById(id);
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
const loadingOverlay = $('loadingOverlay');
const jobModal       = $('jobModal');
const modalClose     = $('modalClose');
const modalContent   = $('modalContent');

// ── Init ───────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadCountries();
  searchBtn.addEventListener('click', handleSearch);
  queryInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleSearch(); });
  modalClose.addEventListener('click', closeModal);
  jobModal.addEventListener('click', (e) => { if (e.target === jobModal) closeModal(); });
});

// ── Load countries ──────────────────────────────────
async function loadCountries() {
  try {
    const data = await apiFetch(API.countries);
    data.forEach((c) => {
      const opt = document.createElement('option');
      opt.value = c.code;
      opt.textContent = c.name;
      if (c.code === 'gb') opt.selected = true;
      countrySelect.appendChild(opt);
    });
  } catch {
    // Non-critical; select will stay empty
  }
}

// ── Search handler ──────────────────────────────────
async function handleSearch(page = 1) {
  const query = queryInput.value.trim();
  if (!query) {
    showError('Please enter a job title or keyword to search.');
    return;
  }

  state.currentPage = page;
  state.lastQuery   = query;
  state.lastCountry = countrySelect.value;

  clearError();
  showLoading(true);

  try {
    const [jobsData] = await Promise.all([
      fetchJobs(query, countrySelect.value, page),
    ]);

    renderJobs(jobsData);
    // Fetch skills in background after jobs are rendered
    fetchAndRenderSkills(query, countrySelect.value);
  } catch (err) {
    showError(err.message || 'Something went wrong. Please try again.');
  } finally {
    showLoading(false);
  }
}

// ── Fetch jobs ──────────────────────────────────────
async function fetchJobs(query, country, page) {
  const params = new URLSearchParams({
    query,
    country,
    page,
    sort_by: sortBy.value,
    results_per_page: resultsPerPage.value,
  });
  if (salaryMin.value) params.append('salary_min', salaryMin.value);
  if (salaryMax.value) params.append('salary_max', salaryMax.value);
  if (fullTimeOnly.checked) params.append('full_time', '1');

  return apiFetch(`${API.search}?${params}`);
}

// ── Render jobs ─────────────────────────────────────
function renderJobs(data) {
  const results = data.results || [];
  const count   = data.count   || 0;

  state.totalCount = count;
  state.totalPages = Math.ceil(count / parseInt(resultsPerPage.value));

  // Stats bar
  totalResults.textContent = `${count.toLocaleString()} jobs found`;
  searchSummary.textContent = `"${state.lastQuery}" · ${getCountryName()}`;
  statsBar.style.display = 'block';
  mainContent.style.display = 'grid';

  // Job cards
  jobList.innerHTML = '';
  if (results.length === 0) {
    jobList.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:2rem 0;">No jobs found. Try a different search.</p>';
    renderPagination(0);
    return;
  }

  results.forEach((job) => {
    jobList.appendChild(buildJobCard(job));
  });

  renderPagination(state.totalPages);
}

function buildJobCard(job) {
  const card = document.createElement('div');
  card.className = 'job-card';
  card.addEventListener('click', () => openModal(job));

  const salary = formatSalary(job.salary_min, job.salary_max);
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
      <span class="tag">&#128205; ${escapeHtml(location)}</span>
      ${salary ? `<span class="tag tag-salary">&#128176; ${salary}</span>` : ''}
      ${job.contract_time ? `<span class="tag tag-type">${capitalize(job.contract_time.replace('_', ' '))}</span>` : ''}
      ${job.category?.label ? `<span class="tag">${escapeHtml(job.category.label)}</span>` : ''}
    </div>`;

  return card;
}

// ── Skills chart ────────────────────────────────────
async function fetchAndRenderSkills(query, country) {
  try {
    const data = await apiFetch(`${API.skills}?query=${encodeURIComponent(query)}&country=${country}`);
    renderSkillsChart(data);
  } catch {
    noSkills.classList.remove('hidden');
  }
}

function renderSkillsChart(data) {
  const skills = data.skills || [];
  noSkills.classList.toggle('hidden', skills.length > 0);

  if (!skills.length) return;

  skillsJobCount.textContent = `from ${data.total_jobs_analysed} listings`;

  const labels = skills.map((s) => s.skill);
  const values = skills.map((s) => s.count);
  const colors = generateColors(skills.length);

  if (state.skillsChart) {
    state.skillsChart.destroy();
  }

  const ctx = document.getElementById('skillsChart').getContext('2d');
  state.skillsChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Mentions',
        data: values,
        backgroundColor: colors,
        borderRadius: 5,
        borderSkipped: false,
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.parsed.x} mention${ctx.parsed.x !== 1 ? 's' : ''}`,
          },
        },
      },
      scales: {
        x: {
          grid: { color: '#f1f5f9' },
          ticks: { font: { size: 11 } },
        },
        y: {
          grid: { display: false },
          ticks: { font: { size: 11 } },
        },
      },
    },
  });
}

// ── Pagination ──────────────────────────────────────
function renderPagination(totalPages) {
  pagination.innerHTML = '';
  if (totalPages <= 1) return;

  const current = state.currentPage;
  const maxVisible = 5;

  const prevBtn = document.createElement('button');
  prevBtn.className = 'page-btn';
  prevBtn.textContent = '← Prev';
  prevBtn.disabled = current === 1;
  prevBtn.addEventListener('click', () => handleSearch(current - 1));
  pagination.appendChild(prevBtn);

  const start = Math.max(1, current - Math.floor(maxVisible / 2));
  const end   = Math.min(totalPages, start + maxVisible - 1);

  for (let i = start; i <= end; i++) {
    const btn = document.createElement('button');
    btn.className = `page-btn${i === current ? ' active' : ''}`;
    btn.textContent = i;
    btn.addEventListener('click', () => handleSearch(i));
    pagination.appendChild(btn);
  }

  const nextBtn = document.createElement('button');
  nextBtn.className = 'page-btn';
  nextBtn.textContent = 'Next →';
  nextBtn.disabled = current >= totalPages;
  nextBtn.addEventListener('click', () => handleSearch(current + 1));
  pagination.appendChild(nextBtn);
}

// ── Modal ───────────────────────────────────────────
function openModal(job) {
  const salary   = formatSalary(job.salary_min, job.salary_max);
  const company  = job.company?.display_name   || 'Company not specified';
  const location = job.location?.display_name  || 'Location not specified';
  const desc     = stripHtml(job.description   || 'No description available.');

  modalContent.innerHTML = `
    <div class="modal-title">${escapeHtml(job.title)}</div>
    <div class="modal-company">${escapeHtml(company)} &mdash; ${escapeHtml(location)}</div>
    <div class="modal-tags">
      ${salary ? `<span class="tag tag-salary">&#128176; ${salary}</span>` : ''}
      ${job.contract_time ? `<span class="tag tag-type">${capitalize(job.contract_time.replace('_',' '))}</span>` : ''}
      ${job.contract_type ? `<span class="tag">${capitalize(job.contract_type.replace('_',' '))}</span>` : ''}
      ${job.category?.label ? `<span class="tag">${escapeHtml(job.category.label)}</span>` : ''}
    </div>
    <div class="modal-description">${escapeHtml(desc)}</div>
    <a class="modal-apply" href="${job.redirect_url}" target="_blank" rel="noopener noreferrer">
      Apply Now &#8599;
    </a>`;

  jobModal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  jobModal.classList.add('hidden');
  document.body.style.overflow = '';
}

// ── Helpers ─────────────────────────────────────────
async function apiFetch(url) {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || `Request failed (${res.status})`);
  }
  return json;
}

function showLoading(visible) {
  loadingOverlay.classList.toggle('hidden', !visible);
}

function showError(msg) {
  errorBanner.textContent = msg;
  errorBanner.classList.remove('hidden');
}

function clearError() {
  errorBanner.textContent = '';
  errorBanner.classList.add('hidden');
}

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

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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
    '#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6',
    '#ec4899','#06b6d4','#84cc16','#f97316','#6366f1',
    '#14b8a6','#e11d48','#0ea5e9','#a3e635','#fb923c',
    '#a855f7','#22c55e','#eab308','#64748b','#94a3b8',
  ];
  return Array.from({ length: n }, (_, i) => palette[i % palette.length]);
}
