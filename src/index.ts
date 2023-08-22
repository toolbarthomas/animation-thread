import {
  AnimationStatus,
  AnimationThreadOptions,
  AnimationThreadProps,
  AnimationThreadResponse,
} from "./_types/main";

/**
 * Defines the default options when creating a new animation thread.
 */
export const defaults = {
  // Updates the running cycle during a throttle to end the animation at the
  // expected duration instead of the throttled version.
  strict: false,

  // Loops the trhead by default.
  limit: Infinity,

  // The default FPS value to use.
  fps: 30,

  // Rounding number for smooth values.
  decimal: 1000000,

  // Maximum offset multiplier of the defined interval.
  offset: 2,
};

/**
 * Converts the given FPS value to a valid timestamp integer.
 *
 * @param value The value to convert.
 */
export const fpsToInterval = (value: number) => {
  return 1000 / parseInt(String(value != null ? value : defaults.fps));
};

/**
 * Rounds the given number value to ensure correct animation smoothing.
 *
 * @param value The value the round.
 */
export const smooth = (value: number) => {
  return Math.round(value * defaults.decimal) / defaults.decimal;
};

/**
 * Assigns the defined handler within the requestAnimationFrame method that is
 * throttled to the defined FPS limit instead of each screen refresh.
 * A requested animation thread will loop by default and can be stopped within
 * the assigned handler property. A thread can also run for a certain amount if
 * the limit is a valid number.
 *
 * @param handler The handler to assign.
 * @param fps Call the assigned handler x times per second, cannot be higher
 * than the screen's refresh rate. (~60)
 * @param limit Loop the handler or run it for X amount of seconds.
 *
 * @returns Promise that will stop the animation thread when resolved.
 */
export function requestAnimationThread(
  handler: (props: AnimationThreadProps) => void,
  fps: number,
  options?: number | AnimationThreadOptions
) {
  // Defines the alternative FPS from a throttled thread.
  let currentFPS: number = fps;

  // Helper value to defined the actual FPS.
  let currentFrame = 0;

  // The interval in ms between each tick.
  let fpsInterval: number = fpsToInterval(fps);

  // Will increase within each requestAnimationFrame regardless of the max FPS.
  let frame = 0;

  // Hold the current requestAnimationFrame.
  let keyframe: number;

  // Defines the lag value between the current tick and previous tick, we start
  // with a negative interval value since the first frame is skipped while using
  // this function.
  let treshold = -fpsInterval;

  // Flag to update the index once the throttled method is called.
  let updateIndex = false;

  // Various tracking variables that is exposed within the defined handler.
  let maxFps = 0;
  let previousFPS: number = fps;
  let previousTimestamp: number = 0;
  let status: AnimationStatus = "clean";
  let tick = 0;
  let tock = 0;
  const { limit, strict } = {
    ...defaults,
    ...(options instanceof Object
      ? options || defaults
      : { limit: options || defaults.limit }),
  };

  // Times the runtime of the created thread.
  let start = 0;
  let end = 0;
  let actualTimestamp: number;
  const duration = limit * fps * fpsToInterval(fps);

  // Alias function to return the current FPS value.
  const _fps = () => parseInt(String(currentFPS)) || fps;

  // Alias function to return the current timestamp.
  const _now = () => window.performance.now() || Date.now();

  // Alias function to define the running index limit.
  const _limit = () => limit * _fps();

  // Idle callback that updates the properties before entering the new frame.
  const update: IdleRequestCallback = function () {
    actualTimestamp = _now();
    maxFps = 60 % currentFrame === 60 ? 60 : currentFrame;
    currentFrame = 0;
  };

  // Idle callback before the current frame is called.
  const accumulate: IdleRequestCallback = function (deadline) {
    currentFrame += 1;
  };

  // Throttles the current FPS & interval value from the valid number value.
  const throttle = (value: any) => {
    const interval = value ? fpsToInterval(value) : 0;

    requestAnimationFrame(() => {
      previousFPS = currentFPS;
      currentFPS = parseInt(value) || _fps();
      fpsInterval = interval;

      updateIndex = true;
    });

    return interval;
  };

  const request = new Promise<AnimationThreadResponse>((stop) => {
    const fn = (function (_: number, index?: number) {
      return function (timestamp: number) {
        frame += 1;
        const now = _now();

        if (typeof index === "undefined" || index > 0) {
          const elapsed = now - (previousTimestamp || start);
          const runtime = timestamp - actualTimestamp;

          if (runtime > fpsInterval * _fps()) {
            requestIdleCallback(update);
          }

          if (keyframe !== undefined) {
            cancelAnimationFrame(keyframe);
            keyframe = requestAnimationFrame(fn);
            requestIdleCallback(accumulate);
          }

          try {
            if (fpsInterval && elapsed > fpsInterval) {
              const actualFPS = 1000 / (now - previousTimestamp);

              // if (currentFPS !== actualFPS) {
              //   currentFPS = actualFPS;
              // }

              // if (currentFPS !== previousFPS) {
              //   updateIndex = true;
              // }

              // let multiplier = fps / _fps();
              const lag = elapsed - fpsInterval;
              const baseFps = status === "clean" ? actualFPS : currentFPS;
              const useFPS = maxFps >= baseFps ? baseFps : maxFps;
              const multiplier = 1 + lag / fpsInterval;

              // Stops a animation cycles longer than the expected limit.
              if (index !== undefined && now - start > duration) {
                index = 0;

                return;
              }

              treshold += elapsed;

              const fpsRatio = currentFPS / previousFPS;
              const last =
                index === Infinity ? false : tick >= (index || 0) * _fps();

              if (index !== undefined && strict) {
                const newIndex = index * fpsRatio;

                if (index !== newIndex && updateIndex) {
                  // Prevents an infinite index if the frame speed changes before
                  // updating the running index.
                  if (newIndex > _limit()) {
                    index = index;
                  } else {
                    index = newIndex;
                  }

                  updateIndex = false;
                }
              }

              // The animation is not clean since an extra frame is included
              // within the index.
              if (index !== undefined && index < 1) {
                status = "dirty";
              }

              const props = {
                actualFPS,
                elapsed,
                first: tick <= 0,
                frame,
                lag,
                last,
                multiplier,
                previousTimestamp,
                status,
                stop,
                treshold,
                tick,
                timestamp: now,
                tock,
              };

              handler(props);

              // Update the tracking variables to the current frame.
              previousTimestamp = now;
              tock = Math.round(tick / _fps());
              treshold -= fpsInterval;

              // Updates the running index for an animation cycle.
              if (index !== undefined && index >= 1) {
                index -= 1;
              } else if (index !== Infinity) {
                index = 0;
              }

              // Update the tick relative to the current time.
              if (
                multiplier < defaults.offset &&
                lag < fpsInterval * defaults.offset
              ) {
                tick += 1;
              } else {
                tick += Math.round(multiplier);
              }

              // Ensure the last frame is rendered correctly since we use
              // floating ratio values.
              if (index !== undefined && duration - elapsed < _now() - start) {
                status = "dirty";
                index = 1;
              }
            }
          } catch (exception) {
            if (exception) {
              if (index !== undefined) {
                index = 0;
              }

              console && console.error(exception);
            }
          }

          end = _now();
        } else {
          // We use the timestamp instead of _now to ensure we end before
          // a next requestAnimationFrame request.
          end = _now();

          stop({
            frame,
            fps: _fps(),
            multiplier: currentFPS / fps, // Will be relative to the final running FPS value.
            end,
            first: tick <= 0,
            index,
            treshold,
            last: true,
            previousTimestamp,
            start,
            status,
            tick,
            timestamp: now,
            tock,
          });
        }
      };
    })(_fps(), isNaN(limit) ? Infinity : _limit());

    if (!start && !previousTimestamp) {
      start = _now();
    }

    actualTimestamp = start;

    keyframe = requestAnimationFrame(fn);
  });

  request.then((r) => console.log("Result:", r, start, end));

  // Stop the thread when done.
  request.finally(function () {
    // Unref the initial thread since we cannot restore it anymore at this point.
    // Keep in mind that
    Object.keys(thread).forEach((key) => {
      delete (thread as any)[key];
    });

    keyframe && cancelAnimationFrame(keyframe);
  });

  // Defines the actual interface to control the created thread.
  // The thread should be removed
  const thread = {
    // Returns the running FPS value.
    fps: () => (fpsInterval ? currentFPS : 0),

    // Returns the running FPS interval value.
    interval: () => fpsInterval,

    // Pause the running thread and prevent any calls to the defined handler.
    pause: () => throttle(0),

    // The defined behavior for the animation cycle.
    strict,

    // The initial Promise Object that should control the animation context.
    request,

    // Restores to the initial defined FPS value.
    restore: () => throttle(fps),

    // Resumes the current thread to the previous throttled value or the
    // initial FPS value prop.
    resume: (value?: number) =>
      throttle(value || (currentFPS != null ? currentFPS : fps)),

    // Throttles the running thread.
    throttle,
  };

  return thread;
}
