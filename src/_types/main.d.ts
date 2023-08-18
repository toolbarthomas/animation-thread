/**
 * Exposed properties that is assigned within the AnimationHandler context.
 */
export type AnimationThreadProps = {
  // TRUE when the first handler is called.
  first: boolean;

  // TRUE when the last handler is called.
  last: boolean;

  // The dynamic timestamp of the previous tick based of the running FPS.
  previousTimestamp: number;

  // Stops the created/running animation thread.
  stop: any;

  // The current frame iteration within the defined loop/cycle.
  tick: number;

  // The current animation frame timestamp.
  timestamp: number;

  // Rounded value of the relative FPS value
  tock: number;
};

/**
 * Optional options to use when creating a new animation thread.
 */
export type AnimationThreadOptions = {
  // The maximum amount of tocks to run.
  limit: number;

  // Make the limit value relative in order to use the initial defined tock limit.
  relative?: boolean;
};

/**
 * Expected Promise result for the created AnimationThread.
 */
export type AnimationThreadResponse = {
  first: AnimationThreadProps["first"];
  last: AnimationThreadProps["last"];
  previousTimestamp: AnimationThreadProps["previousTimestamp"];
  tick: AnimationThreadProps["tick"];
  timestamp: AnimationThreadProps["timestamp"];
  tock: AnimationThreadProps["tock"];
};
