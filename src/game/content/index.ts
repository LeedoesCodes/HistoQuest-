import type { ArcId } from "@shared/types";
import type { ArcContent } from "./types";
import { pugadLawinArc } from "./pugadLawin";

/**
 * All learner-facing text is authored in Filipino (fil) and English (en).
 * Datu Bago is still a content stub — its mechanic is not built yet.
 */

const mactanArc: ArcContent = {
  arc: "mactan",
  title: { fil: "Labanan sa Mactan", en: "The Battle of Mactan" },
  assessment: [
    {
      id: "mac_q1",
      question: {
        fil: "Sino ang natalo ni Lapu-Lapu sa Labanan sa Mactan?",
        en: "Who did Lapu-Lapu defeat at the Battle of Mactan?",
      },
      choices: [
        { id: "a", label: { fil: "Ferdinand Magellan", en: "Ferdinand Magellan" } },
        { id: "b", label: { fil: "Miguel Lopez de Legazpi", en: "Miguel Lopez de Legazpi" } },
        { id: "c", label: { fil: "Rajah Humabon", en: "Rajah Humabon" } },
        { id: "d", label: { fil: "Andres Bonifacio", en: "Andres Bonifacio" } },
      ],
      correctChoiceId: "a",
    },
    {
      id: "mac_q2",
      question: {
        fil: "Saan naganap ang Labanan sa Mactan?",
        en: "Where did the Battle of Mactan take place?",
      },
      choices: [
        { id: "a", label: { fil: "Maynila", en: "Manila" } },
        { id: "b", label: { fil: "Mactan, Cebu", en: "Mactan, Cebu" } },
        { id: "c", label: { fil: "Davao", en: "Davao" } },
        { id: "d", label: { fil: "Batangas", en: "Batangas" } },
      ],
      correctChoiceId: "b",
    },
  ],
  nodes: [
    {
      id: "mac_intro_1",
      type: "story",
      text: {
        fil:
          "Abril 1521. Nasa baybayin ka ng Mactan kasama si Lapu-Lapu at ang " +
          "kaniyang mga mandirigma. May mga barko ng dayuhan sa malayo.",
        en:
          "April 1521. You stand on the shore of Mactan beside Lapu-Lapu and " +
          "his warriors. Foreign ships wait in the distance.",
      },
    },
    {
      id: "mac_intro_2",
      type: "story",
      text: {
        fil:
          "“Mababaw ang tubig dito,” wika ni Lapu-Lapu. “Hindi makakalapit ang " +
          "malalaking barko nila. Dito tayo lalaban.” Tumingin siya sa iyo — " +
          "kailangan niya ng katulong.",
        en:
          "“The water here is shallow,” Lapu-Lapu said. “Their big ships cannot " +
          "come close. We will fight them here.” He looked at you — he needed help.",
      },
    },
    {
      id: "mac_decision",
      type: "decision",
      prompt: { fil: "Paano mo tutulungan si Lapu-Lapu?", en: "How will you help Lapu-Lapu?" },
      timeLimitMs: 8000,
      defaultChoiceId: "shore",
      choices: [
        { id: "shore", label: { fil: "Bantayan ang baybayin", en: "Guard the shore" }, routeTo: "mactan_defense" },
        { id: "warn", label: { fil: "Balaan ang mga kasamahan", en: "Warn the others" }, routeTo: "mactan_defense" },
      ],
    },
    {
      id: "mac_minigame",
      type: "minigame",
      key: "mactan_defense",
      title: { fil: "Depensa sa Mactan", en: "Defense of Mactan" },
    },
    {
      id: "mac_outro_1",
      type: "story",
      text: {
        fil:
          "Hindi nakalapag ang mga dayuhan. Sa mababaw na tubig ng Mactan, " +
          "natalo ang hukbo ni Magellan — at siya mismo ay nasawi sa labanan.",
        en:
          "The foreigners never landed. In Mactan's shallow water Magellan's " +
          "force was beaten — and Magellan himself fell in the battle.",
      },
    },
    {
      id: "mac_outro_2",
      type: "story",
      text: {
        fil:
          "Si Lapu-Lapu ang naging unang pinunong Pilipino na matagumpay na " +
          "lumaban sa mga dayuhang mananakop. Nasaksihan mo ang kasaysayan.",
        en:
          "Lapu-Lapu became the first Filipino leader to successfully resist " +
          "foreign invaders. You witnessed history.",
      },
    },
  ],
};

const datuBagoArc: ArcContent = {
  arc: "datu_bago",
  title: { fil: "Paglaban ni Datu Bago", en: "The Resistance of Datu Bago" },
  assessment: [
    {
      id: "db_q1",
      question: {
        fil: "Sinong pinuno ang lumaban sa mga Espanyol sa tabi ng Ilog Davao?",
        en: "Which leader fought the Spanish along the Davao River?",
      },
      choices: [
        { id: "a", label: { fil: "Datu Bago", en: "Datu Bago" } },
        { id: "b", label: { fil: "Datu Lapu-Lapu", en: "Datu Lapu-Lapu" } },
        { id: "c", label: { fil: "Sultan Kudarat", en: "Sultan Kudarat" } },
        { id: "d", label: { fil: "Rajah Sulayman", en: "Rajah Sulayman" } },
      ],
      correctChoiceId: "a",
    },
    {
      id: "db_q2",
      question: {
        fil: "Anong pangkat-katutubo ang pinamunuan ni Datu Bago sa paglaban?",
        en: "Which indigenous group did Datu Bago lead in the resistance?",
      },
      choices: [
        { id: "a", label: { fil: "mga Ivatan", en: "the Ivatan" } },
        { id: "b", label: { fil: "mga Bagobo", en: "the Bagobo" } },
        { id: "c", label: { fil: "mga Ifugao", en: "the Ifugao" } },
        { id: "d", label: { fil: "mga Aeta", en: "the Aeta" } },
      ],
      correctChoiceId: "b",
    },
  ],
  nodes: [
    {
      id: "db_intro_1",
      type: "story",
      text: {
        fil:
          "Sa tabi ng Ilog Davao, pinamunuan ni Datu Bago ang paglaban ng mga " +
          "Bagobo at katutubo laban sa mga mananakop na Espanyol.",
        en:
          "Along the Davao River, Datu Bago led the Bagobo and other indigenous " +
          "peoples in resisting the Spanish colonizers.",
      },
    },
    {
      id: "db_minigame",
      type: "minigame",
      key: "datu_bago_defense",
      title: { fil: "Depensa sa Komunidad", en: "Defending the Community" },
    },
  ],
};

const ARCS: Record<ArcId, ArcContent> = {
  pugad_lawin: pugadLawinArc,
  mactan: mactanArc,
  datu_bago: datuBagoArc,
};

export function getArcContent(arc: ArcId): ArcContent {
  return ARCS[arc];
}
