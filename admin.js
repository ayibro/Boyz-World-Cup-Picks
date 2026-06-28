// ── admin.js ── Admin Panel Logic ───────────────────────────

let adminData = null;

document.addEventListener("DOMContentLoaded", () => {
  setupPin();
  setupTabs();
});

// ── PIN ──────────────────────────────────────────────────────
function setupPin() {
  const input = document.getElementById("pinInput");
  const btn   = document.getElementById("submitPin");

  const unlock = async () => {
    const pin = input.value.trim();
    if (pin !== CONFIG.ADMIN_PIN) { showToast("❌ Wrong PIN"); input.value=""; return; }
    document.getElementById("pinModal").classList.add("hidden");
    await loadAdminData();
    renderResults();
  };

  btn.addEventListener("click", unlock);
  input.addEventListener("keypress", e => { if(e.key==="Enter") unlock(); });
  setTimeout(() => input.focus(), 200);
}

// ── TABS ────────────────────────────────────────────────────
function setupTabs() {
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach(s => s.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById("tab-" + btn.dataset.tab).classList.add("active");
      if (btn.dataset.tab === "picks")   renderAllPicks();
      if (btn.dataset.tab === "players") renderPlayers();
    });
  });

  document.getElementById("lockAllBtn").addEventListener("click", () => setBracketLock(true));
  document.getElementById("unlockAllBtn").addEventListener("click", () => setBracketLock(false));
}

// ── LOAD DATA ────────────────────────────────────────────────
async function loadAdminData() {
  try {
    adminData = await adminFetch({ action:"getAdminView", pin:CONFIG.ADMIN_PIN });
  } catch(e) {
    showToast("⚠️ Error loading data");
  }
}

// ── RENDER RESULTS ───────────────────────────────────────────
function renderResults() {
  if (!adminData) return;
  const container = document.getElementById("resultsContainer");
  const { matches, results, locked } = adminData;

  let html = "";
  BRACKET.ROUND_ORDER.forEach(round => {
    const roundMatches = matches.filter(m => m.round === round);
    html += `<div class="section-label" style="margin-top:16px">${BRACKET.ROUND_LABELS[round]}</div>`;
    roundMatches.forEach(m => {
      const winner = results[m.id] || "";
      const teamA  = m.teamA || "TBD";
      const teamB  = m.teamB || "TBD";
      const hasBoth = m.teamA && m.teamB;

      html += `<div class="admin-game-card">
        <div class="admin-game-title">${esc(teamA)} vs ${esc(teamB)}</div>
        <div class="admin-game-meta">${BRACKET.ROUND_LABELS[round]} · Match ${esc(m.id).toUpperCase()}</div>
        ${winner ? `<div style="color:var(--gold);font-size:0.8rem;margin-top:4px">🏆 Winner: ${esc(winner)}</div>` : ""}
        <div class="admin-actions" style="margin-top:10px">
          <select class="winner-sel" id="sel-${esc(m.id)}" ${!hasBoth?"disabled":""}>
            <option value="">— Set winner —</option>
            <option value="${esc(m.teamA)}" ${winner===m.teamA?"selected":""}>${esc(teamA)}</option>
            <option value="${esc(m.teamB)}" ${winner===m.teamB?"selected":""}>${esc(teamB)}</option>
          </select>
          <button class="btn-sm btn-winner" onclick="saveResult('${esc(m.id)}')">✓ Save</button>
        </div>
      </div>`;
    });
  });

  container.innerHTML = html;

  // Style selects
  container.querySelectorAll(".winner-sel").forEach(sel => {
    sel.style.cssText = "flex:1;background:var(--pitch-mid);border:1px solid var(--pitch-line);border-radius:6px;color:var(--white);font-size:0.9rem;padding:8px 10px;outline:none;margin-right:8px";
  });
}

async function saveResult(matchId) {
  const sel = document.getElementById("sel-" + matchId);
  const winner = sel?.value;
  if (!winner) { showToast("Select a winner first"); return; }
  try {
    const res = await adminFetch({ action:"setResult", pin:CONFIG.ADMIN_PIN, matchId, winner });
    if (!res.success) throw new Error(res.error);
    showToast(`✅ Result saved: ${winner}`);
    await loadAdminData();
    renderResults();
  } catch(e) {
    showToast("⚠️ Error: " + e.message);
  }
}

// ── LOCK / UNLOCK ────────────────────────────────────────────
async function setBracketLock(lock) {
  const label = lock ? "lock" : "unlock";
  if (!confirm(`${label.charAt(0).toUpperCase()+label.slice(1)} ALL brackets?`)) return;
  try {
    const action = lock ? "lockBracket" : "unlockBracket";
    // unlockBracket not yet in backend — handle via setResult hack or add it
    const res = await adminFetch({ action, pin:CONFIG.ADMIN_PIN });
    if (!res.success) throw new Error(res.error || "Failed");
    showToast(lock ? "🔒 All brackets locked!" : "🔓 All brackets unlocked!");
    await loadAdminData();
  } catch(e) {
    showToast("⚠️ " + e.message);
  }
}

// ── ALL PICKS ────────────────────────────────────────────────
async function renderAllPicks() {
  if (!adminData) await loadAdminData();
  const container = document.getElementById("allPicksContainer");
  const { matches, picks, results, players } = adminData;

  let html = "";
  BRACKET.ROUND_ORDER.forEach(round => {
    const roundMatches = matches.filter(m => m.round === round);
    html += `<div class="section-label" style="margin-top:16px">${BRACKET.ROUND_LABELS[round]}</div>`;
    roundMatches.forEach(m => {
      const matchPicks = picks[m.id] || {};
      const winner = results[m.id] || "";
      const teamA = m.teamA || "TBD";
      const teamB = m.teamB || "TBD";
      const pickEntries = Object.entries(matchPicks);

      html += `<div class="admin-game-card" style="margin-bottom:8px">
        <div class="admin-game-title" style="font-size:0.95rem">${esc(teamA)} vs ${esc(teamB)}</div>`;

      if (!pickEntries.length) {
        html += `<div style="color:var(--grey-mid);font-size:0.78rem;margin-top:6px">No picks yet</div>`;
      } else {
        html += `<div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:6px">`;
        pickEntries.forEach(([player, pick]) => {
          let cls = "badge-pending";
          if (winner) cls = pick === winner ? "badge-correct" : "badge-wrong";
          html += `<span style="font-size:0.75rem;padding:3px 8px;border-radius:12px;background:var(--pitch-mid)">
            ${esc(player)}: <strong class="${cls}">${esc(pick)}</strong>
          </span>`;
        });
        html += `</div>`;
      }
      html += `</div>`;
    });
  });

  container.innerHTML = html;
}

// ── PLAYERS ──────────────────────────────────────────────────
async function renderPlayers() {
  if (!adminData) await loadAdminData();
  const container = document.getElementById("playersContainer");
  const { players, picks, results } = adminData;

  // Calculate each player's pick count
  const allPicks = Object.values(picks).flatMap(m => Object.entries(m));
  const playerPickCounts = {};
  allPicks.forEach(([player]) => {
    playerPickCounts[player] = (playerPickCounts[player] || 0) + 1;
  });

  if (!players.length) {
    container.innerHTML = `<div class="empty-state"><p>No players registered yet.</p></div>`;
    return;
  }

  container.innerHTML = players.map((name, i) => `
    <div class="lb-row">
      <div class="lb-rank">${i+1}</div>
      <div class="lb-name">${esc(name)}</div>
      <div class="lb-correct">
        <div class="lb-pts" style="font-size:1rem">${playerPickCounts[name] || 0}</div>
        <div class="lb-pts-label">picks made</div>
      </div>
    </div>`).join("");
}

// ── HELPERS ─────────────────────────────────────────────────
async function adminFetch(params) {
  const url = new URL(CONFIG.SCRIPT_URL);
  Object.entries(params).forEach(([k,v]) => url.searchParams.set(k,v));
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function esc(s) {
  if (!s) return "";
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

let toastTimer;
function showToast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2800);
}
