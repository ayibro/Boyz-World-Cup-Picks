// ── BRACKET STRUCTURE ──────────────────────────────────────
const BRACKET = {
  POINTS: { r32: 3, r16: 5, qf: 7, sf: 9, final: 13 },
  ROUND_LABELS: { r32: "Round of 32", r16: "Round of 16", qf: "Quarter-Final", sf: "Semi-Final", final: "Final" },
  ROUND_ORDER:  ["r32", "r16", "qf", "sf", "final"],

  matches: [
    // ── LEFT SIDE OF BRACKET ──
    // Top-left branch → QF m97
    { id:"m74", round:"r32",   teamA:"Germany",      teamB:"Paraguay",               next:"m89", slot:"a" },
    { id:"m77", round:"r32",   teamA:"France",       teamB:"Sweden",                 next:"m89", slot:"b" },
    { id:"m73", round:"r32",   teamA:"South Africa", teamB:"Canada",                 next:"m90", slot:"a" },
    { id:"m75", round:"r32",   teamA:"Netherlands",  teamB:"Morocco",                next:"m90", slot:"b" },
    // Bottom-left branch → QF m98
    { id:"m83", round:"r32",   teamA:"Portugal",     teamB:"Croatia",                next:"m93", slot:"a" },
    { id:"m84", round:"r32",   teamA:"Spain",        teamB:"Austria",                next:"m93", slot:"b" },
    { id:"m81", round:"r32",   teamA:"USA",          teamB:"Bosnia and Herzegovina", next:"m94", slot:"a" },
    { id:"m82", round:"r32",   teamA:"Belgium",      teamB:"Senegal",                next:"m94", slot:"b" },

    // ── RIGHT SIDE OF BRACKET ──
    // Top-right branch → QF m99
    { id:"m76", round:"r32",   teamA:"Brazil",       teamB:"Japan",                  next:"m91", slot:"a" },
    { id:"m78", round:"r32",   teamA:"Ivory Coast",  teamB:"Norway",                 next:"m91", slot:"b" },
    { id:"m79", round:"r32",   teamA:"Mexico",       teamB:"Ecuador",                next:"m92", slot:"a" },
    { id:"m80", round:"r32",   teamA:"England",      teamB:"DR Congo",               next:"m92", slot:"b" },
    // Bottom-right branch → QF m100
    { id:"m86", round:"r32",   teamA:"Argentina",    teamB:"Cape Verde",             next:"m95", slot:"a" },
    { id:"m88", round:"r32",   teamA:"Australia",    teamB:"Egypt",                  next:"m95", slot:"b" },
    { id:"m85", round:"r32",   teamA:"Switzerland",  teamB:"Algeria",                next:"m96", slot:"a" },
    { id:"m87", round:"r32",   teamA:"Colombia",     teamB:"Ghana",                  next:"m96", slot:"b" },

    // ── ROUND OF 16 ──
    { id:"m89", round:"r16", teamA:"", teamB:"", next:"m97", slot:"a", fromA:"m74", fromB:"m77" },
    { id:"m90", round:"r16", teamA:"", teamB:"", next:"m97", slot:"b", fromA:"m73", fromB:"m75" },
    { id:"m93", round:"r16", teamA:"", teamB:"", next:"m98", slot:"a", fromA:"m83", fromB:"m84" },
    { id:"m94", round:"r16", teamA:"", teamB:"", next:"m98", slot:"b", fromA:"m81", fromB:"m82" },
    { id:"m91", round:"r16", teamA:"", teamB:"", next:"m99", slot:"a", fromA:"m76", fromB:"m78" },
    { id:"m92", round:"r16", teamA:"", teamB:"", next:"m99", slot:"b", fromA:"m79", fromB:"m80" },
    { id:"m95", round:"r16", teamA:"", teamB:"", next:"m100",slot:"a", fromA:"m86", fromB:"m88" },
    { id:"m96", round:"r16", teamA:"", teamB:"", next:"m100",slot:"b", fromA:"m85", fromB:"m87" },

    // ── QUARTER-FINALS ──
    { id:"m97",  round:"qf", teamA:"", teamB:"", next:"m101", slot:"a", fromA:"m89", fromB:"m90" },
    { id:"m98",  round:"qf", teamA:"", teamB:"", next:"m101", slot:"b", fromA:"m93", fromB:"m94" },
    { id:"m99",  round:"qf", teamA:"", teamB:"", next:"m102", slot:"a", fromA:"m91", fromB:"m92" },
    { id:"m100", round:"qf", teamA:"", teamB:"", next:"m102", slot:"b", fromA:"m95", fromB:"m96" },

    // ── SEMI-FINALS ──
    { id:"m101", round:"sf", teamA:"", teamB:"", next:"m103", slot:"a", fromA:"m97",  fromB:"m98"  },
    { id:"m102", round:"sf", teamA:"", teamB:"", next:"m103", slot:"b", fromA:"m99",  fromB:"m100" },

    // ── FINAL ──
    { id:"m103", round:"final", teamA:"", teamB:"", next:null, slot:null, fromA:"m101", fromB:"m102" },
  ],
};
