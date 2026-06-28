// ── app.js ── Bracket Pick'em Player Logic ──────────────────

let playerName = localStorage.getItem("wcPickem_name") || "";
let playerPin  = localStorage.getItem("wcPickem_pin")  || "";
let bracketData = null; // { matches, locked, results }
let myPicks = {};       // { matchId: teamName }
let savingQueue = {};   // debounce saves

// ── INIT ────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  setupTabs();
  setupAuth();
  if (playerName && playerPin) {
    showBanner();
    loadBracket();
  } else {
    document.getElementById("authModal").classList.remove("hidden");
  }
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

// ── AUTH ────────────────────────────────────────────────────
function setupAuth() {
  const nameInput = document.getElementById("playerNameInput");
  const pinInput  = document.getElementById("playerPinInput");
  let pending = "";

  document.getElementById("submitNameBtn").addEventListener("click", () => {
    const name = nameInput.value.trim();
    if (!name) { showToast("Enter your name!"); return; }
    pending = name;
    document.getElementById("pinLabel").textContent =
      `${name} — set a 4-digit PIN (new players) or enter your existing PIN.`;
    document.getElementById("nameSection").classList.add("hidden");
    document.getElementById("pinSection").classList.remove("hidden");
    pinInput.value = "";
    pinInput.focus();
  });

  nameInput.addEventListener("keypress", e => { if (e.key==="Enter") document.getElementById("submitNameBtn").click(); });

  document.getElementById("submitPinBtn").addEventListener("click", async () => {
    const pin = pinInput.value.trim();
    if (!/^\d{4}$/.test(pin)) { showToast("Must be 4 digits"); return; }
    const btn = document.getElementById("submitPinBtn");
    btn.disabled = true; btn.textContent = "Checking…";
    try {
      const res = await api({ action:"registerOrLogin", player:pending, pin });
      if (!res.success) { showToast("❌ " + (res.error||"Wrong PIN")); return; }
      playerName = pending; playerPin = pin;
      localStorage.setItem("wcPickem_name", playerName);
      localStorage.setItem("wcPickem_pin",  playerPin);
      document.getElementById("authModal").classList.add("hidden");
      showBanner();
      showToast(res.isNew ? `Welcome, ${playerName}! 🎉` : `Welcome back, ${playerName}!`);
      loadBracket();
    } catch(e) { showToast("⚠️ Network error"); }
    finally { btn.disabled = false; btn.textContent = "Enter →"; }
  });

  pinInput.addEventListener("keypress", e => { if (e.key==="Enter") document.getElementById("submitPinBtn").click(); });

  document.getElementById("backToNameBtn").addEventListener("click", () => {
    document.getElementById("pinSection").classList.add("hidden");
    document.getElementById("nameSection").classList.remove("hidden");
  });

  document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.clear();
    playerName = ""; playerPin = "";
    document.getElementById("playerBanner").classList.add("hidden");
    nameInput.value = "";
    document.getElementById("nameSection").classList.remove("hidden");
    document.getElementById("pinSection").classList.add("hidden");
    document.getElementById("authModal").classList.remove("hidden");
  });
}

function showBanner() {
  document.getElementById("bannerName").textContent = playerName;
  document.getElementById("playerBanner").classList.remove("hidden");
}

// ── LOAD BRACKET ────────────────────────────────────────────
async function loadBracket() {
  const container = document.getElementById("bracketContainer");
  container.innerHTML = `<div class="loading-state"><div class="spinner"></div><p>Loading your bracket…</p></div>`;

  try {
    const res = await api({ action:"getBracket", player:playerName, pin:playerPin });
    bracketData = res;

    // Build myPicks from returned matches
    myPicks = {};
    res.matches.forEach(m => { if (m.myPick) myPicks[m.id] = m.myPick; });

    if (res.locked) {
      document.getElementById("lockedBanner").classList.remove("hidden");
    }

    renderBracket(container, res.matches, res.locked, res.results);
    updateSummary();
  } catch(e) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>Couldn't load bracket.<br>Check connection.</p></div>`;
  }
}

// ── RENDER BRACKET ───────────────────────────────────────────
function renderBracket(container, serverMatches, locked, results) {
  // Merge server data (picks, real team names) onto full local bracket
  // Use BRACKET.matches as the source of truth for all 31 matches
  const serverMap = {};
  (serverMatches || []).forEach(m => { serverMap[m.id] = m; });

  // Build display matches: local structure + server team names + picks cascaded
  const displayMatches = BRACKET.matches.map(m => ({
    ...m,
    teamA:  serverMap[m.id]?.teamA  || m.teamA || "",
    teamB:  serverMap[m.id]?.teamB  || m.teamB || "",
    winner: results[m.id] || "",
    myPick: myPicks[m.id] || "",
  }));

  // Cascade player's picks forward to populate future round team names
  displayMatches.forEach(m => {
    const pick = myPicks[m.id];
    if (pick && m.next) {
      const next = displayMatches.find(x => x.id === m.next);
      if (next) {
        if (m.slot === "a") next.teamA = pick;
        else                next.teamB = pick;
      }
    }
  });

  // Also cascade real results forward
  displayMatches.forEach(m => {
    const winner = results[m.id];
    if (winner && m.next) {
      const next = displayMatches.find(x => x.id === m.next);
      if (next) {
        if (m.slot === "a") next.teamA = winner;
        else                next.teamB = winner;
      }
    }
  });

  let html = "";
  BRACKET.ROUND_ORDER.forEach(round => {
    const roundMatches = displayMatches.filter(m => m.round === round);
    const label = BRACKET.ROUND_LABELS[round];
    const pts   = BRACKET.POINTS[round];

    html += `<div class="round-section">
      <div class="section-label">${label} <span class="pts-badge">+${pts} pts</span></div>
      <div class="match-list">`;

    roundMatches.forEach(m => {
      html += matchCardHTML(m, locked, results);
    });

    html += `</div></div>`;
  });

  container.innerHTML = html;

  // Attach pick handlers — pass displayMatches for cascade
  container.querySelectorAll(".pick-btn[data-match-id]").forEach(btn => {
    btn.addEventListener("click", () => {
      if (locked) { showToast("🔒 Bracket is locked!"); return; }
      if (!btn.dataset.team) return;
      makePick(btn.dataset.matchId, btn.dataset.team, displayMatches);
    });
  });
}

function matchCardHTML(m, locked, results) {
  const myPick  = myPicks[m.id] || "";
  const winner  = results[m.id] || "";
  const isDone  = !!winner;
  const hasTeams = m.teamA && m.teamB;

  const teamACorrect = isDone && winner === m.teamA;
  const teamBCorrect = isDone && winner === m.teamB;
  const myPickCorrect = isDone && myPick && myPick === winner;
  const myPickWrong   = isDone && myPick && myPick !== winner;

  const cardClass = ["match-card",
    myPick ? "picked" : "",
    myPickCorrect ? "correct" : "",
    myPickWrong ? "wrong" : "",
    !hasTeams ? "pending" : "",
  ].filter(Boolean).join(" ");

  const teamAClass = ["pick-btn",
    myPick === m.teamA ? "selected" : "",
    teamACorrect ? "winner" : "",
    isDone && winner !== m.teamA && myPick === m.teamA ? "loser" : "",
    !hasTeams || locked ? "disabled" : "",
  ].filter(Boolean).join(" ");

  const teamBClass = ["pick-btn",
    myPick === m.teamB ? "selected" : "",
    teamBCorrect ? "winner" : "",
    isDone && winner !== m.teamB && myPick === m.teamB ? "loser" : "",
    !hasTeams || locked ? "disabled" : "",
  ].filter(Boolean).join(" ");

  let statusText = "";
  if (myPickCorrect)      statusText = `✅ +${BRACKET.POINTS[m.round]} pts`;
  else if (myPickWrong)   statusText = `❌ ${esc(winner)} advanced`;
  else if (myPick)        statusText = `Your pick: ${esc(myPick)}`;
  else if (!hasTeams)     statusText = "Pick the teams above first";
  else if (locked)        statusText = "🔒 No pick made";
  else                    statusText = "Tap a team to pick";

  const teamALabel = m.teamA || `Winner of ${m.fromA ? m.fromA.toUpperCase() : "?"}`;
  const teamBLabel = m.teamB || `Winner of ${m.fromB ? m.fromB.toUpperCase() : "?"}`;

  return `
    <div class="${cardClass}" data-match="${esc(m.id)}">
      <div class="match-teams">
        <button class="${teamAClass}"
          data-match-id="${esc(m.id)}" data-team="${esc(m.teamA)}"
          ${!hasTeams || locked ? "disabled" : ""}>
          ${esc(teamALabel)}
          ${teamACorrect ? " 🏆" : ""}
        </button>
        <span class="vs-label">VS</span>
        <button class="${teamBClass}"
          data-match-id="${esc(m.id)}" data-team="${esc(m.teamB)}"
          ${!hasTeams || locked ? "disabled" : ""}>
          ${esc(teamBLabel)}
          ${teamBCorrect ? " 🏆" : ""}
        </button>
      </div>
      <div class="pick-status ${myPickCorrect ? 'correct-pick' : myPickWrong ? 'wrong-pick' : myPick ? 'pending-pick' : 'no-pick'}">${statusText}</div>
    </div>`;
}

// ── MAKE PICK ────────────────────────────────────────────────
async function makePick(matchId, team, matches) {
  if (!team) return;
  if (bracketData?.locked) { showToast("🔒 Bracket is locked!"); return; }

  const oldPick = myPicks[matchId];
  if (oldPick === team) return; // no change

  // Cascade: clear downstream picks that depended on old pick
  if (oldPick) cascadeClear(matchId, oldPick, matches);

  // Set new pick
  myPicks[matchId] = team;

  // Cascade new pick forward into next round's teams
  cascadeForward(matchId, team, matches);

  // Re-render
  const container = document.getElementById("bracketContainer");
  renderBracket(container, matches, bracketData?.locked, bracketData?.results || {});
  updateSummary();

  // Save to server (debounced)
  clearTimeout(savingQueue[matchId]);
  savingQueue[matchId] = setTimeout(async () => {
    try {
      const res = await api({ action:"submitPick", player:playerName, pin:playerPin, matchId, pick:team });
      if (!res.success) throw new Error(res.error);
    } catch(e) {
      showToast("⚠️ Save failed — check connection");
    }
  }, 400);

  showToast(`Picked ${team} ✓`);
}

// Cascade: when a pick changes, clear all downstream picks that used the old team
function cascadeClear(matchId, oldTeam, matches) {
  const m = matches.find(x => x.id === matchId);
  if (!m || !m.next) return;

  const nextPick = myPicks[m.next];
  if (nextPick === oldTeam) {
    delete myPicks[m.next];
    // Update the match object team slots
    const nextMatch = matches.find(x => x.id === m.next);
    if (nextMatch) {
      if (m.slot === "a") nextMatch.teamA = "";
      else nextMatch.teamB = "";
      cascadeClear(m.next, oldTeam, matches);
    }
  }
}

// Cascade: propagate new pick into next round's team slot
function cascadeForward(matchId, team, matches) {
  const m = matches.find(x => x.id === matchId);
  if (!m || !m.next) return;
  const nextMatch = matches.find(x => x.id === m.next);
  if (!nextMatch) return;
  if (m.slot === "a") nextMatch.teamA = team;
  else nextMatch.teamB = team;
}

// ── PICKS SUMMARY ────────────────────────────────────────────
function updateSummary() {
  const total    = BRACKET.ROUND_ORDER.reduce((acc, r) => {
    return acc + BRACKET.matches.filter(m => m.round === r).length;
  }, 0);
  // Use the global BRACKET data
  const allMatches = BRACKET.matches;
  const picked = Object.keys(myPicks).filter(id => myPicks[id]).length;
  const pct = Math.round((picked / 31) * 100);

  const el = document.getElementById("picksSummary");
  el.classList.remove("hidden");
  el.innerHTML = `<div class="summary-bar">
    <span>${picked}/31 picks made</span>
    <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
    <span>${pct}%</span>
  </div>`;
}

// ── LEADERBOARD ──────────────────────────────────────────────
async function loadLeaderboard() {
  const container = document.getElementById("leaderboardList");
  if (!container.querySelector(".loading-state")) return;

  try {
    const res  = await api({ action:"getLeaderboard" });
    const rows = res.leaderboard || [];

    if (!rows.length) {
      container.innerHTML = `<div class="empty-state"><div class="empty-icon">🏅</div><p>No scores yet!</p></div>`;
      return;
    }

    container.innerHTML = rows.map((r, i) => {
      const rank  = i + 1;
      const isMe  = r.player.toLowerCase() === playerName.toLowerCase();
      const medal = rank===1?"🥇":rank===2?"🥈":rank===3?"🥉":rank;
      return `
        <div class="lb-row ${isMe?"me":""} top-${rank}">
          <div class="lb-rank">${medal}</div>
          <div class="lb-name">${esc(r.player)}${isMe?" (you)":""}</div>
          <div class="lb-correct">
            <div class="lb-pts">${r.points}</div>
            <div class="lb-pts-label">PTS · ${r.correct} correct</div>
          </div>
        </div>`;
    }).join("");
  } catch(e) {
    container.innerHTML = `<div class="empty-state"><p>⚠️ Couldn't load leaderboard.</p></div>`;
  }
}

// ── HELPERS ─────────────────────────────────────────────────
async function api(params) {
  const url = new URL(CONFIG.SCRIPT_URL);
  Object.entries(params).forEach(([k,v]) => url.searchParams.set(k, v));
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
  toastTimer = setTimeout(() => el.classList.remove("show"), 2500);
}
