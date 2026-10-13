import { useCallback, useEffect, useId, useRef, useState, type DragEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertCircle, Check, ImageUp, Loader2, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { AVATAR_STYLES, isCustomAvatar, storedAvatarUrl, type AvatarStyle } from "@/lib/avatar";
import {
  AVATAR_ACCEPT,
  AVATAR_ERROR_MESSAGES,
  AVATAR_LIMITS_LABEL,
  type AvatarCrop,
  type AvatarErrorCode,
} from "@/lib/avatar-upload/limits";
import { AvatarError } from "@/lib/avatar-upload/sniff";
import {
  cropPreviewUrl,
  precheckAvatarFile,
  renderAvatarWebp,
  uploadAvatarFile,
  type PickedImage,
} from "@/lib/avatar-upload/client";
import { removeCustomAvatar, setPresetAvatar } from "@/lib/avatar-upload/avatar.functions";
import { PlayerPrestigeIdentity } from "@/components/prestige/PlayerPrestigeIdentity";
import { PlayerAvatar } from "@/components/jackpot/Avatar";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AvatarCropper } from "./AvatarCropper";

type Phase = "editing" | "uploading" | "checking" | "error";

const codeOf = (e: unknown): AvatarErrorCode =>
  e instanceof AvatarError ? (e.code as AvatarErrorCode) : "SERVER_ERROR";

function ErrorNote({ code, id }: { code: AvatarErrorCode; id?: string }) {
  return (
    <p
      id={id}
      role="alert"
      className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-left text-sm text-foreground"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden />
      <span>{AVATAR_ERROR_MESSAGES[code]}</span>
    </p>
  );
}

export function AvatarManager({
  frame,
  crown,
  level,
  tier,
}: {
  frame: string | null;
  crown: string | null;
  level?: number | undefined;
  tier?: string | undefined;
}) {
  const { profile, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const previewImg = useRef<HTMLImageElement | null>(null);
  const errorId = useId();
  const [picked, setPicked] = useState<PickedImage | null>(null);
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("editing");
  const [pickError, setPickError] = useState<AvatarErrorCode | null>(null);
  const [uploadError, setUploadError] = useState<AvatarErrorCode | null>(null);
  const [progress, setProgress] = useState(0);
  const [crop, setCrop] = useState<AvatarCrop>({ x: 0, y: 0, size: 1 });
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState<"remove" | AvatarStyle | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  const custom = isCustomAvatar(profile?.avatar_url);
  const working = phase === "uploading" || phase === "checking";

  useEffect(
    () => () => {
      if (picked) URL.revokeObjectURL(picked.url);
    },
    [picked],
  );
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  useEffect(() => {
    if (!picked) return;
    const img = previewImg.current;
    if (!img) return;
    const t = window.setTimeout(() => {
      void cropPreviewUrl(img, crop).then((url) => setPreview(url));
    }, 120);
    return () => window.clearTimeout(t);
  }, [crop, picked]);

  useEffect(() => {
    if (!justSaved) return;
    const t = window.setTimeout(() => setJustSaved(false), 4000);
    return () => window.clearTimeout(t);
  }, [justSaved]);

  const onCrop = useCallback((c: AvatarCrop) => setCrop(c), []);

  async function choose(file: File | undefined | null) {
    if (!file) return;
    setPickError(null);
    try {
      const img = await precheckAvatarFile(file);
      setUploadError(null);
      setPhase("editing");
      setProgress(0);
      setPreview(null);
      setPicked(img);
      setOpen(true);
    } catch (e) {
      if (open) {
        setUploadError(codeOf(e));
        setPhase("error");
      } else {
        setPickError(codeOf(e));
      }
    }
  }

  function close() {
    if (working) return;
    setOpen(false);
  }

  function reset() {
    setPicked(null);
    setPreview(null);
    setUploadError(null);
    setPhase("editing");
    if (input.current) input.current.value = "";
  }

  async function refreshEverywhere() {
    await refreshProfile();
    void queryClient.invalidateQueries();
  }

  async function save() {
    const img = previewImg.current;
    if (!picked || !img || working) return;
    setUploadError(null);
    setPhase("uploading");
    setProgress(0);
    try {
      const avatar = await renderAvatarWebp(img, crop);
      await uploadAvatarFile(avatar, (f) => {
        setProgress(f);
        if (f >= 1) setPhase("checking");
      });
      await refreshEverywhere();
      setJustSaved(true);
      toast.success("Avatar updated");
      setPhase("editing");
      setOpen(false);
    } catch (e) {
      setUploadError(codeOf(e));
      setPhase("error");
    }
  }

  async function remove() {
    setBusy("remove");
    try {
      await removeCustomAvatar();
      await refreshEverywhere();
      toast.success("Default avatar restored");
    } catch {
      toast.error("We couldn't remove your avatar right now. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  async function pickPreset(style: AvatarStyle) {
    if (!profile) return;
    setBusy(style);
    try {
      await setPresetAvatar({ data: { style, seed: profile.username } });
      await refreshEverywhere();
    } catch {
      toast.error("We couldn't change your avatar right now. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    void choose(e.dataTransfer.files?.[0]);
  }

  if (!profile) return null;
  const presetUrl = (s: AvatarStyle) => storedAvatarUrl(s, profile.username);
  const retryable =
    uploadError &&
    ![
      "CONTENT_REJECTED",
      "UNSUPPORTED_FORMAT",
      "ANIMATED_IMAGE",
      "MALFORMED_IMAGE",
      "TOO_SMALL",
      "TOO_LARGE_DIMENSIONS",
      "FILE_TOO_LARGE",
    ].includes(uploadError);

  return (
    <section
      aria-labelledby="avatar-heading"
      className="rounded-lg border border-border bg-card p-3"
    >
      <h2 id="avatar-heading" className="font-display text-xs uppercase tracking-widest">
        Avatar
      </h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
        <div className="flex items-center gap-4 sm:flex-col sm:gap-2">
          <div className="relative">
            <PlayerPrestigeIdentity
              avatar={profile.avatar_url}
              name={profile.username}
              frame={frame}
              crown={crown}
              level={level}
              tier={tier}
              size={72}
            />
            {justSaved ? (
              <span
                className="absolute -right-1 bottom-2 z-30 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white shadow motion-safe:animate-in motion-safe:zoom-in-50"
                aria-hidden
              >
                <Check className="h-4 w-4" />
              </span>
            ) : null}
          </div>
          <div className="min-w-0 sm:text-center">
            <p className="text-sm font-semibold">{custom ? "Custom avatar" : "Default avatar"}</p>
            {justSaved ? (
              <p className="text-xs text-muted-foreground" aria-live="polite">
                Saved
              </p>
            ) : null}
          </div>
        </div>

        <div className="min-w-0">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={cn(
              "flex flex-col items-center gap-2 rounded-xl border border-dashed px-3 py-3 text-center transition-colors motion-reduce:transition-none",
              dragging ? "border-primary bg-primary/10" : "border-border bg-background/40",
            )}
          >
            <span
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary transition-transform motion-reduce:transition-none",
                dragging && "scale-110",
              )}
              aria-hidden
            >
              <ImageUp className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold">
                <span className="hidden sm:inline">Drag an image here, or </span>
                <span className="sm:hidden">Upload a photo</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{AVATAR_LIMITS_LABEL}</p>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => input.current?.click()}
              aria-describedby={pickError ? errorId : undefined}
            >
              {custom ? "Change avatar" : "Upload image"}
            </Button>
            <input
              ref={input}
              type="file"
              accept={AVATAR_ACCEPT}
              className="sr-only"
              tabIndex={-1}
              aria-hidden
              onChange={(e) => void choose(e.target.files?.[0])}
            />
          </div>
          {pickError ? (
            <div className="mt-3">
              <ErrorNote code={pickError} id={errorId} />
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="w-full text-xs text-muted-foreground sm:mr-1 sm:w-auto">
              Or a built-in style
            </span>
            {AVATAR_STYLES.map((s) => {
              const active = profile.avatar_url === presetUrl(s);
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => void pickPreset(s)}
                  disabled={busy !== null || active}
                  aria-pressed={active}
                  aria-label={`Use the ${s.replace("-", " ")} avatar`}
                  className={cn(
                    "relative rounded-[8%] p-0.5 transition hover:ring-2 hover:ring-primary/60 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default motion-reduce:active:scale-100",
                    active && "ring-2 ring-primary",
                    busy !== null && busy !== s && !active && "opacity-60",
                  )}
                >
                  <PlayerAvatar src={presetUrl(s)} className="h-9 w-9" />
                  {busy === s ? (
                    <Loader2
                      className="absolute inset-0 m-auto h-5 w-5 animate-spin text-white motion-reduce:animate-none"
                      aria-hidden
                    />
                  ) : null}
                </button>
              );
            })}
          </div>

          {custom ? (
            <Button
              type="button"
              variant="ghost"
              className="mt-3 min-h-11 px-3 text-muted-foreground hover:text-destructive"
              disabled={busy !== null}
              onClick={() => void remove()}
            >
              {busy === "remove" ? (
                <Loader2
                  className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none"
                  aria-hidden
                />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" aria-hidden />
              )}
              {busy === "remove" ? "Removing…" : "Remove custom avatar"}
            </Button>
          ) : null}
        </div>
      </div>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) close();
        }}
      >
        <DialogContent
          className="max-h-[calc(100dvh-1.5rem)] w-[calc(100vw-1.5rem)] max-w-md overflow-y-auto rounded-2xl p-5 sm:p-6"
          onCloseAutoFocus={reset}
          onInteractOutside={(e) => {
            if (working) e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            if (working) e.preventDefault();
          }}
        >
          <div className="text-center">
            <DialogTitle className="font-display text-xl">Position your avatar</DialogTitle>
            <DialogDescription className="mt-1 text-sm text-muted-foreground">
              Drag to move, pinch or use the slider to zoom.
            </DialogDescription>
          </div>
          {picked ? (
            <>
              <img ref={previewImg} src={picked.url} alt="" className="hidden" />
              <AvatarCropper
                key={picked.url}
                src={picked.url}
                width={picked.width}
                height={picked.height}
                disabled={working}
                onChange={onCrop}
              />
              <div
                className="flex items-center justify-center gap-4 rounded-xl bg-muted/40 px-3 py-3"
                aria-label="Preview with your frame and crown"
              >
                <PlayerPrestigeIdentity
                  previewSrc={preview}
                  avatar={profile.avatar_url}
                  name={profile.username}
                  frame={frame}
                  crown={crown}
                  size={80}
                />
                <div className="flex items-end gap-2" aria-hidden>
                  <PlayerPrestigeIdentity
                    previewSrc={preview}
                    avatar={profile.avatar_url}
                    name={profile.username}
                    frame={frame}
                    crown={crown}
                    size={40}
                  />
                  <PlayerPrestigeIdentity
                    previewSrc={preview}
                    avatar={profile.avatar_url}
                    name={profile.username}
                    frame={frame}
                    crown={crown}
                    size={28}
                  />
                </div>
                <p className="hidden text-xs text-muted-foreground min-[380px]:block">
                  How other
                  <br />
                  players see you
                </p>
              </div>
            </>
          ) : null}

          <div aria-live="polite" className="min-h-0">
            {working ? (
              <div className="rounded-xl border border-border px-3 py-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Loader2
                    className="h-4 w-4 animate-spin text-primary motion-reduce:animate-none"
                    aria-hidden
                  />
                  {phase === "uploading"
                    ? `Uploading… ${Math.round(progress * 100)}%`
                    : "Checking your avatar…"}
                </div>
                <div
                  className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"
                  role="progressbar"
                  aria-label="Upload progress"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={phase === "uploading" ? Math.round(progress * 100) : 100}
                >
                  <div
                    className={cn(
                      "h-full rounded-full bg-primary transition-[width] duration-200 motion-reduce:transition-none",
                      phase === "checking" && "motion-safe:animate-pulse",
                    )}
                    style={{
                      width: `${phase === "uploading" ? Math.max(4, progress * 100) : 100}%`,
                    }}
                  />
                </div>
              </div>
            ) : null}
            {phase === "error" && uploadError ? <ErrorNote code={uploadError} /> : null}
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            {phase === "error" && !retryable ? (
              <Button
                type="button"
                variant="secondary"
                className="min-h-11"
                onClick={() => input.current?.click()}
              >
                Choose another image
              </Button>
            ) : (
              <Button
                type="button"
                variant="secondary"
                className="min-h-11"
                onClick={close}
                disabled={working}
              >
                Cancel
              </Button>
            )}
            {phase === "error" && !retryable ? null : (
              <Button
                type="button"
                className="min-h-11 sm:min-w-32"
                onClick={() => void save()}
                disabled={working}
              >
                {working ? (
                  <Loader2
                    className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none"
                    aria-hidden
                  />
                ) : null}
                {working ? "Saving…" : phase === "error" ? "Try again" : "Save avatar"}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
