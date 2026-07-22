import type { ArcContent } from "./types";

/**
 * Sample content for the Pugad Lawin arc (Andres Bonifacio, 1896).
 * The pupil is a fictional ally — a young Katipunero — not Bonifacio himself.
 *
 * This is a SLICE to drive the gameplay loop end to end (story → decision →
 * mini-game placeholder). Real historical copy, art, and voiceover come later;
 * keep the node shapes and this file is easy to extend.
 */
export const pugadLawinArc: ArcContent = {
  arc: "pugad_lawin",
  title: "Sigaw sa Pugad Lawin",
  assessment: [
    {
      id: "pl_q1",
      question: "Sino ang pinuno ng Katipunan sa Sigaw sa Pugad Lawin?",
      choices: [
        { id: "a", label: "Andres Bonifacio" },
        { id: "b", label: "Jose Rizal" },
        { id: "c", label: "Emilio Aguinaldo" },
        { id: "d", label: "Lapu-Lapu" },
      ],
      correctChoiceId: "a",
    },
    {
      id: "pl_q2",
      question: "Ano ang ginawa ng mga Katipunero bilang tanda ng paghihimagsik?",
      choices: [
        { id: "a", label: "Sinunog ang bandila" },
        { id: "b", label: "Pinunit ang kanilang cedula" },
        { id: "c", label: "Nagtanim ng puno" },
        { id: "d", label: "Sumulat ng liham sa hari" },
      ],
      correctChoiceId: "b",
    },
    {
      id: "pl_q3",
      question: "Anong taon naganap ang Sigaw sa Pugad Lawin?",
      choices: [
        { id: "a", label: "1521" },
        { id: "b", label: "1872" },
        { id: "c", label: "1896" },
        { id: "d", label: "1946" },
      ],
      correctChoiceId: "c",
    },
  ],
  nodes: [
    {
      id: "pl_intro_1",
      type: "story",
      text:
        "Agosto 1896. Kasama mo ang libo-libong Katipunero sa Pugad Lawin. " +
        "Si Andres Bonifacio ay tumindig sa harap ng mga tao. Ramdam mo ang " +
        "kaba at pag-asa sa hangin.",
    },
    {
      id: "pl_intro_2",
      type: "story",
      text:
        "Hawak ni Bonifacio ang kaniyang cedula — ang selyo ng pananakop ng " +
        "mga Espanyol. Tinignan ka niya. “Kapatid, handa ka na ba?”",
    },
    {
      id: "pl_decision_cedula",
      type: "decision",
      prompt: "Ano ang gagawin mo sa iyong cedula?",
      timeLimitMs: 8000,
      defaultChoiceId: "tear",
      choices: [
        { id: "tear", label: "Punitin ang cedula!", routeTo: "cedula_tear" },
        { id: "hesitate", label: "Mag-atubili sandali", routeTo: "cedula_tear" },
      ],
    },
    {
      id: "pl_minigame_cedula",
      type: "minigame",
      key: "cedula_tear",
      title: "Punitin ang Cedula",
    },
    {
      id: "pl_outro_1",
      type: "story",
      text:
        "“Mabuhay ang Pilipinas!” Sabay-sabay na pinunit ng mga " +
        "Katipunero ang kanilang cedula. Nagsimula na ang himagsikan — at " +
        "bahagi ka nito.",
    },
  ],
};
