"use client";

import { Camera, Loader2, Trash2 } from "lucide-react";
import { startTransition, useActionState, useCallback, useEffect, useRef, useState } from "react";
import { Notice } from "@/components/shared/form-bits";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cropRect, MAX_ZOOM, MIN_ZOOM, panBy, type CropState } from "@/lib/images/crop";
import { removeAvatar, uploadAvatar, type SettingsState } from "@/server/profiles/actions";
import { useSavedToast } from "./use-saved-toast";

const PREVIEW = 224;
const OUTPUT = 512;
const MAX_SOURCE_BYTES = 15 * 1024 * 1024;

/** Encodes the crop as WebP (JPEG where the browser can't write WebP). The server re-encodes it. */
function exportCrop(image: HTMLImageElement, crop: CropState): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT;
  canvas.height = OUTPUT;
  const context = canvas.getContext("2d");
  if (!context) return Promise.resolve(null);
  const { sx, sy, size } = cropRect(image.naturalWidth, image.naturalHeight, crop);
  context.imageSmoothingQuality = "high";
  context.drawImage(image, sx, sy, size, size, 0, 0, OUTPUT, OUTPUT);
  return new Promise((resolve) =>
    canvas.toBlob(
      (webp) => {
        if (webp?.type === "image/webp") resolve(webp);
        else canvas.toBlob((jpeg) => resolve(jpeg), "image/jpeg", 0.9);
      },
      "image/webp",
      0.9,
    ),
  );
}

/** Avatar upload with a square crop (drag, zoom slider, arrow keys) done in the browser. */
export function AvatarEditor({
  username,
  displayName,
  avatarUrl,
}: {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}) {
  const [uploadState, uploadAction, uploading] = useActionState<SettingsState, FormData>(uploadAvatar, {
    status: "idle",
  });
  const [removeState, removeAction, removing] = useActionState<SettingsState>(removeAvatar, { status: "idle" });
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [crop, setCrop] = useState<CropState>({ zoom: 1, panX: 0, panY: 0 });
  const [pickError, setPickError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{ x: number; y: number } | null>(null);

  useSavedToast(uploadState);
  useSavedToast(removeState);

  // Close the editor once the upload has saved.
  const savedAt = uploadState.status === "saved" ? uploadState.at : null;
  const [closedFor, setClosedFor] = useState<number | null>(null);
  if (savedAt && closedFor !== savedAt) {
    setClosedFor(savedAt);
    setImage(null);
  }

  // Draw the live preview.
  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context || !image) return;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = PREVIEW * ratio;
    canvas.height = PREVIEW * ratio;
    const { sx, sy, size } = cropRect(image.naturalWidth, image.naturalHeight, crop);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, sx, sy, size, size, 0, 0, canvas.width, canvas.height);
  }, [image, crop]);

  const pick = (file: File | undefined) => {
    setPickError(null);
    if (!file) return;
    if (!file.type.startsWith("image/")) return setPickError("Choose an image file.");
    if (file.size > MAX_SOURCE_BYTES) return setPickError("That image is too large. Use one under 15 MB.");
    const url = URL.createObjectURL(file);
    const element = new Image();
    element.onload = () => {
      setImage(element);
      setCrop({ zoom: 1, panX: 0, panY: 0 });
      URL.revokeObjectURL(url);
    };
    element.onerror = () => {
      setPickError("We couldn't open that image. Try a JPEG or PNG.");
      URL.revokeObjectURL(url);
    };
    element.src = url;
  };

  const move = useCallback(
    (dx: number, dy: number) => {
      if (image) setCrop((current) => panBy(image.naturalWidth, image.naturalHeight, current, dx, dy, PREVIEW));
    },
    [image],
  );

  const save = async () => {
    if (!image) return;
    const blob = await exportCrop(image, crop);
    if (!blob) return setPickError("Your browser couldn't prepare the image.");
    const formData = new FormData();
    formData.set(
      "avatar",
      new File([blob], blob.type === "image/webp" ? "avatar.webp" : "avatar.jpg", { type: blob.type }),
    );
    startTransition(() => uploadAction(formData));
  };

  const error =
    pickError ??
    (uploadState.status === "error" ? uploadState.message : null) ??
    (removeState.status === "error" ? removeState.message : null);

  if (image) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <div
            role="group"
            aria-label="Crop your photo. Drag, or use the arrow keys, to move it. Use the slider to zoom."
            tabIndex={0}
            className="relative size-56 shrink-0 cursor-grab touch-none overflow-hidden rounded-xl border bg-surface-2 active:cursor-grabbing"
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              dragRef.current = { x: event.clientX, y: event.clientY };
            }}
            onPointerMove={(event) => {
              if (!dragRef.current) return;
              move(event.clientX - dragRef.current.x, event.clientY - dragRef.current.y);
              dragRef.current = { x: event.clientX, y: event.clientY };
            }}
            onPointerUp={() => (dragRef.current = null)}
            onPointerCancel={() => (dragRef.current = null)}
            onKeyDown={(event) => {
              const step = event.shiftKey ? 40 : 10;
              const moves: Record<string, [number, number]> = {
                ArrowLeft: [step, 0],
                ArrowRight: [-step, 0],
                ArrowUp: [0, step],
                ArrowDown: [0, -step],
              };
              const delta = moves[event.key];
              if (delta) {
                event.preventDefault();
                move(delta[0], delta[1]);
              }
            }}
          >
            <canvas ref={canvasRef} className="size-full" aria-hidden="true" />
            {/* Round guide: the avatar shows as a circle. */}
            <div
              className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_0_999px_rgb(10_11_16/0.55)] ring-2 ring-white/70"
              aria-hidden="true"
            />
          </div>
          <div className="w-full space-y-3">
            <label htmlFor="avatar-zoom" className="text-sm font-medium">
              Zoom
            </label>
            <Slider
              id="avatar-zoom"
              aria-label="Zoom"
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step={0.05}
              value={[crop.zoom]}
              onValueChange={([zoom]) => setCrop((current) => ({ ...current, zoom: zoom ?? 1 }))}
              className="py-2"
            />
            <p className="text-sm text-muted-foreground">Drag the photo to choose what shows in the circle.</p>
          </div>
        </div>
        {error ? <Notice tone="error" title={error} /> : null}
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={save} disabled={uploading}>
            {uploading ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
            {uploading ? "Saving…" : "Save photo"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => setImage(null)} disabled={uploading}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <UserAvatar
          username={username}
          displayName={displayName}
          avatarUrl={avatarUrl}
          className="size-20"
          fallbackClassName="text-2xl"
        />
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={() => inputRef.current?.click()}>
            <Camera aria-hidden="true" />
            {avatarUrl ? "Change photo" : "Add a photo"}
          </Button>
          {avatarUrl ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={removing}
              onClick={() => startTransition(() => removeAction())}
            >
              <Trash2 aria-hidden="true" />
              Remove
            </Button>
          ) : null}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/avif,image/heic"
        className="sr-only"
        tabIndex={-1}
        aria-label="Choose a profile photo"
        onChange={(event) => {
          pick(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      {error ? <Notice tone="error" title={error} /> : null}
    </div>
  );
}
