/**
 * Square-crop maths for the avatar editor. `zoom` 1 shows the largest square that fits; higher
 * zoom shows a smaller part. `panX`/`panY` run from -1 (left/top edge) to 1 (right/bottom edge)
 * of the room the zoom leaves. Pure and unit-tested.
 */
export const MIN_ZOOM = 1;
export const MAX_ZOOM = 4;

export type CropState = { zoom: number; panX: number; panY: number };
export type CropRect = { sx: number; sy: number; size: number };

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export function clampCrop(state: CropState): CropState {
  return {
    zoom: clamp(Number.isFinite(state.zoom) ? state.zoom : 1, MIN_ZOOM, MAX_ZOOM),
    panX: clamp(Number.isFinite(state.panX) ? state.panX : 0, -1, 1),
    panY: clamp(Number.isFinite(state.panY) ? state.panY : 0, -1, 1),
  };
}

/** The source square to draw for an image of `width` × `height`. */
export function cropRect(width: number, height: number, state: CropState): CropRect {
  const { zoom, panX, panY } = clampCrop(state);
  const size = Math.min(width, height) / zoom;
  const roomX = (width - size) / 2;
  const roomY = (height - size) / 2;
  return { sx: roomX + panX * roomX, sy: roomY + panY * roomY, size };
}

/**
 * Moves the crop by a drag of (dx, dy) screen pixels in a preview `previewSize` pixels wide.
 * Dragging right shows more of the left side, like moving a photo under a frame.
 */
export function panBy(
  width: number,
  height: number,
  state: CropState,
  dx: number,
  dy: number,
  previewSize: number,
): CropState {
  const { size } = cropRect(width, height, state);
  const scale = size / previewSize; // source pixels per preview pixel
  const roomX = (width - size) / 2;
  const roomY = (height - size) / 2;
  return clampCrop({
    zoom: state.zoom,
    panX: roomX > 0 ? state.panX - (dx * scale) / roomX : 0,
    panY: roomY > 0 ? state.panY - (dy * scale) / roomY : 0,
  });
}
