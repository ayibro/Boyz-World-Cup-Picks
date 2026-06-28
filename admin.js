// ── admin.js ── Admin-panel logic ──────────────────────────

let adminUnlocked = false;

document.addEventListener("DOMContentLoaded", () => {
  setupPinModal();
  setupTabs();
});

// ── PIN ─────────────────────────────────────────────────────
function setupPinModal() {
  const modal = document.getElementById("pinModal");
  const input = document.getElementById("pinInput");
  const btn   = document.getElementById("submitPin");

  const unlock = () => {
    const pin = input.value.trim();
    if (pin === CONFIG.ADMIN_PIN) {
      adminUnlocked = true;
      modal.classList.add("hidden");
      loadAdminGames();
    } else {
      showToast("❌ Wrong PIN");
      input.value = "";
      input.focus();
    }
  };

  btn.addEventListener("click", unlock);
  input.addEventListener("keypress", e => { if (e.key === "Enter") unlock(); });
  // Auto-focus
  setTimeout(() => input.focus(), 200);
}

// ── TABS ────────────────────────────────────────────────────
function setupTabs() {
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      if (!adminUnlocked) return;
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach(s => s.classList.remove("active"));
      btn.classList.add("active");
      const tabId = "tab-" + btn.dataset.tab;
      document.getElementById(tabId).classList.add("active");

      if (btn.dataset.tab === "all-picks") loadAllPicks();
    });
  });

  // Add-game button
  document.getElementById("addGameBtn").addEventListener("click", addGame);
}

// ── LOAD ADMIN GAMES ────────────────────────────────────────
async function loadAdminGames() {
  const container = document.getElementById("adminGamesList");
  container.innerHTML = `<div class="loading-state"><div class="spinner"></div><p>Loading…</p></div>`;

  try {
    const res   = await adminFetch({ action: "getGames", player: "_admin_" });
    const games = res.games || [];

    if (!games.length) {
      container.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><p>No games yet. Add one on the Add Game tab.</p></div>`;
      return;
    }

    container.innerHTML = games.map(g => adminGameCardHTML(g)).join("");
    attachAdminHandlers(container, games);
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>Error loading games.</p></div>`;
  }
}

function adminGameCardHTML(g) {
  const statusMap = {
    open:   `<span class="status-open">● Open</span>`,
    locked: `<span class="status-locked">🔒 Locked</span>`,
    done:   `<span class="status-done">✓ Done</span>`,
  };

  const winnerLine = g.winner
    ? `<div style="font-size:0.75rem;margin-top:4px;color:var(--gold)">🏆 Winner: ${esc(g.winner)}</div>`
    : "";

  return `
    <div class="admin-game-card" data-game-id="${esc(g.id)}">
      <div class="admin-game-header">
        <div>
          <div class="admin-game-title">${esc(g.teamA)} vs ${esc(g.teamB)}</div>
          <div class="admin-game-meta">${esc(g.round)} · ${g.date ? formatDate(g.date) : "No date"} · ${statusMap[g.status] || g.status}</div>
          ${winnerLine}
        </div>
      </div>
      <div class="admin-actions">
        ${g.status === "open"
          ? `<button class="btn-sm btn-lock" data-action="lock" data-id="${esc(g.id)}">🔒 Lock Picks</button>`
          : g.status === "locked"
            ? `<button class="btn-sm btn-unlock" data-action="unlock" data-id="${esc(g.id)}">🔓 Unlock</button>`
            : ""}
        ${g.status !== "open"
          ? `<button class="btn-sm btn-winner" data-action="set-winner" data-id="${esc(g.id)}" data-team-a="${esc(g.teamA)}" data-team-b="${esc(g.teamB)}">🏆 Set Winner</button>`
          : ""}
        <button class="btn-sm btn-delete" data-action="delete" data-id="${esc(g.id)}">🗑 Delete</button>
      </div>
      <div class="winner-select-row hidden" id="winnerRow-${esc(g.id)}">
        <select id="winnerSel-${esc(g.id)}">
          <option value="${esc(g.teamA)}">${esc(g.teamA)}</option>
          <option value="${esc(g.teamB)}">${esc(g.teamB)}</option>
        </select>
        <button class="btn-sm btn-winner" data-action="confirm-winner" data-id="${esc(g.id)}">Confirm</button>
      </div>
    </div>`;
}

function attachAdminHandlers(container, games) {
  container.querySelectorAll("[data-action]").forEach(btn => {
    btn.addEventListener("click", () => {
      const action = btn.dataset.action;
      const id     = btn.dataset.id;

      if (action === "lock")   return setGameStatus(id, "locked");
      if (action === "unlock") return setGameStatus(id, "open");
      if (action === "delete") return deleteGame(id);

      if (action === "set-winner") {
        const row = document.getElementById(`winnerRow-${id}`);
        row.classList.toggle("hidden");
        return;
      }

      if (action === "confirm-winner") {
        const sel = document.getElementById(`winnerSel-${id}`);
        return setWinner(id, sel.value);
      }
    });
  });
}

// ── ADD GAME ────────────────────────────────────────────────
async function addGame() {
  const teamA = document.getElementById("teamA").value.trim();
  const teamB = document.getElementById("teamB").value.trim();
  const date  = document.getElementById("matchDate").value;
  const round = document.getElementById("matchRound").value;

  if (!teamA || !teamB) { showToast("Enter both team names"); return; }
  if (teamA.toLowerCase() === teamB.toLowerCase()) { showToast("Teams can't be the same!"); return; }

  const btn = document.getElementById("addGameBtn");
  btn.disabled = true; btn.textContent = "Saving…";

  try {
    const res = await adminFetch({ action: "addGame", pin: CONFIG.ADMIN_PIN, teamA, teamB, date, round });
    if (!res.success) throw new Error(res.error || "Failed");
    showToast("✅ Game added!");
    document.getElementById("teamA").value = "";
    document.getElementById("teamB").value = "";
    document.getElementById("matchDate").value = "";
    // Switch to games tab
    document.querySelector('[data-tab="games"]').click();
    loadAdminGames();
  } catch (err) {
    showToast("⚠️ Error: " + err.message);
  } finally {
    btn.disabled = false; btn.textContent = "Add Game";
  }
}

// ── SET GAME STATUS ──────────────────────────────────────────
async function setGameStatus(id, status) {
  try {
    const res = await adminFetch({ action: "setStatus", pin: CONFIG.ADMIN_PIN, gameId: id, status });
    if (!res.success) throw new Error(res.error);
    showToast(status === "locked" ? "🔒 Game locked!" : "🔓 Game unlocked!");
    loadAdminGames();
  } catch (err) {
    showToast("⚠️ Error: " + err.message);
  }
}

// ── SET WINNER ───────────────────────────────────────────────
async function setWinner(id, winner) {
  try {
    const res = await adminFetch({ action: "setWinner", pin: CONFIG.ADMIN_PIN, gameId: id, winner });
    if (!res.success) throw new Error(res.error);
    showToast(`🏆 Winner set: ${winner}`);
    loadAdminGames();
  } catch (err) {
    showToast("⚠️ Error: " + err.message);
  }
}

// ── DELETE GAME ──────────────────────────────────────────────
async function deleteGame(id) {
  if (!confirm("Delete this game and all its picks?")) return;
  try {
    const res = await adminFetch({ action: "deleteGame", pin: CONFIG.ADMIN_PIN, gameId: id });
    if (!res.success) throw new Error(res.error);
    showToast("🗑 Game deleted");
    loadAdminGames();
  } catch (err) {
    showToast("⚠️ Error: " + err.message);
  }
}

// ── ALL PICKS ────────────────────────────────────────────────
async function loadAllPicks() {
  const container = document.getElementById("allPicksContainer");
  container.innerHTML = `<div class="loading-state"><div class="spinner"></div><p>Loading picks…</p></div>`;

  try {
    const res   = await adminFetch({ action: "getAllPicks", pin: CONFIG.ADMIN_PIN });
    const games = res.games  || [];
    const picks = res.picks  || {}; // { gameId: { player: team } }

    if (!games.length) {
      container.innerHTML = `<div class="empty-state"><p>No games yet.</p></div>`;
      return;
    }

    let html = "";
    games.forEach(g => {
      const gamePicks = picks[g.id] || {};
      const rows = Object.entries(gamePicks);

      html += `<table class="picks-table">
        <caption>${esc(g.teamA)} vs ${esc(g.teamB)} <span style="font-weight:400;color:var(--grey-mid)">(${esc(g.round)})</span></caption>
        <thead><tr><th>Player</th><th>Pick</th><th>Result</th></tr></thead>
        <tbody>`;

      if (!rows.length) {
        html += `<tr><td colspan="3" style="color:var(--grey-mid);padding:8px;">No picks yet</td></tr>`;
      } else {
        rows.forEach(([player, team]) => {
          let resultClass = "badge-pending", resultText = "Pending";
          if (g.winner) {
            if (team === g.winner) { resultClass = "badge-correct"; resultText = `✅ +${CONFIG.POINTS_PER_CORRECT}`; }
            else                   { resultClass = "badge-wrong";   resultText = "❌ 0 pts"; }
          }
          html += `<tr>
            <td>${esc(player)}</td>
            <td>${esc(team)}</td>
            <td class="${resultClass}">${resultText}</td>
          </tr>`;
        });
      }

      html += `</tbody></table>`;
    });

    container.innerHTML = html;
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><p>Error loading picks.</p></div>`;
  }
}

// ── HELPERS ─────────────────────────────────────────────────
async function adminFetch(params) {
  const url = new URL(CONFIG.SCRIPT_URL);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function formatDate(str) {
  try {
    const d = new Date(str);
    return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  } catch { return str; }
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
