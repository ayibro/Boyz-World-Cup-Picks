// ============================================================
//  WORLD CUP BRACKET PICK'EM — Google Apps Script Backend
//  Deploy as: Web App → Execute as Me → Anyone (anonymous)
// ============================================================

const ADMIN_PIN     = "405";
const SHEET_PLAYERS = "Players";  // name | pin | createdAt
const SHEET_PICKS   = "Picks";    // player | matchId | pick | timestamp
const SHEET_RESULTS = "Results";  // matchId | winner

const POINTS = { r32: 3, r16: 5, qf: 7, sf: 9, final: 13 };

// ── BRACKET DEFINITION (mirrors bracket-data.js) ─────────────
const MATCHES = [
  { id:"m1",  round:"r32",   teamA:"South Africa", teamB:"Canada",                 next:"m17", slot:"a" },
  { id:"m2",  round:"r32",   teamA:"Brazil",       teamB:"Japan",                  next:"m17", slot:"b" },
  { id:"m3",  round:"r32",   teamA:"Germany",      teamB:"Paraguay",               next:"m18", slot:"a" },
  { id:"m4",  round:"r32",   teamA:"Netherlands",  teamB:"Morocco",                next:"m18", slot:"b" },
  { id:"m5",  round:"r32",   teamA:"Ivory Coast",  teamB:"Norway",                 next:"m19", slot:"a" },
  { id:"m6",  round:"r32",   teamA:"France",       teamB:"Sweden",                 next:"m19", slot:"b" },
  { id:"m7",  round:"r32",   teamA:"Mexico",       teamB:"Ecuador",                next:"m20", slot:"a" },
  { id:"m8",  round:"r32",   teamA:"England",      teamB:"DR Congo",               next:"m20", slot:"b" },
  { id:"m9",  round:"r32",   teamA:"Belgium",      teamB:"Senegal",                next:"m21", slot:"a" },
  { id:"m10", round:"r32",   teamA:"USA",          teamB:"Bosnia and Herzegovina", next:"m21", slot:"b" },
  { id:"m11", round:"r32",   teamA:"Spain",        teamB:"Austria",                next:"m22", slot:"a" },
  { id:"m12", round:"r32",   teamA:"Portugal",     teamB:"Croatia",                next:"m22", slot:"b" },
  { id:"m13", round:"r32",   teamA:"Switzerland",  teamB:"Algeria",                next:"m23", slot:"a" },
  { id:"m14", round:"r32",   teamA:"Australia",    teamB:"Egypt",                  next:"m23", slot:"b" },
  { id:"m15", round:"r32",   teamA:"Argentina",    teamB:"Cape Verde",             next:"m24", slot:"a" },
  { id:"m16", round:"r32",   teamA:"Colombia",     teamB:"Ghana",                  next:"m24", slot:"b" },
  { id:"m17", round:"r16",   teamA:"", teamB:"",   next:"m25", slot:"a", fromA:"m1",  fromB:"m2"  },
  { id:"m18", round:"r16",   teamA:"", teamB:"",   next:"m25", slot:"b", fromA:"m3",  fromB:"m4"  },
  { id:"m19", round:"r16",   teamA:"", teamB:"",   next:"m26", slot:"a", fromA:"m5",  fromB:"m6"  },
  { id:"m20", round:"r16",   teamA:"", teamB:"",   next:"m26", slot:"b", fromA:"m7",  fromB:"m8"  },
  { id:"m21", round:"r16",   teamA:"", teamB:"",   next:"m27", slot:"a", fromA:"m9",  fromB:"m10" },
  { id:"m22", round:"r16",   teamA:"", teamB:"",   next:"m27", slot:"b", fromA:"m11", fromB:"m12" },
  { id:"m23", round:"r16",   teamA:"", teamB:"",   next:"m28", slot:"a", fromA:"m13", fromB:"m14" },
  { id:"m24", round:"r16",   teamA:"", teamB:"",   next:"m28", slot:"b", fromA:"m15", fromB:"m16" },
  { id:"m25", round:"qf",    teamA:"", teamB:"",   next:"m29", slot:"a", fromA:"m17", fromB:"m18" },
  { id:"m26", round:"qf",    teamA:"", teamB:"",   next:"m29", slot:"b", fromA:"m19", fromB:"m20" },
  { id:"m27", round:"qf",    teamA:"", teamB:"",   next:"m30", slot:"a", fromA:"m21", fromB:"m22" },
  { id:"m28", round:"qf",    teamA:"", teamB:"",   next:"m30", slot:"b", fromA:"m23", fromB:"m24" },
  { id:"m29", round:"sf",    teamA:"", teamB:"",   next:"m31", slot:"a", fromA:"m25", fromB:"m26" },
  { id:"m30", round:"sf",    teamA:"", teamB:"",   next:"m31", slot:"b", fromA:"m27", fromB:"m28" },
  { id:"m31", round:"final", teamA:"", teamB:"",   next:null,  slot:null, fromA:"m29", fromB:"m30" },
];

// ── ENTRY POINT ──────────────────────────────────────────────
function doGet(e) {
  const p = e.parameter;
  try {
    let result;
    switch (p.action) {
      case "registerOrLogin": result = registerOrLogin(p); break;
      case "getBracket":      result = getBracket(p);      break;
      case "submitPick":      result = submitPick(p);      break;
      case "getLeaderboard":  result = getLeaderboard(p);  break;
      case "setResult":       result = setResult(p);       break;
      case "getAdminView":    result = getAdminView(p);    break;
      case "lockBracket":     result = lockBracket(p);     break;
      case "unlockBracket":   result = unlockBracket(p);   break;
      default: result = { error: "Unknown action" };
    }
    return jsonOut(result);
  } catch(err) {
    return jsonOut({ error: err.message });
  }
}

function jsonOut(d) {
  return ContentService.createTextOutput(JSON.stringify(d))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── SHEET HELPERS ────────────────────────────────────────────
function sheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let s = ss.getSheetByName(name);
  if (!s) {
    s = ss.insertSheet(name);
    if (name === SHEET_PLAYERS) s.appendRow(["name","pin","createdAt","locked"]);
    if (name === SHEET_PICKS)   s.appendRow(["player","matchId","pick","timestamp"]);
    if (name === SHEET_RESULTS) s.appendRow(["matchId","winner"]);
  }
  return s;
}

function getPlayers() {
  const rows = sheet(SHEET_PLAYERS).getDataRange().getValues();
  if (rows.length < 2) return [];
  return rows.slice(1).map((r,i) => ({ row: i+2, name: String(r[0]), pin: String(r[1]), locked: String(r[3]) === "YES" }));
}

function getPicks() {
  const rows = sheet(SHEET_PICKS).getDataRange().getValues();
  if (rows.length < 2) return [];
  return rows.slice(1).map(r => ({ player: String(r[0]), matchId: String(r[1]), pick: String(r[2]) }));
}

function getResults() {
  const rows = sheet(SHEET_RESULTS).getDataRange().getValues();
  if (rows.length < 2) return {};
  const res = {};
  rows.slice(1).forEach(r => { if (r[0]) res[String(r[0])] = String(r[1]); });
  return res;
}

function checkAdmin(p) {
  if (p.pin !== ADMIN_PIN) throw new Error("Invalid admin PIN");
}

function verifyPlayer(p) {
  const name = (p.player||"").trim();
  const pin  = (p.pin||"").trim();
  if (!name || !pin) throw new Error("Auth required");
  const pl = getPlayers().find(x => x.name.toLowerCase() === name.toLowerCase());
  if (!pl || pl.pin !== pin) throw new Error("Invalid name or PIN");
  return pl;
}

// ── REGISTER / LOGIN ─────────────────────────────────────────
function registerOrLogin(p) {
  const name = (p.player||"").trim();
  const pin  = (p.pin||"").trim();
  if (!name || !pin) throw new Error("Name and PIN required");
  if (!/^\d{4}$/.test(pin)) throw new Error("PIN must be 4 digits");

  const players = getPlayers();
  const existing = players.find(x => x.name.toLowerCase() === name.toLowerCase());

  if (existing) {
    if (existing.pin !== pin) return { success: false, error: "Wrong PIN for that name" };
    return { success: true, isNew: false, locked: existing.locked };
  }

  sheet(SHEET_PLAYERS).appendRow([name, pin, new Date(), ""]);
  return { success: true, isNew: true, locked: false };
}

// ── LOCK BRACKET (admin locks all picks) ─────────────────────
function lockBracket(p) {
  checkAdmin(p);
  const s = sheet(SHEET_PLAYERS);
  const rows = s.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    s.getRange(i+1, 4).setValue("YES");
  }
  // Store global lock flag in Results sheet as special row
  const res = sheet(SHEET_RESULTS);
  const data = res.getDataRange().getValues();
  const lockRow = data.findIndex(r => r[0] === "__LOCKED__");
  if (lockRow >= 0) res.getRange(lockRow+1, 2).setValue("YES");
  else res.appendRow(["__LOCKED__", "YES"]);
  return { success: true };
}

function isGloballyLocked() {
  const rows = sheet(SHEET_RESULTS).getDataRange().getValues();
  return rows.some(r => r[0] === "__LOCKED__" && r[1] === "YES");
}

function unlockBracket(p) {
  checkAdmin(p);
  const res = sheet(SHEET_RESULTS);
  const data = res.getDataRange().getValues();
  const lockRow = data.findIndex(r => r[0] === "__LOCKED__");
  if (lockRow >= 0) res.getRange(lockRow+1, 2).setValue("NO");
  return { success: true };
}

// ── GET BRACKET (for a player) ───────────────────────────────
function getBracket(p) {
  const name   = (p.player||"").trim();
  const pin    = (p.pin||"").trim();
  const results = getResults();
  const locked  = isGloballyLocked();

  // Build team map from results cascading through bracket
  // teamMap[matchId] = { teamA, teamB } derived from picks/results
  const teamMap = buildTeamMap(results, null);

  let myPicks = {};
  if (name && pin) {
    const pl = getPlayers().find(x => x.name.toLowerCase() === name.toLowerCase());
    if (pl && pl.pin === pin) {
      const picks = getPicks().filter(x => x.player.toLowerCase() === name.toLowerCase());
      picks.forEach(x => { myPicks[x.matchId] = x.pick; });
    }
  }

  // For display: resolve team names using player's own picks for future rounds
  const displayMap = buildTeamMap(results, myPicks);

  const matches = MATCHES.map(m => ({
    ...m,
    teamA:  displayMap[m.id]?.teamA || "",
    teamB:  displayMap[m.id]?.teamB || "",
    winner: results[m.id] || "",
    myPick: myPicks[m.id] || "",
  }));

  return { matches, locked, results };
}

// Build team names for each match by cascading picks/results
function buildTeamMap(results, picks) {
  const map = {};

  // Seed R32 teams
  MATCHES.forEach(m => {
    if (m.round === "r32") map[m.id] = { teamA: m.teamA, teamB: m.teamB };
    else map[m.id] = { teamA: "", teamB: "" };
  });

  // Cascade winners forward
  MATCHES.forEach(m => {
    const winner = results[m.id] || (picks && picks[m.id]) || "";
    if (winner && m.next) {
      if (!map[m.next]) map[m.next] = { teamA: "", teamB: "" };
      if (m.slot === "a") map[m.next].teamA = winner;
      else                map[m.next].teamB = winner;
    }
  });

  return map;
}

// ── SUBMIT PICK ──────────────────────────────────────────────
function submitPick(p) {
  const pl     = verifyPlayer(p);
  const matchId = (p.matchId||"").trim();
  const pick    = (p.pick||"").trim();

  if (!matchId || !pick) throw new Error("Missing params");
  if (isGloballyLocked() || pl.locked) throw new Error("Bracket is locked");

  const match = MATCHES.find(m => m.id === matchId);
  if (!match) throw new Error("Match not found");

  // Validate pick is a valid team for this match
  // (for non-R32, team names come from prior picks so just store it)
  const s = sheet(SHEET_PICKS);
  const allPicks = getPicks();
  const existing = allPicks.findIndex(
    x => x.player.toLowerCase() === pl.name.toLowerCase() && x.matchId === matchId
  );

  if (existing >= 0) {
    s.getRange(existing+2, 3).setValue(pick);
    s.getRange(existing+2, 4).setValue(new Date());
  } else {
    s.appendRow([pl.name, matchId, pick, new Date()]);
  }

  // When a R32+ pick changes, cascade: clear downstream picks that depended on old pick
  clearDownstreamPicks(pl.name, matchId, pick, allPicks, s);

  return { success: true };
}

// Clear picks that are no longer valid because an upstream pick changed
function clearDownstreamPicks(playerName, changedMatchId, newPick, allPicks, s) {
  // Walk downstream and remove picks where the team name no longer matches
  const toCheck = [changedMatchId];
  const visited = new Set();

  while (toCheck.length) {
    const mid = toCheck.pop();
    if (visited.has(mid)) continue;
    visited.add(mid);

    const m = MATCHES.find(x => x.id === mid);
    if (!m || !m.next) continue;

    const nextMatch = MATCHES.find(x => x.id === m.next);
    if (!nextMatch) continue;

    // Find player's pick for next match
    const nextPickIdx = allPicks.findIndex(
      x => x.player.toLowerCase() === playerName.toLowerCase() && x.matchId === m.next
    );

    if (nextPickIdx >= 0) {
      // Rebuild what teams should be in next match based on current picks
      // If the pick for next match is no longer a valid team, clear it
      // (We'll let the frontend re-pick naturally)
      s.getRange(nextPickIdx+2, 3).setValue("");
    }

    toCheck.push(m.next);
  }
}

// ── SET RESULT (admin) ───────────────────────────────────────
function setResult(p) {
  checkAdmin(p);
  const { matchId, winner } = p;
  if (!matchId || !winner) throw new Error("Missing params");

  const s = sheet(SHEET_RESULTS);
  const data = s.getDataRange().getValues();
  const existing = data.findIndex(r => String(r[0]) === matchId);

  if (existing >= 0) s.getRange(existing+1, 2).setValue(winner);
  else s.appendRow([matchId, winner]);

  return { success: true };
}

// ── LEADERBOARD ──────────────────────────────────────────────
function getLeaderboard() {
  const results = getResults();
  const picks   = getPicks();
  const players = getPlayers();
  const stats   = {};

  players.forEach(pl => {
    stats[pl.name] = { player: pl.name, points: 0, correct: 0, total: 0, breakdown: {} };
  });

  picks.forEach(pk => {
    if (!pk.pick) return;
    const name = pk.player;
    if (!stats[name]) stats[name] = { player: name, points: 0, correct: 0, total: 0, breakdown: {} };

    const m = MATCHES.find(x => x.id === pk.matchId);
    if (!m) return;

    const result = results[pk.matchId];
    if (!result) return; // not scored yet

    stats[name].total++;
    if (pk.pick === result) {
      const pts = POINTS[m.round] || 3;
      stats[name].points  += pts;
      stats[name].correct += 1;
      stats[name].breakdown[m.round] = (stats[name].breakdown[m.round] || 0) + pts;
    }
  });

  const leaderboard = Object.values(stats)
    .filter(s => s.total > 0 || true)
    .sort((a,b) => b.points - a.points || b.correct - a.correct);

  return { leaderboard };
}

// ── ADMIN VIEW ───────────────────────────────────────────────
function getAdminView(p) {
  checkAdmin(p);
  const picks   = getPicks();
  const results = getResults();
  const players = getPlayers();

  // Group picks by matchId
  const byMatch = {};
  picks.forEach(pk => {
    if (!byMatch[pk.matchId]) byMatch[pk.matchId] = {};
    byMatch[pk.matchId][pk.player] = pk.pick;
  });

  return { matches: MATCHES, picks: byMatch, results, players: players.map(p => p.name), locked: isGloballyLocked() };
}
