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
  assessment: {
    objectives: [
      {
        id: "db_obj_leader",
        description: {
          fil: "Nakikilala ang pinunong lumaban sa mga Espanyol sa Davao.",
          en: "Identifies the leader who resisted the Spanish in Davao.",
        },
        items: [
          {
            id: "db_leader_a",
            question: {
              fil: "Sinong pinuno ang lumaban sa mga Espanyol sa tabi ng Ilog Davao?",
              en: "Which leader fought the Spanish along the Davao River?",
            },
            choices: [
              { id: "a", label: { fil: "Datu Bago", en: "Datu Bago" } },
              { id: "b", label: { fil: "Lapu-Lapu", en: "Lapu-Lapu" } },
              { id: "c", label: { fil: "Sultan Kudarat", en: "Sultan Kudarat" } },
              { id: "d", label: { fil: "Rajah Sulayman", en: "Rajah Sulayman" } },
            ],
            correctChoiceId: "a",
          },
          {
            id: "db_leader_b",
            question: {
              fil: "Sino ang namuno sa paglaban sa Davao noong panahon ng mga Espanyol?",
              en: "Who led the resistance in Davao during the Spanish period?",
            },
            choices: [
              { id: "a", label: { fil: "Andres Bonifacio", en: "Andres Bonifacio" } },
              { id: "b", label: { fil: "Datu Bago", en: "Datu Bago" } },
              { id: "c", label: { fil: "Rajah Humabon", en: "Rajah Humabon" } },
              { id: "d", label: { fil: "Diego Silang", en: "Diego Silang" } },
            ],
            correctChoiceId: "b",
          },
        ],
      },
      {
        id: "db_obj_group",
        description: {
          fil: "Nakikilala ang pangkat-katutubo na kasama sa paglaban.",
          en: "Identifies the indigenous group involved in the resistance.",
        },
        items: [
          {
            id: "db_group_a",
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
          {
            id: "db_group_b",
            question: {
              fil: "Kaninong pangkat sa Davao nakipagtulungan si Datu Bago?",
              en: "Which group in Davao worked with Datu Bago?",
            },
            choices: [
              { id: "a", label: { fil: "mga Bagobo", en: "the Bagobo" } },
              { id: "b", label: { fil: "mga Tausug", en: "the Tausug" } },
              { id: "c", label: { fil: "mga Igorot", en: "the Igorot" } },
              { id: "d", label: { fil: "mga Tagalog", en: "the Tagalog" } },
            ],
            correctChoiceId: "a",
          },
        ],
      },
    ],
  },

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
