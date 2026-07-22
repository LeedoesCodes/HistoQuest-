import { useEffect, useRef } from "react";
import Phaser from "phaser";
import { createGameConfig } from "./gameConfig";
import type { HistoryGameProps, ArcId } from "@shared/types";

/**
 * HistoryGame — the SINGLE entry point the shell mounts (see types.ts).
 * This is the React ↔ Phaser boundary: React owns the page, Phaser owns
 * the canvas. We create the game once on mount and destroy it on unmount.
 * React never touches the game loop.
 */
export function HistoryGame({ pupil, onComplete, startArc }: HistoryGameProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!hostRef.current || gameRef.current) return;

    const game = new Phaser.Game(createGameConfig(hostRef.current));
    gameRef.current = game;
    if (import.meta.env.DEV) (window as unknown as { __game: Phaser.Game }).__game = game;

    // Bridge: Phaser scenes emit events, React handles cross-cutting concerns.
    const onArcSelected = (arc: ArcId) => {
      console.log("[HistoryGame] arc selected:", arc, "pupil:", pupil.displayName);
      // Later this drives the arc flow; for now it just logs.
    };
    game.events.on("arc-selected", onArcSelected);

    let destroyed = false;
    const destroy = () => {
      if (destroyed) return;
      destroyed = true;
      game.events.off("arc-selected", onArcSelected);
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

  // Keep references used so the compiler is happy while these are stubs.
  void onComplete;
  void startArc;

  return <div ref={hostRef} style={{ width: "100%", maxWidth: 800, margin: "0 auto" }} />;
}
