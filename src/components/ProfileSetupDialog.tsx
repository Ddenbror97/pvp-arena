import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { friendlyError } from "@/lib/jackpot/errors";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export function ProfileSetupDialog() {
  const { needsProfile, refreshProfile } = useAuth();
  const [username, setUsername] = useState("");
  const [age, setAge] = useState(false);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    const { error } = await supabase.rpc("ensure_profile", { p_username: username, p_age_confirmed: age });
    setBusy(false);
    if (error) return toast.error(friendlyError(error));
    await refreshProfile();
  }

  return (
    <Dialog open={needsProfile}>
      <DialogContent className="[&>button]:hidden">
        <DialogHeader>
          <DialogTitle className="font-display">Pick your username</DialogTitle>
          <DialogDescription>This is how other players see you.</DialogDescription>
        </DialogHeader>
        <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username" maxLength={20} />
        <div className="flex items-center gap-2">
          <Checkbox id="age2" checked={age} onCheckedChange={(v) => setAge(v === true)} />
          <Label htmlFor="age2" className="text-sm">I confirm I am 18 or older</Label>
        </div>
        <Button onClick={save} disabled={busy || !age || username.length < 3}>Continue</Button>
      </DialogContent>
    </Dialog>
  );
}
