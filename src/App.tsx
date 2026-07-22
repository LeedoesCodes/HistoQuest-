import { HistoryGame } from "./game/HistoryGame";
import type { Pupil } from "@shared/types";

/**
 * App — stands in for the team's shell/dashboard during solo development.
 * At merge time, the real shell renders <HistoryGame /> the same way,
 * passing a real pupil from the shared auth. This mock pupil lets you
 * build the whole game without waiting on anyone.
 */
const MOCK_PUPIL: Pupil = {
  id: "00000000-0000-0000-0000-000000000001",
  displayName: "Juan (test pupil)",
  gradeLevel: 5,
};

export default function App() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0f1c",
        color: "#e8e8e8",
        fontFamily: "sans-serif",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "16px",
        boxSizing: "border-box",
      }}
    >
      <p style={{ opacity: 0.6, fontSize: 13, marginBottom: 12 }}>
        Dev shell — History module · pupil: {MOCK_PUPIL.displayName} · Grade {MOCK_PUPIL.gradeLevel}
      </p>
      <HistoryGame
        pupil={MOCK_PUPIL}
        onComplete={(result) => console.log("[App] arc complete:", result)}
      />
    </div>
  );
}
