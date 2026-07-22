import type { ArcId } from "@shared/types";
import type { ArcContent } from "./types";
import { pugadLawinArc } from "./pugadLawin";

/**
 * Minimal placeholder arcs for Mactan and Datu Bago so the arc-select flow
 * works for all three today. Replace with full content as each arc is built.
 */
const mactanArc: ArcContent = {
  arc: "mactan",
  title: "Labanan sa Mactan",
  assessment: [
    {
      id: "mac_q1",
      question: "Sino ang natalo ni Lapu-Lapu sa Labanan sa Mactan?",
      choices: [
        { id: "a", label: "Ferdinand Magellan" },
        { id: "b", label: "Miguel Lopez de Legazpi" },
        { id: "c", label: "Rajah Humabon" },
        { id: "d", label: "Andres Bonifacio" },
      ],
      correctChoiceId: "a",
    },
    {
      id: "mac_q2",
      question: "Saan naganap ang Labanan sa Mactan?",
      choices: [
        { id: "a", label: "Maynila" },
        { id: "b", label: "Mactan, Cebu" },
        { id: "c", label: "Davao" },
        { id: "d", label: "Batangas" },
      ],
      correctChoiceId: "b",
    },
  ],
  nodes: [
    {
      id: "mac_intro_1",
      type: "story",
      text:
        "Abril 1521. Nasa baybayin ka ng Mactan kasama si Lapu-Lapu at ang " +
        "kaniyang mga mandirigma. May mga barko ng dayuhan sa malayo.",
    },
    { id: "mac_minigame", type: "minigame", key: "mactan_defense", title: "Depensa sa Mactan" },
  ],
};

const datuBagoArc: ArcContent = {
  arc: "datu_bago",
  title: "Paglaban ni Datu Bago",
  assessment: [
    {
      id: "db_q1",
      question: "Sinong pinuno ang lumaban sa mga Espanyol sa tabi ng Ilog Davao?",
      choices: [
        { id: "a", label: "Datu Bago" },
        { id: "b", label: "Datu Lapu-Lapu" },
        { id: "c", label: "Sultan Kudarat" },
        { id: "d", label: "Rajah Sulayman" },
      ],
      correctChoiceId: "a",
    },
    {
      id: "db_q2",
      question: "Anong pangkat-katutubo ang pinamunuan ni Datu Bago sa paglaban?",
      choices: [
        { id: "a", label: "mga Ivatan" },
        { id: "b", label: "mga Bagobo" },
        { id: "c", label: "mga Ifugao" },
        { id: "d", label: "mga Aeta" },
      ],
      correctChoiceId: "b",
    },
  ],
  nodes: [
    {
      id: "db_intro_1",
      type: "story",
      text:
        "Sa tabi ng Ilog Davao, pinamunuan ni Datu Bago ang paglaban ng mga " +
        "Bagobo at katutubo laban sa mga mananakop na Espanyol.",
    },
    { id: "db_minigame", type: "minigame", key: "datu_bago_defense", title: "Depensa sa Komunidad" },
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
