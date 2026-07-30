import type { Language } from "@shared/types";

/**
 * UI chrome strings, keyed. Narrative content is NOT here — story text,
 * choices and quiz items live in the arc content files as LocalizedText, next
 * to the history they describe (see src/game/content).
 *
 * Placeholders use {name} and are filled by t(key, vars).
 */
export const MESSAGES = {
  // --- Arc select ---
  "app.subtitle": { fil: "Pumili ng Kabanata sa Kasaysayan", en: "Choose a History Chapter" },
  "lang.label": { fil: "Wika", en: "Language" },

  // --- Story ---
  "story.continue": { fil: "▶  Pindutin para magpatuloy", en: "▶  Tap to continue" },

  // --- Title card ---
  "titlecard.dramatised": {
    fil: "Batay sa tunay na pangyayari. Ang ilang tauhan at usapan ay likha para sa kuwentong ito.",
    en: "Based on real events. Some characters and conversations were created for this story.",
  },

  // --- Character cards ---
  "char.real": { fil: "Tunay na tao sa kasaysayan", en: "Real historical figure" },
  "char.fictional": { fil: "Likhang tauhan", en: "Fictional character" },

  // --- Did you know (fact vs. story) ---
  "dyk.title": { fil: "Alam Mo Ba?", en: "Did You Know?" },
  "dyk.real": { fil: "Totoo:", en: "True:" },
  "dyk.invented": { fil: "Kuwento lang:", en: "Story only:" },
  "dyk.studying": { fil: "Pinag-aaralan pa:", en: "Still being studied:" },

  // --- Quiz ---
  "quiz.pre.title": { fil: "Panimulang Pagsusulit", en: "Pre-Test" },
  "quiz.pre.sub": {
    fil: "Subukan mo muna — ayos lang kung hindi mo pa alam!",
    en: "Try first — it's okay if you don't know yet!",
  },
  "quiz.post.title": { fil: "Pagsusulit sa Natutuhan", en: "What You Learned" },
  "quiz.post.sub": {
    fil: "Ano ang natutuhan mo sa kabanata?",
    en: "What did you learn in this chapter?",
  },
  "quiz.progress": { fil: "Tanong {n}/{total}", en: "Question {n}/{total}" },

  // --- Summary ---
  "summary.title": { fil: "Tapos na ang kabanata!", en: "Chapter complete!" },
  "summary.learned": { fil: "Natutuhan: {pre} → {post}   ({gain})", en: "Learned: {pre} → {post}   ({gain})" },
  "summary.noChange": { fil: "walang pagbabago", en: "no change" },
  "summary.engagement": { fil: "Engagement: {label}  ({pct}%)", en: "Engagement: {label}  ({pct}%)" },
  "summary.deep": { fil: "Deep Learner", en: "Deep Learner" },
  "summary.surface": { fil: "Surface Learner", en: "Surface Learner" },
  "summary.back": { fil: "Bumalik sa menu", en: "Back to menu" },
  "summary.stars": { fil: "Mga Bituin: {n}/{max}", en: "Stars: {n}/{max}" },

  // --- Mini-game placeholder ---
  "mg.placeholder.title": { fil: "Mini-game: {title}", en: "Mini-game: {title}" },
  "mg.placeholder.note": { fil: "(gagawin pa — placeholder)", en: "(coming soon — placeholder)" },
  "mg.placeholder.finish": { fil: "Tapusin ang mini-game", en: "Finish mini-game" },

  // --- Cedula tear ---
  "mg.cedula.instruction": {
    fil: "Hawakan at i-drag pahalang sa cedula\npara ito punitin!",
    en: "Hold and drag sideways across the cedula\nto tear it!",
  },
  "mg.cedula.retry": { fil: "Mas mahaba at pahalang na hila!", en: "Drag longer and sideways!" },
  "mg.cedula.done": { fil: "Napunit mo ang cedula!", en: "You tore the cedula!" },
  "mg.cedula.doneSub": { fil: "Mabuhay ang paghihimagsik!", en: "Long live the revolution!" },

  // --- Code unscramble ---
  "mg.code.instruction": {
    fil: "Ayusin ang lihim na mensahe ng mga Katipunero!",
    en: "Arrange the Katipuneros' secret message!",
  },
  "mg.code.sub": {
    fil: "Pindutin ang mga salita sa tamang pagkakasunod.",
    en: "Tap the words in the correct order.",
  },
  "mg.code.wrong": { fil: "Mali ang code! Subukan mong muli.", en: "Wrong code! Try again." },
  "mg.code.done": { fil: "Na-decode mo ang mensahe!", en: "You decoded the message!" },

  // --- Katipunan recruit ---
  "mg.recruit.instruction": {
    fil: "Pindutin ang mga Pilipino para sumapi sa Katipunan!",
    en: "Tap the Filipinos to recruit them into the Katipunan!",
  },
  "mg.recruit.sub": {
    fil: "Iwasan ang mga guwardiyang Espanyol (pula).",
    en: "Avoid the Spanish guards (red).",
  },
  "mg.recruit.counter": { fil: "Nakuha: {n}/{target}", en: "Recruited: {n}/{target}" },
  "mg.recruit.filipino": { fil: "Pilipino", en: "Filipino" },
  "mg.recruit.guard": { fil: "Guwardiya", en: "Guard" },
  "mg.recruit.result": { fil: "Nakuha mo: {n} Katipunero!", en: "You recruited {n} Katipuneros!" },
  "mg.recruit.resultWin": {
    fil: "Lumakas ang hukbo ng himagsikan!",
    en: "The revolution's ranks grew stronger!",
  },
  "mg.recruit.resultOk": { fil: "Magaling! Patuloy ang laban.", en: "Well done! The fight goes on." },

  // --- Mactan defense ---
  "mg.mactan.instruction": {
    fil: "Ipagtanggol ang baybayin ng Mactan!",
    en: "Defend the shore of Mactan!",
  },
  "mg.mactan.sub": {
    fil: "Tumalon o yumuko para umiwas sa bala. Pindutin ang ATAKE!",
    en: "Jump or crouch to dodge the shots. Press ATTACK!",
  },
  "mg.mactan.morale": { fil: "Nayon", en: "Village" },
  "mg.mactan.hp": { fil: "Buhay", en: "Health" },
  "mg.mactan.attack": { fil: "ATAKE", en: "ATTACK" },
  "mg.mactan.jump": { fil: "TALON", en: "JUMP" },
  "mg.mactan.crouch": { fil: "YUKO", en: "DUCK" },
  "mg.mactan.defeated": { fil: "Ikaw ay natumba! Bumangon...", en: "You were knocked down! Getting up..." },
  "mg.mactan.wave": { fil: "Alon {n}/{total}", en: "Wave {n}/{total}" },
  "mg.mactan.waveBanner": { fil: "Alon {n}!", en: "Wave {n}!" },
  "mg.mactan.finalWave": { fil: "Huling Alon!", en: "Final Wave!" },
  "mg.mactan.score": { fil: "Puntos: {n}", en: "Score: {n}" },
  "mg.mactan.combo": { fil: "Sunod-sunod x{n}!", en: "Combo x{n}!" },
  "mg.mactan.shore": { fil: "Baybayin", en: "Shore" },
  "mg.mactan.result": { fil: "Naitaboy mo ang {n} kawal!", en: "You drove back {n} soldiers!" },
  "mg.mactan.resultWin": {
    fil: "Sa dami at tapang, natalo ang iilang dayuhan!",
    en: "By numbers and courage, the few invaders were beaten!",
  },
  "mg.mactan.resultOk": {
    fil: "Nanindigan pa rin ang mga mandirigma ni Lapu-Lapu.",
    en: "Lapu-Lapu's warriors stood their ground.",
  },
} as const satisfies Record<string, Record<Language, string>>;

export type MessageKey = keyof typeof MESSAGES;
