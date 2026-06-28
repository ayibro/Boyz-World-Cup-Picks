// ── BRACKET STRUCTURE ──────────────────────────────────────
// 16 R32 matches, seeded into a fixed bracket
// Each match has a fixed ID and slot in the bracket tree

const BRACKET = {
  // Points per round
  POINTS: { r32: 3, r16: 5, qf: 7, sf: 9, final: 13 },

  // Fixed R32 matchups (confirmed bracket)
  // nextMatch: which match the winner feeds into
  // slot: 'a' or 'b' (which side of next match)
  matches: [
    // ── LEFT HALF ──
    // QF1 branch
    { id:"m1",  round:"r32",   teamA:"South Africa", teamB:"Canada",                date:"2026-06-28T19:00:00Z", next:"m17", slot:"a" },
    { id:"m2",  round:"r32",   teamA:"Brazil",       teamB:"Japan",                 date:"2026-06-29T17:00:00Z", next:"m17", slot:"b" },
    { id:"m3",  round:"r32",   teamA:"Germany",      teamB:"Paraguay",              date:"2026-06-29T20:30:00Z", next:"m18", slot:"a" },
    { id:"m4",  round:"r32",   teamA:"Netherlands",  teamB:"Morocco",               date:"2026-06-30T01:00:00Z", next:"m18", slot:"b" },
    // QF2 branch
    { id:"m5",  round:"r32",   teamA:"Ivory Coast",  teamB:"Norway",                date:"2026-06-30T17:00:00Z", next:"m19", slot:"a" },
    { id:"m6",  round:"r32",   teamA:"France",       teamB:"Sweden",                date:"2026-06-30T21:00:00Z", next:"m19", slot:"b" },
    { id:"m7",  round:"r32",   teamA:"Mexico",       teamB:"Ecuador",               date:"2026-07-01T06:00:00Z", next:"m20", slot:"a" },
    { id:"m8",  round:"r32",   teamA:"England",      teamB:"DR Congo",              date:"2026-07-01T16:00:00Z", next:"m20", slot:"b" },
    // ── RIGHT HALF ──
    // QF3 branch
    { id:"m9",  round:"r32",   teamA:"Belgium",      teamB:"Senegal",               date:"2026-07-01T20:00:00Z", next:"m21", slot:"a" },
    { id:"m10", round:"r32",   teamA:"USA",          teamB:"Bosnia and Herzegovina",date:"2026-07-02T00:00:00Z", next:"m21", slot:"b" },
    { id:"m11", round:"r32",   teamA:"Spain",        teamB:"Austria",               date:"2026-07-02T19:00:00Z", next:"m22", slot:"a" },
    { id:"m12", round:"r32",   teamA:"Portugal",     teamB:"Croatia",               date:"2026-07-02T23:00:00Z", next:"m22", slot:"b" },
    // QF4 branch
    { id:"m13", round:"r32",   teamA:"Switzerland",  teamB:"Algeria",               date:"2026-07-03T03:00:00Z", next:"m23", slot:"a" },
    { id:"m14", round:"r32",   teamA:"Australia",    teamB:"Egypt",                 date:"2026-07-03T18:00:00Z", next:"m23", slot:"b" },
    { id:"m15", round:"r32",   teamA:"Argentina",    teamB:"Cape Verde",            date:"2026-07-03T22:00:00Z", next:"m24", slot:"a" },
    { id:"m16", round:"r32",   teamA:"Colombia",     teamB:"Ghana",                 date:"2026-07-04T01:30:00Z", next:"m24", slot:"b" },
    // ── ROUND OF 16 ──
    { id:"m17", round:"r16",   teamA:"",             teamB:"",                      date:"2026-07-05T00:00:00Z", next:"m25", slot:"a", fromA:"m1",  fromB:"m2"  },
    { id:"m18", round:"r16",   teamA:"",             teamB:"",                      date:"2026-07-05T00:00:00Z", next:"m25", slot:"b", fromA:"m3",  fromB:"m4"  },
    { id:"m19", round:"r16",   teamA:"",             teamB:"",                      date:"2026-07-06T00:00:00Z", next:"m26", slot:"a", fromA:"m5",  fromB:"m6"  },
    { id:"m20", round:"r16",   teamA:"",             teamB:"",                      date:"2026-07-06T00:00:00Z", next:"m26", slot:"b", fromA:"m7",  fromB:"m8"  },
    { id:"m21", round:"r16",   teamA:"",             teamB:"",                      date:"2026-07-07T00:00:00Z", next:"m27", slot:"a", fromA:"m9",  fromB:"m10" },
    { id:"m22", round:"r16",   teamA:"",             teamB:"",                      date:"2026-07-07T00:00:00Z", next:"m27", slot:"b", fromA:"m11", fromB:"m12" },
    { id:"m23", round:"r16",   teamA:"",             teamB:"",                      date:"2026-07-08T00:00:00Z", next:"m28", slot:"a", fromA:"m13", fromB:"m14" },
    { id:"m24", round:"r16",   teamA:"",             teamB:"",                      date:"2026-07-08T00:00:00Z", next:"m28", slot:"b", fromA:"m15", fromB:"m16" },
    // ── QUARTER-FINALS ──
    { id:"m25", round:"qf",    teamA:"",             teamB:"",                      date:"2026-07-10T00:00:00Z", next:"m29", slot:"a", fromA:"m17", fromB:"m18" },
    { id:"m26", round:"qf",    teamA:"",             teamB:"",                      date:"2026-07-10T00:00:00Z", next:"m29", slot:"b", fromA:"m19", fromB:"m20" },
    { id:"m27", round:"qf",    teamA:"",             teamB:"",                      date:"2026-07-11T00:00:00Z", next:"m30", slot:"a", fromA:"m21", fromB:"m22" },
    { id:"m28", round:"qf",    teamA:"",             teamB:"",                      date:"2026-07-11T00:00:00Z", next:"m30", slot:"b", fromA:"m23", fromB:"m24" },
    // ── SEMI-FINALS ──
    { id:"m29", round:"sf",    teamA:"",             teamB:"",                      date:"2026-07-14T00:00:00Z", next:"m31", slot:"a", fromA:"m25", fromB:"m26" },
    { id:"m30", round:"sf",    teamA:"",             teamB:"",                      date:"2026-07-15T00:00:00Z", next:"m31", slot:"b", fromA:"m27", fromB:"m28" },
    // ── FINAL ──
    { id:"m31", round:"final", teamA:"",             teamB:"",                      date:"2026-07-19T19:00:00Z", next:null,  slot:null, fromA:"m29", fromB:"m30" },
  ],

  ROUND_LABELS: { r32: "Round of 32", r16: "Round of 16", qf: "Quarter-Final", sf: "Semi-Final", final: "Final" },
  ROUND_ORDER:  ["r32", "r16", "qf", "sf", "final"],
};
