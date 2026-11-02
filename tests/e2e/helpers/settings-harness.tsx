import { createRoot } from "react-dom/client";
import { useState } from "react";
import { GameSettings, StrikeCrosshair } from "../../../src/components/fps/GameSettings";
import { readStrikeSettings, saveStrikeSettings } from "../../../src/lib/fps/settings";
function Harness({ practice }: { practice: boolean }) {
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
        onLeavePractice={
          practice
            ? () => {
                document.body.dataset.leftPractice = "true";
                setOpen(false);
              }
            : undefined
        }
      />
    </>
  );
}
export function mountSettings(host: Element, practice = false) {
  createRoot(host).render(<Harness practice={practice} />);
}
