import ReactDOM from "react-dom/client";
import App from "./App";

// NOTE: React.StrictMode is intentionally omitted. It double-mounts every
// component in dev to surface effect bugs — but Phaser boots asynchronously
// and manages its own lifecycle, so the throwaway mount leaks a <canvas>.
// Production never double-mounts; our React layer is only the thin shell.
ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
