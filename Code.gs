// ============================================================
//  WORLD CUP PICK'EM — Google Apps Script Backend
//  Deploy as: Web App → Execute as Me → Anyone (anonymous)
// ============================================================

const ADMIN_PIN      = "405";   // ← Your admin PIN
const POINTS_CORRECT = 3;
const SHEET_GAMES    = "Games";
const SHEET_PICKS    = "Picks";
const SHEET_PLAYERS  = "Players"; // name | pin | createdAt

// ── ENTRY POINT ──────────────────────────────────────────────
function doGet(e) {
  const params = e.parameter;
  const action = params.action || "";
  try {
    let result;
    switch (action) {
      case "registerOrLogin":  result = registerOrLogin(params);  break;
      case "getGames":         result = getGames(params);         break;
      case "submitPick":       result = submitPick(params);       break;
      case "getLeaderboard":   result = getLeaderboard(params);   break;
      case "addGame":          result = addGame(params);          break;
      case "setStatus":        result = setStatus(params);        break;
      case "setWinner":        result = setWinner(params);        break;
      case "deleteGame":       result = deleteGame(params);       break;
      case "getAllPicks":       result = getAllPicks(params);      break;
      default:                 result = { error: "Unknown action" };
    }
    return jsonResponse(result);
  } catch (err) {
    return jsonResponse({ error: err.message });
  }
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── SHEET HELPERS ────────────────────────────────────────────
function getSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    if (name === SHEET_GAMES)   sheet.appendRow(["id","teamA","teamB","date","round","status","winner"]);
    if (name === SHEET_PICKS)   sheet.appendRow(["gameId","player","team","timestamp"]);
    if (name === SHEET_PLAYERS) sheet.appendRow(["name","pin","createdAt"]);
  }
  return sheet;
}

function gamesData() {
  const rows = getSheet(SHEET_GAMES).getDataRange().getValues();
  if (rows.length < 2) return [];
  return rows.slice(1).map(r => ({
    id: String(r[0]), teamA: String(r[1]), teamB: String(r[2]),
    date: r[3] ? new Date(r[3]).toISOString() : "",
    round: String(r[4]), status: String(r[5] || "open"), winner: String(r[6] || ""),
  })).filter(g => g.id);
}

function picksData() {
  const rows = getSheet(SHEET_PICKS).getDataRange().getValues();
  if (rows.length < 2) return [];
  return rows.slice(1).map(r => ({
    gameId: String(r[0]), player: String(r[1]), team: String(r[2]), timestamp: r[3],
  }));
}

function playersData() {
  const rows = getSheet(SHEET_PLAYERS).getDataRange().getValues();
  if (rows.length < 2) return [];
  return rows.slice(1).map(r => ({ name: String(r[0]), pin: String(r[1]) }));
}

function findGameRow(gameId) {
  const sheet = getSheet(SHEET_GAMES);
  const data  = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(gameId)) return { sheet, row: i + 1, data: data[i] };
  }
  return null;
}

function checkPin(params) {
  if (params.pin !== ADMIN_PIN) throw new Error("Invalid PIN");
}

// ── AUTH: REGISTER OR LOGIN ───────────────────────────────────
// Returns { success, isNew } or { error }
function registerOrLogin(params) {
  const name = (params.player || "").trim();
  const pin  = (params.pin   || "").trim();
  if (!name || !pin) throw new Error("Name and PIN required");
  if (!/^\d{4}$/.test(pin)) throw new Error("PIN must be 4 digits");

  const players = playersData();
  const existing = players.find(p => p.name.toLowerCase() === name.toLowerCase());

  if (existing) {
    // Login — check PIN
    if (existing.pin !== pin) return { success: false, error: "Wrong PIN for that name" };
    return { success: true, isNew: false };
  } else {
    // Register new player
    getSheet(SHEET_PLAYERS).appendRow([name, pin, new Date()]);
    return { success: true, isNew: true };
  }
}

// ── AUTH HELPER ──────────────────────────────────────────────
function verifyPlayer(params) {
  const name = (params.player || "").trim();
  const pin  = (params.pin   || "").trim();
  if (!name || !pin) throw new Error("Auth required");
  const players = playersData();
  const p = players.find(p => p.name.toLowerCase() === name.toLowerCase());
  if (!p || p.pin !== pin) throw new Error("Invalid name or PIN");
  return name;
}

// ── GET GAMES (with player's picks — private) ─────────────────
function getGames(params) {
  const games = gamesData();
  const picks = picksData();
  let myPicks = {};

  const player = (params.player || "").trim();
  const pin    = (params.pin    || "").trim();

  if (player && player !== "_admin_" && pin) {
    // Verify auth silently — if wrong, just return no picks
    const players = playersData();
    const p = players.find(p => p.name.toLowerCase() === player.toLowerCase());
    if (p && p.pin === pin) {
      picks.filter(p => p.player.toLowerCase() === player.toLowerCase())
           .forEach(p => myPicks[p.gameId] = p.team);
    }
  }

  // Strip winner from locked games so players can't infer it
  const safeGames = games.map(g => ({
    ...g,
    winner: g.status === "done" ? g.winner : "",
  }));

  return { games: safeGames, picks: myPicks };
}

// ── SUBMIT PICK ──────────────────────────────────────────────
function submitPick(params) {
  const player = verifyPlayer(params);
  const gameId = String(params.gameId || "");
  const team   = (params.team || "").trim();

  if (!gameId || !team) throw new Error("Missing params");

  const games = gamesData();
  const game  = games.find(g => g.id === gameId);
  if (!game) throw new Error("Game not found");
  if (game.status === "locked" || game.status === "done") throw new Error("Game is locked");
  if (team !== game.teamA && team !== game.teamB) throw new Error("Invalid team");

  const sheet    = getSheet(SHEET_PICKS);
  const allPicks = picksData();
  const existing = allPicks.findIndex(
    p => p.gameId === gameId && p.player.toLowerCase() === player.toLowerCase()
  );

  if (existing >= 0) {
    sheet.getRange(existing + 2, 3).setValue(team);
    sheet.getRange(existing + 2, 4).setValue(new Date());
  } else {
    sheet.appendRow([gameId, player, team, new Date()]);
  }

  return { success: true };
}

// ── LEADERBOARD (public — no picks exposed) ───────────────────
function getLeaderboard() {
  const games = gamesData();
  const picks = picksData();
  const stats = {};

  picks.forEach(p => {
    const key = p.player.trim();
    if (!key) return;
    if (!stats[key]) stats[key] = { player: key, points: 0, correct: 0, total: 0 };
    const game = games.find(g => g.id === p.gameId);
    if (!game) return;
    stats[key].total++;
    if (game.status === "done" && game.winner && p.team === game.winner) {
      stats[key].points  += POINTS_CORRECT;
      stats[key].correct += 1;
    }
  });

  const leaderboard = Object.values(stats)
    .sort((a, b) => b.points - a.points || b.correct - a.correct || a.player.localeCompare(b.player));

  return { leaderboard };
}

// ── ADMIN: ADD GAME ──────────────────────────────────────────
function addGame(params) {
  checkPin(params);
  const teamA = (params.teamA || "").trim();
  const teamB = (params.teamB || "").trim();
  const date  = params.date  || "";
  const round = params.round || "Round of 32";
  if (!teamA || !teamB) throw new Error("Team names required");
  const id = "game_" + Date.now();
  getSheet(SHEET_GAMES).appendRow([id, teamA, teamB, date ? new Date(date) : "", round, "open", ""]);
  return { success: true, id };
}

// ── ADMIN: SET STATUS ────────────────────────────────────────
function setStatus(params) {
  checkPin(params);
  const { gameId, status } = params;
  if (!["open","locked","done"].includes(status)) throw new Error("Invalid status");
  const found = findGameRow(gameId);
  if (!found) throw new Error("Game not found");
  found.sheet.getRange(found.row, 6).setValue(status);
  return { success: true };
}

// ── ADMIN: SET WINNER ────────────────────────────────────────
function setWinner(params) {
  checkPin(params);
  const { gameId, winner } = params;
  const found = findGameRow(gameId);
  if (!found) throw new Error("Game not found");
  const teamA = String(found.data[1]);
  const teamB = String(found.data[2]);
  if (winner !== teamA && winner !== teamB) throw new Error("Winner must be one of the two teams");
  found.sheet.getRange(found.row, 6).setValue("done");
  found.sheet.getRange(found.row, 7).setValue(winner);
  return { success: true };
}

// ── ADMIN: DELETE GAME ───────────────────────────────────────
function deleteGame(params) {
  checkPin(params);
  const { gameId } = params;
  const found = findGameRow(gameId);
  if (!found) throw new Error("Game not found");
  found.sheet.deleteRow(found.row);
  const picksSheet = getSheet(SHEET_PICKS);
  const pData = picksSheet.getDataRange().getValues();
  for (let i = pData.length - 1; i >= 1; i--) {
    if (String(pData[i][0]) === String(gameId)) picksSheet.deleteRow(i + 1);
  }
  return { success: true };
}

// ── ADMIN: GET ALL PICKS ─────────────────────────────────────
function getAllPicks(params) {
  checkPin(params);
  const games = gamesData();
  const picks = picksData();
  const picksByGame = {};
  picks.forEach(p => {
    if (!picksByGame[p.gameId]) picksByGame[p.gameId] = {};
    picksByGame[p.gameId][p.player] = p.team;
  });
  return { games, picks: picksByGame };
}
