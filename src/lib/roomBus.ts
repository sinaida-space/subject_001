/** The Statement room's scroll state, shared by its text (StatementRoom) and
 * its 3D scene (StatementScene).
 *
 * `beat` is story time, from 0 (the title) to `beats` (the scatter): it rests
 * on each whole number while that beat holds, then moves to the next. `raw` is
 * the scroll itself in beats, which keeps running through a hold (the synapse
 * uses it, so its signal crosses while the reader scrolls through the pause).
 * `tiles` is where the cases stand, in CSS pixels, so the scene can draw them
 * in points first. */
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const roomBus = {
  beat: 0,
  raw: 0,
  beats: 1,
  visible: false,
  ready: false,
  tiles: [] as Box[],
  /** the reader's own turn of the world, by mouse or touch: yaw and pitch, radians */
  dragYaw: 0,
  dragPitch: 0,
  /** the closing paragraph's lower edge on screen, CSS px, so the circuit fits under it */
  textBottom: 0,
  /** where the star title's top stands at scroll 0, in CSS px */
  titleY: 0,
  listeners: new Set<() => void>(),
  emit() {
    this.listeners.forEach((l) => l());
  },
};

// Je suis le spectre d'une rose que tu portais hier au bal.
