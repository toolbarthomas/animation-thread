/**
 * Meta information of a single frame.
 */
export type AnimationFrame = {
  fps: AnimationThreadProps["fps"];
  lag: AnimationThreadProps["lag"];
  multiplier: AnimationThreadProps["multiplier"];
  speed: AnimationThreadProps["speed"];
  timestamp: AnimationThreadProps["timestamp"];
};

/**
 * Expected result values for an animation thread.
 */
export type AnimationStatus = "clean" | "dirty";

/**
 * Exposed properties that is assigned within the AnimationHandler context.
 */
export type AnimationThreadProps = {
  // The delta value between the current frame timestamp and previous frame
  // timestamp.
  delta: number;

  // The current elapsed time since the usage of the requestAnimationThread.
  elapsed: number;

  // TRUE when the first handler is called.
  first: boolean;

  // The actual fps that is used within the current frame handler.
  fps: number;

  // The current frame according to the actual Device FPS.
  frame: number;

  // Optional context value to resolve any timing issues after a throttle.
  lag: number;

  // TRUE when the last handler is called.
  last: boolean;

  // Defines the ratio of the current FPS compared to the initial defined
  // FPS value.
  multiplier: number;

  // The dynamic timestamp of the previous tick based of the running FPS.
  previousTimestamp: number;

  // The current speed the thread is running.
  speed: number;

  // The current frame status.
  status: string;

  // Stops the created/running animation thread.
  stop: any;

  // The desired FPS of the running thread.
  targetFPS: number;

  // The current frame iteration within the defined loop/cycle.
  tick: number;

  // The current animation frame timestamp.
  timestamp: number;

  // Rounded value of the relative FPS value
  tock: number;

  // The total ellapsed lag duration since the start of the animation but does
  // not track any adjustments during a sleeping thread.
  treshold: number;
};

export type HandlerProps = {
  previousTimestamp: AnimationThreadProps["previousTimestamp"];
  previousFPS: AnimationThreadProps["fps"];
  timestamp: AnimationThreadProps["timestamp"];
  stop: AnimationThreadProps["stop"];
  treshold: AnimationThreadProps["treshold"];
  tick: AnimationThreadProps["tick"];
  tock: AnimationThreadProps["tick"];
};

/**
 * Optional options to use when creating a new animation thread.
 */
export type AnimationThreadOptions = {
  // Use performance.now() instead of the current timestamp.
  highResolution?: boolean;

  // The maximum amount of tocks to run.
  limit?: number;

  // Optional idle callback when the thread is sleeping.
  onFallback?: (props: HandlerProps) => void;

  // Optional idle callback during a regular tock.
  onUpdate?: (props: HandlerProps) => void;

  // Plays the thread in the defined speed, can be updated within the thread
  // response Object.
  speed?: AnimationThreadProps["speed"];

  // Make the limit value relative in order to use the initial defined tock limit.
  strict?: boolean;
};

/**
 * Expected Promise result for the created AnimationThread.
 */
export type AnimationThreadResponse = {
  end: number;
  first: AnimationThreadProps["first"];
  fps: AnimationThreadProps["targetFPS"];
  frame: AnimationThreadProps["frame"];
  index: number;
  last: AnimationThreadProps["last"];
  multiplier: AnimationThreadProps["multiplier"];
  previousTimestamp: AnimationThreadProps["previousTimestamp"];
  start: number;
  status: AnimationStatus;
  tick: AnimationThreadProps["tick"];
  timestamp: AnimationThreadProps["timestamp"];
  tock: AnimationThreadProps["tock"];
  treshold: number;
};
