// ─── Config ─────────────────────────────────────────────────────────────────
// Hardcoded backend nodes for round-robin load balancing (Scalability Demo)
// Currently pointing to localhost ports. These will be updated to AWS EC2 IPs for production.
const BACKEND_NODES = [
  'http://localhost:3001',
  'http://localhost:3002'
];

let currentNodeIndex = 0;

function getBase() {
  const base = BACKEND_NODES[currentNodeIndex];
  currentNodeIndex = (currentNodeIndex + 1) % BACKEND_NODES.length;
  console.log(`[Load Balancer] Routing request to: ${base}`);
  return base;
}
// Toggle API config with Ctrl+Shift+A
document.addEventListener('keydown', e => {
  if (e.ctrlKey && e.shiftKey && e.key === 'A') {
    const el = document.getElementById('api-config');
    el.style.display = el.style.display === 'none' ? 'block' : 'none';
  }
});

// ─── Toast Notification ─────────────────────────────────────────────────────
function toast(msg, type = 'success') {
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

// ─── Page Navigation ────────────────────────────────────────────────────────
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(`page-${name}`).classList.add('active');
  document.querySelectorAll('.nav-links button').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');

  if (name === 'dashboard') loadDashboard();
  if (name === 'requests') loadRequests();
  if (name === 'providers') loadProviders();
  if (name === 'services') loadCategories();
}

// ─── Dashboard ──────────────────────────────────────────────────────────────
async function loadDashboard() {
  try {
    const res = await fetch(`${getBase()}/dashboard`);
    const data = await res.json();
    const s = data.stats;

    document.getElementById('stats-grid').innerHTML = `
      <div class="stat-card"><div class="stat-value">${s.totalRequests}</div><div class="stat-label">Total Requests</div></div>
      <div class="stat-card"><div class="stat-value">${s.pendingRequests}</div><div class="stat-label">Pending</div></div>
      <div class="stat-card"><div class="stat-value">${s.activeRequests}</div><div class="stat-label">Active</div></div>
      <div class="stat-card"><div class="stat-value">${s.completedRequests}</div><div class="stat-label">Completed</div></div>
      <div class="stat-card"><div class="stat-value">${s.totalProviders}</div><div class="stat-label">Providers</div></div>
      <div class="stat-card"><div class="stat-value">${s.avgRating || '—'}</div><div class="stat-label">Avg Rating</div></div>
    `;

    const recent = data.recentRequests;
    if (!recent.length) {
      document.getElementById('recent-activity').innerHTML = '<div class="empty"><div class="empty-icon">📭</div><p>No activity yet. Book a service to get started!</p></div>';
      return;
    }
    document.getElementById('recent-activity').innerHTML = recent.map(r => `
      <div class="req-item">
        <div class="req-header">
          <span class="req-title">${r.service}</span>
          <span class="badge badge-${statusClass(r.status)}">${r.status}</span>
        </div>
        <div class="req-meta"><span>👤 ${r.user}</span><span>⏰ ${timeAgo(r.createdAt)}</span><span class="badge badge-${r.urgency.toLowerCase()}">${r.urgency}</span></div>
      </div>
    `).join('');
  } catch (e) {
    document.getElementById('stats-grid').innerHTML = '<div class="empty"><div class="empty-icon">⚠️</div><p>Cannot reach API. Press Ctrl+Shift+A to configure.</p></div>';
  }
}

// ─── Categories ─────────────────────────────────────────────────────────────
async function loadCategories() {
  try {
    const res = await fetch(`${getBase()}/categories`);
    const data = await res.json();
    document.getElementById('cat-grid').innerHTML = data.data.map(c => `
      <div class="cat-card" onclick="selectCategory('${c.name}')">
        <div class="cat-icon">${c.icon}</div>
        <div class="cat-name">${c.name}</div>
      </div>
    `).join('');

    // Populate select dropdown
    const sel = document.getElementById('f-service');
    sel.innerHTML = '<option value="">-- Select --</option>' + data.data.map(c => `<option value="${c.name}">${c.icon} ${c.name}</option>`).join('');
  } catch (e) { /* ignore */ }
}

function selectCategory(name) {
  document.getElementById('f-service').value = name;
  document.getElementById('f-name').focus();
}

// ─── Submit Service Request ─────────────────────────────────────────────────
async function submitRequest() {
  const body = {
    user: document.getElementById('f-name').value.trim(),
    userEmail: document.getElementById('f-email').value.trim(),
    userPhone: document.getElementById('f-phone').value.trim(),
    service: document.getElementById('f-service').value,
    description: document.getElementById('f-desc').value.trim(),
    location: document.getElementById('f-loc').value.trim(),
    urgency: document.getElementById('f-urgency').value,
    budget: Number(document.getElementById('f-budget').value) || 0,
    scheduledDate: document.getElementById('f-date').value || null
  };
  if (!body.user || !body.service) return toast('Please fill name and service!', 'error');

  try {
    const res = await fetch(`${getBase()}/request-service`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error('Failed');
    toast('✅ Service request created!');
    ['f-name','f-email','f-phone','f-desc','f-loc','f-budget','f-date'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('f-service').value = '';
  } catch (e) { toast('❌ Error creating request', 'error'); }
}

// ─── Requests List ──────────────────────────────────────────────────────────
async function loadRequests() {
  const list = document.getElementById('requests-list');
  const status = document.getElementById('filter-status').value;
  const urgency = document.getElementById('filter-urgency').value;
  let url = `${getBase()}/requests?`;
  if (status) url += `status=${status}&`;
  if (urgency) url += `urgency=${urgency}&`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    if (!data.data.length) {
      list.innerHTML = '<div class="empty"><div class="empty-icon">📭</div><p>No requests found</p></div>';
      return;
    }
    list.innerHTML = data.data.map(r => `
      <div class="req-item">
        <div class="req-header">
          <span class="req-title">${r.service}</span>
          <span class="badge badge-${statusClass(r.status)}">${r.status}</span>
        </div>
        <div class="req-meta">
          <span>👤 ${r.user}</span>
          <span>📍 ${r.location || 'N/A'}</span>
          <span>💰 ₹${r.budget || '—'}</span>
          <span class="badge badge-${r.urgency.toLowerCase()}">${r.urgency}</span>
          <span>⏰ ${timeAgo(r.createdAt)}</span>
        </div>
        ${r.description ? `<div class="req-desc">${r.description}</div>` : ''}
        ${r.providerName ? `<div class="req-meta" style="margin-top:6px"><span>🔧 Provider: <strong>${r.providerName}</strong></span></div>` : ''}
        <div class="req-actions">
          ${r.status === 'Pending' ? `
            <button class="btn btn-success btn-sm" onclick="acceptReq('${r._id}')">✅ Accept</button>
            <button class="btn btn-danger btn-sm" onclick="cancelReq('${r._id}')">✖ Cancel</button>
          ` : ''}
          ${r.status === 'Accepted' ? `<button class="btn btn-primary btn-sm" onclick="startReq('${r._id}')">▶ Start</button>` : ''}
          ${r.status === 'In Progress' ? `<button class="btn btn-success btn-sm" onclick="completeReq('${r._id}')">✔ Complete</button>` : ''}
          <button class="btn btn-outline btn-sm" onclick="deleteReq('${r._id}')">🗑</button>
        </div>
      </div>
    `).join('');
  } catch (e) { list.innerHTML = '<div class="empty"><div class="empty-icon">⚠️</div><p>Cannot load requests</p></div>'; }
}

async function acceptReq(id) {
  const name = prompt('Provider name:');
  if (!name) return;
  await fetch(`${getBase()}/accept-request/${id}`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ providerName: name }) });
  toast('Request accepted!'); loadRequests();
}
async function startReq(id) {
  await fetch(`${getBase()}/start-request/${id}`, { method:'POST' });
  toast('Service started!'); loadRequests();
}
async function completeReq(id) {
  await fetch(`${getBase()}/complete-request/${id}`, { method:'POST' });
  toast('Service completed!'); loadRequests();
}
async function cancelReq(id) {
  if (!confirm('Cancel this request?')) return;
  await fetch(`${getBase()}/cancel-request/${id}`, { method:'POST' });
  toast('Request cancelled'); loadRequests();
}
async function deleteReq(id) {
  if (!confirm('Delete permanently?')) return;
  await fetch(`${getBase()}/request/${id}`, { method:'DELETE' });
  toast('Deleted'); loadRequests();
}

// ─── Providers ──────────────────────────────────────────────────────────────
async function loadProviders() {
  const q = document.getElementById('prov-search').value.trim();
  let url = `${getBase()}/providers`;
  if (q) url += `?skill=${encodeURIComponent(q)}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    const grid = document.getElementById('prov-grid');
    if (!data.data.length) { grid.innerHTML = '<div class="empty"><div class="empty-icon">👤</div><p>No providers found</p></div>'; return; }
    grid.innerHTML = data.data.map(p => `
      <div class="prov-card">
        <div class="prov-name">${p.name}</div>
        <div class="prov-skills">${p.skills.map(s => `<span>${s}</span>`).join('')}</div>
        <div style="font-size:0.85rem;color:var(--text-dim)">${p.bio || ''}</div>
        <div class="prov-stats">
          <span class="prov-rating">${stars(p.rating)} ${p.rating}</span>
          <span>📋 ${p.totalJobs} jobs</span>
          <span>📍 ${p.location || 'N/A'}</span>
          <span style="color:${p.available?'var(--accent)':'var(--danger)'}">${p.available ? '🟢 Available' : '🔴 Busy'}</span>
        </div>
      </div>
    `).join('');
  } catch (e) { /* ignore */ }
}

async function registerProvider() {
  const body = {
    name: document.getElementById('p-name').value.trim(),
    email: document.getElementById('p-email').value.trim(),
    phone: document.getElementById('p-phone').value.trim(),
    location: document.getElementById('p-loc').value.trim(),
    skills: document.getElementById('p-skills').value.split(',').map(s => s.trim()).filter(Boolean),
    bio: document.getElementById('p-bio').value.trim()
  };
  if (!body.name || !body.email) return toast('Name and email required!', 'error');
  try {
    await fetch(`${getBase()}/providers`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
    toast('✅ Provider registered!');
    ['p-name','p-email','p-phone','p-loc','p-skills','p-bio'].forEach(id => document.getElementById(id).value = '');
    loadProviders();
  } catch (e) { toast('❌ Error registering', 'error'); }
}

// ─── Seed ───────────────────────────────────────────────────────────────────
async function seedData() {
  try {
    const res = await fetch(`${getBase()}/seed`, { method: 'POST' });
    const data = await res.json();
    toast(data.message);
    loadDashboard();
  } catch (e) { toast('Seed failed', 'error'); }
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function statusClass(s) {
  return { 'Pending':'pending','Accepted':'accepted','In Progress':'progress','Completed':'completed','Cancelled':'cancelled' }[s] || 'pending';
}
function stars(n) { return '★'.repeat(Math.round(n)) + '☆'.repeat(5 - Math.round(n)); }
function timeAgo(d) {
  const diff = (Date.now() - new Date(d)) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  return `${Math.floor(diff/86400)}d ago`;
}

// ─── Init ───────────────────────────────────────────────────────────────────
loadDashboard();
