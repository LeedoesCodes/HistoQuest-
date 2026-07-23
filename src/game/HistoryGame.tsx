import { useEffect, useRef } from "react";
import Phaser from "phaser";
import { createGameConfig } from "./gameConfig";
import { setLanguage } from "./i18n";
import type { HistoryGameProps, ArcId, HistorySessionResult } from "@shared/types";

/**
 * HistoryGame — the SINGLE entry point the shell mounts (see types.ts).
 * This is the React ↔ Phaser boundary: React owns the page, Phaser owns
 * the canvas. We create the game once on mount and destroy it on unmount.
 * React never touches the game loop.
 */
export function HistoryGame({ pupil, onComplete, startArc, language }: HistoryGameProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!hostRef.current || gameRef.current) return;

    // Apply the starting language before any scene renders text.
    if (language) setLanguage(language);

    const game = new Phaser.Game(createGameConfig(hostRef.current));
    gameRef.current = game;
    // Make the pupil available to every scene (ArcScene reads it for logging).
    game.registry.set("pupil", pupil);
    if (import.meta.env.DEV) (window as unknown as { __game: Phaser.Game }).__game = game;

    // Bridge: Phaser scenes emit events, React handles cross-cutting concerns.
    const onArcSelected = (arc: ArcId) => {
      console.log("[HistoryGame] arc started:", arc, "pupil:", pupil.displayName);
    };
    const onArcFinished = (result: HistorySessionResult) => {
      console.log("[HistoryGame] arc finished:", result);
      onComplete(result);
    };
    game.events.on("arc-selected", onArcSelected);
    game.events.on("arc-finished", onArcFinished);

    let destroyed = false;
    const destroy = () => {
      if (destroyed) return;
      destroyed = true;
      game.events.off("arc-selected", onArcSelected);
      game.events.off("arc-finished", onArcFinished);
      game.destroy(true); // true → also removes the <canvas>
    };

    return () => {
      // Phaser boots asynchronously. If we destroy before boot completes
      // (e.g. React StrictMode's throwaway mount in dev), the canvas leaks.
      // So destroy now if booted, otherwise wait for the ready event.
      if (game.isBooted) destroy();
      else game.events.once(Phaser.Core.Events.READY, destroy);
      gameRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // startArc (jump straight into an arc) is not wired yet.
  void startArc;

  return <div ref={hostRef} style={{ width: "100%", maxWidth: 800, margin: "0 auto" }} />;
}
