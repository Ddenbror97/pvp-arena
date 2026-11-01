import { createRoot } from "react-dom/client";
import { useState } from "react";
import { GameSettings, StrikeCrosshair } from "../../../src/components/fps/GameSettings";
import { readStrikeSettings, saveStrikeSettings } from "../../../src/lib/fps/settings";
function Harness() {
  const [settings, setSettings] = useState(readStrikeSettings);
  const [open, setOpen] = useState(true);
  return (
    <>
      <StrikeCrosshair settings={settings} />
      <button onClick={() => setOpen(true)}>Settings</button>
      <GameSettings
        open={open}
        onOpenChange={setOpen}
        settings={settings}
        onChange={(value) => {
          setSettings(value);
          saveStrikeSettings(value);
        }}
        onResume={() => setOpen(false)}
      />
    </>
  );
}
export function mountSettings(host: Element) {
  createRoot(host).render(<Harness />);
}
