import type { ArcId } from "@shared/types";
import type { ArcContent } from "./types";
import { pugadLawinArc } from "./pugadLawin";
import { mactanArc } from "./mactan";

/**
 * All learner-facing text is authored in Filipino (fil) and English (en).
 * Datu Bago is still a content stub — its mechanic is not built yet.
 */

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
