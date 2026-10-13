import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { adoptDiscordAvatar } from "@/lib/discord-avatar";
import { useAuth } from "@/lib/auth";
import { friendlyError } from "@/lib/jackpot/errors";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PromoCodeField } from "@/components/promo/PromoCodePanel";
import { peekPromoCode, rememberPromoCode } from "@/lib/promo/claim";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export function ProfileSetupDialog() {
  const { needsProfile, refreshProfile, session } = useAuth();
  const [username, setUsername] = useState("");
  const [promo, setPromo] = useState(() => peekPromoCode());
  const [age, setAge] = useState(false);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    rememberPromoCode(
      promo,
      session?.user.id ? { kind: "account", accountId: session.user.id } : undefined,
    );
    const { data, error } = await supabase.rpc("ensure_profile", {
      p_username: username,
      p_age_confirmed: age,
    });
    if (error) {
      setBusy(false);
      toast.error(friendlyError(error));
      return;
    }
    const created =
      !!data && typeof data === "object" && (data as { created?: boolean }).created === true;
    if (created) await adoptDiscordAvatar(session?.user);
    setBusy(false);
    await refreshProfile();
  }

  return (
    <Dialog open={needsProfile}>
      <DialogContent className="[&>button]:hidden">
        <DialogHeader>
          <DialogTitle className="font-display">Pick your username</DialogTitle>
          <DialogDescription>This is how other players see you.</DialogDescription>
        </DialogHeader>
        <Input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="username"
          maxLength={20}
        />
        <PromoCodeField id="setup-promo" value={promo} onChange={setPromo} />
        <div className="flex items-center gap-2">
          <Checkbox id="age2" checked={age} onCheckedChange={(v) => setAge(v === true)} />
          <Label htmlFor="age2" className="text-sm">
            I confirm I am 18 or older
          </Label>
        </div>
        <Button onClick={save} disabled={busy || !age || username.length < 3}>
          Continue
        </Button>
      </DialogContent>
    </Dialog>
  );
}
