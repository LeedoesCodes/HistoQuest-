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
