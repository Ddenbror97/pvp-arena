import { createRoot } from "react-dom/client";
import { DeathFeedback } from "../../../src/components/fps/DeathFeedback";

export function mountDeathFeedback(host: Element) {
  createRoot(host).render(<DeathFeedback round={1} />);
}
