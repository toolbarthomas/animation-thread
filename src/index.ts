import {
  AnimationStatus,
  AnimationFrame,
  AnimationThreadOptions,
  AnimationThreadProps as _AnimationThreadProps,
  AnimationThreadResponse,
} from "./_types/main";

import { requestInterval } from "./mixins/requestInterval";

// Reference of the exposed properties for the defined handler animation thread
// handler.
export type AnimationThreadProps = _AnimationThreadProps;

/**
 * Defines the default options when creating a new animation thread.
 */
export const defaults = {
  // Rounding number for smooth values.
  decimal: 1000000,

  // The default FPS value to use.
  fps: 30,

  // Loops the trhead by default.
  limit: Infinity,

  // Maximum offset multiplier of the defined interval.
  offset: 2,

  // Plays the defined thread within the given speed multiplier.
  speed: 1,

  // Does not call the fallback logic by default.
  status: "clean" as AnimationStatus,

  // Updates the running cycle during a throttle to end the animation at the
  // expected duration instead of the throttled version.
  strict: false,

  // Use the window.performance instead when available.
  highResolution: false,
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
  let treshold = 0;

  // Flag to update the index once the throttled method is called.
  let updateIndex = false;

  // Various tracking variables that is exposed within the defined handler.
  let maxFps = 0;
  let previousFPS: number = fps;
  let previousTimestamp: number = 0;
  let status: AnimationStatus = defaults.status;
  let tick = 0;
  let tock = 0;
  let timeline: AnimationFrame[] = [];
  let interval: ReturnType<typeof requestInterval>;
  const { onFallback, onUpdate, highResolution, limit, speed, strict } = {
    ...defaults,
    ...(options instanceof Object
      ? options || defaults
      : { limit: options || defaults.limit }),
  };

  // Track the runtime of the created thread.
  let start = 0;
  let end = 0;
  let actualTimestamp: number;
  let currentSpeed = isNaN(parseFloat(speed as any)) ? defaults.speed : speed;
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

    if (timeline.length > fps) {
      timeline = timeline.slice(1).slice(-Math.abs(fps));
    }

    // Call the optional update handler outside the handler context
    if (typeof onUpdate === "function") {
      onUpdate({
        tick,
        tock,
        previousFPS,
        previousTimestamp,
        timestamp: _now(),
        treshold,
        stop,
      });
    }
  };

  // Idle callback before the current frame is called.
  const accumulate: IdleRequestCallback = function (deadline) {
    currentFrame += 1;

    interval && interval.stop && interval.stop();

    // Call the optional fallback handler that will run during a unactuve
    // tab.
    if (typeof onFallback === "function") {
      interval = requestInterval(() => {
        onFallback({
          tick,
          tock,
          previousFPS,
          previousTimestamp,
          timestamp: _now(),
          treshold,
          stop,
        });
      }, 1000);
    }
  };

  // Throttles the current FPS & interval value from the valid number value.
  const throttle = (value: any) => {
    interval && interval.stop && interval.stop();

    const result = value ? fpsToInterval(value) : 0;

    requestAnimationFrame(() => {
      previousFPS = currentFPS;
      currentFPS = parseInt(value) || _fps();
      fpsInterval = result;

      updateIndex = true;
    });

    return result;
  };

  const request = new Promise<AnimationThreadResponse>((stop) => {
    const fn = (function (_: number, index?: number) {
      return function (timestamp: number) {
        frame += 1;

        // Pick the initial frame timestamp or use the actual timestamp format.
        const now = highResolution ? _now() : timestamp;

        if (typeof index === "undefined" || index > 0) {
          const delta = now - (previousTimestamp || start);
          const runtime = now - actualTimestamp;

          if (runtime > fpsInterval * _fps()) {
            requestIdleCallback(update);
          }

          if (keyframe !== undefined) {
            cancelAnimationFrame(keyframe);
            keyframe = requestAnimationFrame(fn);
            requestIdleCallback(accumulate);
          }

          if (currentSpeed === 0) {
            return;
          }

          try {
            if (fpsInterval && delta > fpsInterval) {
              const actualFPS = Math.round(
                1000 / (timestamp - previousTimestamp)
              );

              // if (currentFPS !== actualFPS) {
              //   currentFPS = actualFPS;
              // }

              // if (currentFPS !== previousFPS) {
              //   updateIndex = true;
              // }

              // let multiplier = fps / _fps();
              const lag = delta - fpsInterval;
              const baseFps =
                status === defaults.status ? actualFPS : currentFPS;
              const useFPS = maxFps >= baseFps ? baseFps : maxFps;

              const ratio = 1 + lag / fpsInterval;
              const multiplier = strict
                ? ratio * (fpsInterval / fpsToInterval(fps)) * currentSpeed
                : ratio * currentSpeed;

              // Stops a animation cycles longer than the expected limit.
              if (index !== undefined && now - start > duration) {
                index = 0;

                return;
              }

              treshold += delta;

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

              // Update the tick relative to the current time.
              if (
                multiplier < defaults.offset &&
                lag < fpsInterval * defaults.offset
              ) {
                tick += 1;

                if (index === undefined) {
                  status = defaults.status;
                }
              } else {
                tick += Math.round(multiplier);

                if (index === undefined) {
                  status = "dirty";
                }
              }

              if (actualFPS !== currentFPS) {
                status = "dirty";
              } else {
                status = defaults.status;
              }

              timeline.push({
                fps: actualFPS,
                lag,
                multiplier: this.smooth(multiplier),
                multiplierHighres: multiplier,
                speed: currentSpeed,
                timestamp: now,
              });

              const props = {
                delta,
                elapsed: now - start,
                first: tick <= 1,
                fps: actualFPS,
                frame,
                lag,
                last,
                multiplier: this.smooth(multiplier),
                multiplierHighres: multiplier,
                previousTimestamp,
                speed: currentSpeed,
                status,
                stop,
                targetFPS: _fps(),
                tick,
                timestamp: now,
                tock,
                treshold,
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

              // Ensure the last frame is rendered correctly since we use
              // floating ratio values.
              if (index !== undefined && duration - delta < _now() - start) {
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
    interval && interval.stop && interval.stop();

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
    accelerate: (value?: any) => {
      currentSpeed = isNaN(parseFloat(value)) ? defaults.speed : value;

      return currentSpeed;
    },

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
    resume: (value?: any) =>
      throttle(isNaN(parseInt(value)) ? value : previousFPS || fps),

    // Throttles the running thread.
    throttle,
  };

  return thread;
}

/**
 * Alias the expected response type within the package root to a semantic name.
 */
export type AnimationThread = ReturnType<typeof requestAnimationThread>;
