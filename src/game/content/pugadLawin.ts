import type { ArcContent } from "./types";

/**
 * Pugad Lawin arc (Andres Bonifacio, 1896).
 * The pupil is a fictional ally — a young Katipunero — not Bonifacio himself.
 *
 * All learner-facing text is authored in BOTH languages (fil = Filipino,
 * en = English) per DepEd Order No. 20, s. 2025. Keep the two in sync when
 * editing: the English is a translation for comprehension, not a new story.
 */
export const pugadLawinArc: ArcContent = {
  arc: "pugad_lawin",
  title: { fil: "Sigaw sa Pugad Lawin", en: "The Cry of Pugad Lawin" },
  assessment: [
    {
      id: "pl_q1",
      question: {
        fil: "Sino ang pinuno ng Katipunan sa Sigaw sa Pugad Lawin?",
        en: "Who led the Katipunan at the Cry of Pugad Lawin?",
      },
      choices: [
        { id: "a", label: { fil: "Andres Bonifacio", en: "Andres Bonifacio" } },
        { id: "b", label: { fil: "Jose Rizal", en: "Jose Rizal" } },
        { id: "c", label: { fil: "Emilio Aguinaldo", en: "Emilio Aguinaldo" } },
        { id: "d", label: { fil: "Lapu-Lapu", en: "Lapu-Lapu" } },
      ],
      correctChoiceId: "a",
    },
    {
      id: "pl_q2",
      question: {
        fil: "Ano ang ginawa ng mga Katipunero bilang tanda ng paghihimagsik?",
        en: "What did the Katipuneros do as a sign of revolt?",
      },
      choices: [
        { id: "a", label: { fil: "Sinunog ang bandila", en: "Burned the flag" } },
        { id: "b", label: { fil: "Pinunit ang kanilang cedula", en: "Tore up their cedulas" } },
        { id: "c", label: { fil: "Nagtanim ng puno", en: "Planted a tree" } },
        { id: "d", label: { fil: "Sumulat ng liham sa hari", en: "Wrote a letter to the king" } },
      ],
      correctChoiceId: "b",
    },
    {
      id: "pl_q3",
      question: {
        fil: "Anong taon naganap ang Sigaw sa Pugad Lawin?",
        en: "In what year did the Cry of Pugad Lawin happen?",
      },
      choices: [
        { id: "a", label: { fil: "1521", en: "1521" } },
        { id: "b", label: { fil: "1872", en: "1872" } },
        { id: "c", label: { fil: "1896", en: "1896" } },
        { id: "d", label: { fil: "1946", en: "1946" } },
      ],
      correctChoiceId: "c",
    },
  ],
  nodes: [
    {
      id: "pl_intro_1",
      type: "story",
      text: {
        fil:
          "Agosto 1896. Kasama mo ang libo-libong Katipunero sa Pugad Lawin. " +
          "Si Andres Bonifacio ay tumindig sa harap ng mga tao. Ramdam mo ang " +
          "kaba at pag-asa sa hangin.",
        en:
          "August 1896. You stand with thousands of Katipuneros at Pugad Lawin. " +
          "Andres Bonifacio rises before the crowd. You can feel the fear and " +
          "the hope in the air.",
      },
    },
    {
      id: "pl_intro_2",
      type: "story",
      text: {
        fil:
          "Hawak ni Bonifacio ang kaniyang cedula — ang selyo ng pananakop ng " +
          "mga Espanyol. Tinignan ka niya. “Kapatid, handa ka na ba?”",
        en:
          "Bonifacio holds up his cedula — the mark of Spanish rule. " +
          "He looks straight at you. “Brother, are you ready?”",
      },
    },
    {
      id: "pl_decision_cedula",
      type: "decision",
      prompt: { fil: "Ano ang gagawin mo sa iyong cedula?", en: "What will you do with your cedula?" },
      timeLimitMs: 8000,
      defaultChoiceId: "tear",
      choices: [
        { id: "tear", label: { fil: "Punitin ang cedula!", en: "Tear the cedula!" }, routeTo: "cedula_tear" },
        { id: "hesitate", label: { fil: "Mag-atubili sandali", en: "Hesitate for a moment" }, routeTo: "cedula_tear" },
      ],
    },
    {
      id: "pl_minigame_cedula",
      type: "minigame",
      key: "cedula_tear",
      title: { fil: "Punitin ang Cedula", en: "Tear the Cedula" },
    },
    {
      id: "pl_outro_1",
      type: "story",
      text: {
        fil:
          "“Mabuhay ang Pilipinas!” Sabay-sabay na pinunit ng mga " +
          "Katipunero ang kanilang cedula. Nagsimula na ang himagsikan — at " +
          "bahagi ka nito.",
        en:
          "“Long live the Philippines!” Together the Katipuneros tore up their " +
          "cedulas. The revolution had begun — and you were part of it.",
      },
    },
    {
      id: "pl_recruit_intro",
      type: "story",
      text: {
        fil:
          "Para lumakas ang himagsikan, kailangan ng mas maraming kasapi. " +
          "Tulungan mong hikayatin ang mga Pilipino na sumapi sa Katipunan — " +
          "ngunit mag-ingat sa mga guwardiyang Espanyol!",
        en:
          "To grow stronger, the revolution needed more members. Help persuade " +
          "fellow Filipinos to join the Katipunan — but beware the Spanish guards!",
      },
    },
    {
      id: "pl_minigame_recruit",
      type: "minigame",
      key: "katipunan_recruit",
      title: { fil: "Pangangalap ng Katipunero", en: "Recruiting Katipuneros" },
    },
    {
      id: "pl_recruit_outro",
      type: "story",
      text: {
        fil:
          "Bawat bagong kasapi ay dagdag na lakas sa hukbo ng himagsikan. " +
          "Patuloy na lumaganap ang Katipunan sa buong kapuluan.",
        en:
          "Every new member added strength to the revolution. The Katipunan " +
          "kept spreading across the islands.",
      },
    },
    {
      id: "pl_code_intro",
      type: "story",
      text: {
        fil:
          "May dumating na lihim na mensahe mula sa ibang Katipunero, ngunit " +
          "nagkagulo ang mga salita para hindi ito mabasa ng mga Espanyol. " +
          "Kailangan mong ayusin ito.",
        en:
          "A secret message arrived from other Katipuneros, but the words were " +
          "scrambled so the Spanish could not read it. You must put it back in order.",
      },
    },
    {
      id: "pl_minigame_code",
      type: "minigame",
      key: "code_unscramble",
      title: { fil: "Lihim na Code", en: "The Secret Code" },
    },
    {
      id: "pl_outro_2",
      type: "story",
      text: {
        fil:
          "Naipasa ang mensahe! Sa tulong ng mga lihim na code, patuloy na " +
          "nag-ugnayan ang mga Katipunero habang lumalaban para sa kalayaan.",
        en:
          "The message got through! With secret codes, the Katipuneros kept in " +
          "touch as they fought for freedom.",
      },
    },
  ],
};
