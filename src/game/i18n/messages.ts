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
    fil: "Tumulong na protektahan ang baybayin ng Mactan!",
    en: "Help protect the shore of Mactan!",
  },
  "mg.mactan.sub": {
    fil: "Umiwas sa bala. Magbigay ng hudyat: HAWAKAN ANG LINYA! kapag may papalapit.",
    en: "Dodge shots. Relay HOLD THE LINE! when someone approaches.",
  },
  "mg.mactan.morale": { fil: "Nayon", en: "Village" },
  "mg.mactan.hp": { fil: "Buhay", en: "Health" },
  "mg.mactan.attack": { fil: "ATAKE", en: "ATTACK" },
  "mg.mactan.hold": { fil: "Hawakan ang linya!", en: "Hold the line!" },
  "mg.mactan.holdAcknowledged": { fil: "Narinig ka nila. Maghahanda sila.", en: "They heard you. They are getting ready." },
  "mg.mactan.holdNoThreat": { fil: "Maghintay—wala pang banta sa linya.", en: "Wait—there is no threat at the line yet." },
  "mg.mactan.holdTooFar": { fil: "Lumapit sa mga mandirigma upang marinig ka.", en: "Move closer so the warriors can hear you." },
  "mg.mactan.holdWait": { fil: "Sandali—nagbibigay pa sila ng tugon.", en: "Wait—they are still responding." },
  "mg.mactan.fallback": { fil: "Magtipon dito!", en: "Regroup here!" },
  "mg.mactan.fallbackTutorial": {
    fil: "Naiipit ang linya! Sabihin sa mga nakatatanda: “Magtipon dito!”",
    en: "The line is under pressure! Tell the elders: “Regroup here!”",
  },
  "mg.mactan.fallbackNoPressure": { fil: "Hindi pa naiipit ang linya.", en: "The line is not under pressure yet." },
  "mg.mactan.fallbackNoStage": { fil: "Dito na tayo maninindigan.", en: "This is the line we must hold." },
  "mg.mactan.fallbackRegrouping": { fil: "Nagtitipon na sila.", en: "They are already regrouping." },
  "mg.mactan.advance": { fil: "Ligtas ang daan!", en: "The way is clear!" },
  "mg.mactan.advanceTutorial": {
    fil: "Nagkahiwalay ang mga kalaban malapit sa mababaw na tubig. Sabihin: \"Ligtas ang daan!\"",
    en: "The enemies are separated near the shallow water. Tell the elders: \"The way is clear!\"",
  },
  "mg.mactan.advanceAcknowledged": { fil: "Narinig ka nila. Dahan-dahan silang uusad.", en: "They heard you. They will move forward carefully." },
  "mg.mactan.advanceNoOpening": { fil: "Maghintay - hindi pa ligtas umusad.", en: "Wait - it is not safe to advance yet." },
  "mg.mactan.advanceUnderPressure": { fil: "May banta sa linya - hawakan muna ito!", en: "The line is under pressure - hold it first!" },
  "mg.mactan.advanceWait": { fil: "Nagbibigay pa sila ng tugon.", en: "They are still responding." },
  // --- Mactan Formation Combat (Phase 1 sandbox) ---
  "mg.formation.title": {
    fil: "Pagsasanay: Hanay sa Baybayin",
    en: "Sandbox: Shoreline Defense",
  },
  "mg.formation.hint": {
    fil: "Gumalaw: WASD / arrow. Atake: SPACE. Sangga: SHIFT. Usog: E. O pindutin ang mga butones.",
    en: "Move: WASD / arrows. Attack: SPACE. Brace: SHIFT. Dash: E. Or use the buttons.",
  },
  "mg.formation.footing": { fil: "Tindig", en: "Footing" },
  "mg.formation.allyFooting": { fil: "Tindig ng kakampi", en: "Ally footing" },
  "mg.formation.repelStability": { fil: "Tatag ng dayuhan", en: "Invader stability" },
  "mg.formation.guard": { fil: "Sanggalang", en: "Guard" },
  "mg.formation.poise": { fil: "Balanse ng dayuhan", en: "Invader poise" },
  "mg.formation.poiseBreak": { fil: "Nawalan ng balanse!", en: "Off balance!" },
  "mg.formation.guardBreak": { fil: "Nabasag ang sanggalang!", en: "Guard broken!" },
  "mg.formation.repelledCount": { fil: "Naitaboy: {n}", en: "Driven back: {n}" },
  "mg.formation.attack": { fil: "ATAKE", en: "ATTACK" },
  "mg.formation.brace": { fil: "SANGGA", en: "BRACE" },
  "mg.formation.dash": { fil: "USOG", en: "DASH" },
  "mg.formation.done": { fil: "TAPOS", en: "DONE" },
  "mg.formation.push": { fil: "Naitulak!", en: "Pushed!" },
  "mg.formation.chip": { fil: "Tulong!", en: "Support!" },
  "mg.formation.blocked": { fil: "Nasangga!", en: "Blocked!" },
  "mg.formation.knocked": { fil: "Natumba! Babangon...", en: "Knocked down! Getting up..." },
  "mg.formation.repelling": { fil: "Umuurong na siya!", en: "He is pulling back!" },
  "mg.formation.repelled": { fil: "Naitaboy pabalik sa dagat!", en: "Driven back to the sea!" },
  "mg.formation.bandDeep": { fil: "Malalim na tubig", en: "Deep water" },
  "mg.formation.bandCoral": { fil: "Bahura", en: "Coral reef" },
  "mg.formation.bandShallows": { fil: "Mababaw — dito lumalaban", en: "Shallows — the fighting line" },
  "mg.formation.bandVillage": { fil: "Nayon", en: "Village" },

  "mg.mactan.jump": { fil: "TALON", en: "JUMP" },
  "mg.mactan.crouch": { fil: "YUKO", en: "DUCK" },
  "mg.mactan.defeated": { fil: "Ikaw ay natumba! Bumangon...", en: "You were knocked down! Getting up..." },
  "mg.mactan.wave": { fil: "Alon {n}/{total}", en: "Wave {n}/{total}" },
  "mg.mactan.waveBanner": { fil: "Alon {n}!", en: "Wave {n}!" },
  "mg.mactan.finalWave": { fil: "Huling Alon!", en: "Final Wave!" },
  "mg.mactan.score": { fil: "Puntos: {n}", en: "Score: {n}" },
  "mg.mactan.defense": { fil: "Linya ng Depensa: {stage}", en: "Defense Line: {stage}" },
  "mg.mactan.stageShoreline": { fil: "Dalampasigan", en: "Shoreline" },
  "mg.mactan.stageBeach": { fil: "Tabing-dagat", en: "Beach" },
  "mg.mactan.stageVillageEdge": { fil: "Gilid ng Nayon", en: "Village Edge" },
  "mg.mactan.regroup": { fil: "Magtipon sa {stage}!", en: "Regroup at the {stage}!" },
  "mg.mactan.combo": { fil: "Sunod-sunod x{n}!", en: "Combo x{n}!" },
  "mg.mactan.shore": { fil: "Baybayin", en: "Shore" },
  "mg.mactan.result": { fil: "Naitaboy ng mga mandirigma ang {n} kawal!", en: "The warriors drove back {n} soldiers!" },
  "mg.mactan.resultRecovery": { fil: "Nabutas ang linya ng depensa.", en: "The defense line was breached." },
  "mg.mactan.resultRecoveryTip": {
    fil: "Kailangan ng mga mandirigma ang iyong babala. Magbigay ng hudyat kapag may papalapit.",
    en: "The warriors needed your warning. Relay Hold the line! when danger approaches.",
  },
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
