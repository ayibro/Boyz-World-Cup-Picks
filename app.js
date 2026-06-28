// ── app.js ── Player-facing logic ──────────────────────────

// ── STATE ──────────────────────────────────────────────────
let playerName = localStorage.getItem("wcPickem_name") || "";
let games      = [];
let myPicks    = {}; // { gameId: teamPicked }

// ── INIT ────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  setupTabs();
  setupNameModal();

  if (playerName) {
    showPlayerBanner(playerName);
    loadGames();
  } else {
    document.getElementById("nameModal").classList.remove("hidden");
  }

  // Leaderboard lazy-load when tab clicked
  document.querySelector('[data-tab="leaderboard"]').addEventListener("click", loadLeaderboard);
});

// ── TABS ────────────────────────────────────────────────────
function setupTabs() {
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach(s => s.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById("tab-" + btn.dataset.tab).classList.add("active");
    });
  });
}

// ── NAME MODAL ──────────────────────────────────────────────
function setupNameModal() {
  const modal = document.getElementById("nameModal");
  const input = document.getElementById("playerNameInput");
  const btn   = document.getElementById("submitName");

  input.value = playerName;

  const submit = () => {
    const name = input.value.trim();
    if (!name) { showToast("Please enter your name!"); return; }
    playerName = name;
    localStorage.setItem("wcPickem_name", name);
    modal.classList.add("hidden");
    showPlayerBanner(name);
    loadGames();
  };

  btn.addEventListener("click", submit);
  input.addEventListener("keypress", e => { if (e.key === "Enter") submit(); });

  document.getElementById("changeName").addEventListener("click", () => {
    input.value = playerName;
    modal.classList.remove("hidden");
  });
}

function showPlayerBanner(name) {
  document.getElementById("bannerName").textContent = name;
  document.getElementById("playerBanner").classList.remove("hidden");
}

// ── LOAD GAMES ──────────────────────────────────────────────
async function loadGames() {
  const container = document.getElementById("gamesList");
  container.innerHTML = `<div class="loading-state"><div class="spinner"></div><p>Loading matches…</p></div>`;

  try {
    const res  = await apiFetch({ action: "getGames", player: playerName });
    games      = res.games  || [];
    myPicks    = res.picks  || {};

    if (!games.length) {
      container.innerHTML = `<div class="empty-state"><div class="empty-icon">📅</div><p>No matches scheduled yet.<br>Check back soon!</p></div>`;
      return;
    }

    renderGames(container);
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>Couldn't load matches.<br>Check your connection and try again.</p></div>`;
    console.error(err);
  }
}

// ── RENDER GAMES ────────────────────────────────────────────
function renderGames(container) {
  // Group by round
  const rounds = {};
  games.forEach(g => {
    if (!rounds[g.round]) rounds[g.round] = [];
    rounds[g.round].push(g);
  });

  let html = "";
  for (const [round, list] of Object.entries(rounds)) {
    html += `<div class="section-label">${esc(round)}</div>`;
    list.forEach(g => { html += gameCardHTML(g); });
  }
  container.innerHTML = html;

  // Attach pick handlers
  container.querySelectorAll(".team-pick-btn[data-game-id]").forEach(btn => {
    btn.addEventListener("click", () => pickTeam(btn.dataset.gameId, btn.dataset.team));
  });
}

function gameCardHTML(g) {
  const isLocked  = g.status === "locked" || g.status === "done";
  const myPick    = myPicks[g.id];
  const winner    = g.winner;
  const dateStr   = g.date ? formatDate(g.date) : "";
  const isDone    = g.status === "done";

  let pickStatusText = "";
  let pickStatusClass = "";

  if (isDone && myPick && winner) {
    if (myPick === winner) {
      pickStatusText  = `✅ Correct! +${CONFIG.POINTS_PER_CORRECT} pts`;
      pickStatusClass = "correct-pick";
    } else {
      pickStatusText  = `❌ Wrong — ${esc(winner)} won`;
      pickStatusClass = "wrong-pick";
    }
  } else if (myPick) {
    pickStatusText  = `Your pick: ${esc(myPick)}`;
    pickStatusClass = "pending-pick";
  } else if (isLocked) {
    pickStatusText  = "🔒 Picks closed";
  }

  const teamAClass = [
    "team-pick-btn",
    myPick === g.teamA ? "selected" : "",
    isDone && winner === g.teamA ? "winner" : "",
  ].filter(Boolean).join(" ");

  const teamBClass = [
    "team-pick-btn",
    myPick === g.teamB ? "selected" : "",
    isDone && winner === g.teamB ? "winner" : "",
  ].filter(Boolean).join(" ");

  const cardClass = [
    "game-card",
    myPick ? "picked" : "",
    isLocked ? "locked" : "",
    isDone && myPick && winner && myPick === winner ? "correct" : "",
  ].filter(Boolean).join(" ");

  return `
    <div class="${cardClass}" data-game-id="${esc(g.id)}">
      <div class="game-meta">
        <span class="round-badge">${esc(g.round)}</span>
        <span class="match-date">${dateStr}</span>
        ${isLocked ? `<span class="locked-badge">🔒 Locked</span>` : ""}
      </div>
      <div class="teams-row">
        <button class="${teamAClass}"
          data-game-id="${esc(g.id)}" data-team="${esc(g.teamA)}"
          ${isLocked ? "disabled" : ""}>
          ${esc(g.teamA)}
        </button>
        <span class="vs-label">VS</span>
        <button class="${teamBClass}"
          data-game-id="${esc(g.id)}" data-team="${esc(g.teamB)}"
          ${isLocked ? "disabled" : ""}>
          ${esc(g.teamB)}
        </button>
      </div>
      <div class="pick-status ${pickStatusClass}">${pickStatusText}</div>
    </div>`;
}

// ── PICK A TEAM ─────────────────────────────────────────────
async function pickTeam(gameId, team) {
  if (!playerName) { showToast("Enter your name first!"); return; }

  const game = games.find(g => g.id === gameId);
  if (!game || game.status === "locked" || game.status === "done") {
    showToast("🔒 Picks are closed for this match.");
    return;
  }

  // Optimistic UI
  const prev  = myPicks[gameId];
  myPicks[gameId] = team;
  updateGameCard(gameId);

  try {
    const res = await apiFetch({ action: "submitPick", player: playerName, gameId, team });
    if (!res.success) throw new Error(res.error || "Failed");
    showToast(`✅ Picked ${team}`);
  } catch (err) {
    // Rollback
    if (prev) myPicks[gameId] = prev; else delete myPicks[gameId];
    updateGameCard(gameId);
    showToast("⚠️ Couldn't save pick. Try again.");
  }
}

function updateGameCard(gameId) {
  const game = games.find(g => g.id === gameId);
  if (!game) return;
  const card = document.querySelector(`.game-card[data-game-id="${gameId}"]`);
  if (!card) return;
  card.outerHTML = gameCardHTML(game);
  // Re-attach listener for the replaced card
  const newCard = document.querySelector(`.game-card[data-game-id="${gameId}"]`);
  if (newCard) {
    newCard.querySelectorAll(".team-pick-btn").forEach(btn => {
      btn.addEventListener("click", () => pickTeam(btn.dataset.gameId, btn.dataset.team));
    });
  }
}

// ── LEADERBOARD ─────────────────────────────────────────────
async function loadLeaderboard() {
  const container = document.getElementById("leaderboardList");
  if (!container.querySelector(".loading-state")) return; // already loaded with real data
  container.innerHTML = `<div class="loading-state"><div class="spinner"></div><p>Loading…</p></div>`;

  try {
    const res  = await apiFetch({ action: "getLeaderboard" });
    const rows = res.leaderboard || [];

    if (!rows.length) {
      container.innerHTML = `<div class="empty-state"><div class="empty-icon">🏅</div><p>No scores yet.<br>Be the first to make picks!</p></div>`;
      return;
    }

    container.innerHTML = rows.map((r, i) => {
      const rank = i + 1;
      const isMe = r.player.toLowerCase() === (playerName || "").toLowerCase();
      const cls  = ["lb-row", isMe ? "me" : "", `top-${rank}`].filter(Boolean).join(" ");
      const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : rank;

      return `
        <div class="${cls}">
          <div class="lb-rank">${medal}</div>
          <div class="lb-name">${esc(r.player)}${isMe ? " (you)" : ""}</div>
          <div class="lb-correct">
            <div class="lb-pts">${r.points}</div>
            <div class="lb-pts-label">PTS · ${r.correct}/${r.total} correct</div>
          </div>
        </div>`;
    }).join("");
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>Couldn't load leaderboard.</p></div>`;
  }
}

// ── HELPERS ─────────────────────────────────────────────────
async function apiFetch(params) {
  const url = new URL(CONFIG.SCRIPT_URL);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function formatDate(str) {
  if (!str) return "";
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
