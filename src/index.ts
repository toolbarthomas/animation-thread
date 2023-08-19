import {
  AnimationThreadOptions,
  AnimationThreadProps,
  AnimationThreadResponse,
} from "./_types/main";

/**
 * Defines the default options when creating a new animation thread.
 */
export const defaults = {
  strict: false,
  limit: Infinity,
  fps: 30,
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
  let fpsCache: number = fps;
  let fpsInterval: number = fpsToInterval(fps);
  let previousTimestamp: number = 0;
  let keyframe: any;
  let tick = 0;
  let tock = 0;
  let lag = 0;
  let offset = 0;
  let processed = 0;
  const { limit, strict } = {
    ...defaults,
    ...(options instanceof Object
      ? options || defaults
      : { limit: options || defaults.limit }),
  };

  const _fps = () => parseInt(String(fpsCache)) || fps;
  const _now = () => window.performance.now() || Date.now();

  // Times the runtime of the created thread.
  let start = 0;
  let end = 0;

  const request = new Promise<AnimationThreadResponse>((stop) => {
    const fn = (function (_: number, index?: number) {
      return function (timestamp: number) {
        if (typeof index === "undefined" || index > 0) {
          // Prevents unwanted loops for throttled animation threads.
          // if (strict && fps !== _fps() && index < limit * fps) {
          //   console.log("this", index, limit * fps);
          //   index = 0;
          // }

          if (keyframe !== undefined) {
            cancelAnimationFrame(keyframe);
            keyframe = requestAnimationFrame(fn);
          }

          // Start the timer on the first frame since the requested frame
          // can start later.
          const now = _now();
          const ratio = fps / fpsCache;

          const elapsed = now - (previousTimestamp || 0);

          if (!start && !previousTimestamp) {
            start = _now();
          }

          try {
            if (fpsInterval && elapsed > fpsInterval) {
              offset = elapsed % fpsInterval;
              lag += elapsed * ratio;

              const multiplier = (1 + offset / fpsInterval) * ratio;

              const props = {
                first: tick <= 0,
                lag,
                last:
                  index === Infinity ? false : tick >= (index || 0) * _fps(),
                multiplier: fps / _fps(),
                previousTimestamp,
                stop,
                tick,
                timestamp,
                tock,
              };

              // console.log("Handle", props);

              handler(props);

              tick += 1;
              tock = Math.round(tick / _fps());
              previousTimestamp = now - offset;
              lag -= fpsInterval * ratio;

              if (lag && lag > fpsInterval * ratio) {
                // Adjusts the index length while in strict mode, this ensures
                // the animation is stopped around the defined multipler
                // timeline. Keep in mind that some timeshifting is present
                // when the animation is resolved in strict mode.
                if (
                  strict &&
                  lag >= fpsInterval * ratio &&
                  ratio % multiplier != 1 &&
                  index !== undefined
                ) {
                  const value = (lag / fpsInterval) * ratio;
                  index -= Math.ceil(value);
                }

                // Reset the index to stop the current cycle since all relative
                // frames should be rendered for the running thread;
                // Secondary failsafe to stop the thread when the moment is
                // already within the past.
                // if (strict && fps !== _fps() && fps * limit < processed) {
                //   index = 0;
                // }

                lag = 0;
              }

              // Adjust the estimated tock value when running in strict mode.
              // This adjusts the runtime of the current thread with a defined
              // limit. The defined multiplier will be used to add or subtract
              // any pending/new frames.
              //@TODO decide if strict boolean statements should be reversed. current = TRUE
              if (strict && index !== undefined) {
                if (
                  multiplier < 1 ||
                  multiplier >= 2 ||
                  elapsed >= fpsInterval * 2
                ) {
                  const treshold = Math.round(
                    elapsed / (fpsInterval * multiplier) || 1
                  );

                  if (multiplier >= 2) {
                    // console.log(
                    //   "adjust",
                    //   _fps(),
                    //   treshold * (fps / _fps()),
                    //   index,
                    //   index - treshold,
                    //   limit * fps
                    // );
                    index -= treshold * (fps / _fps());
                    // @hiero
                    console.log(tick, index, limit * fps);
                  } else {
                    // Should stop faster in time with the relative time.
                    index -= fps / _fps();
                    if (index <= 0 && tick < limit * _fps()) {
                      index = fps / _fps();
                    }
                  }
                } else if (index) {
                  index -= 1;
                }
              } else if (index) {
                index -= 1;
              }

              // if (index > 460) {
              //   console.log("foo", lag, multiplier);
              //   index = 0;
              // }

              processed += 1;

              // We use the timestamp instead of _now to ensure we end before
              // a next requestAnimationFrame request.
              end = _now();
            }
          } catch (exception) {
            if (exception) {
              index = 0;
              console && console.error(exception);
            }
          }
        } else {
          stop({
            average: fpsCache / fps, // Will be relative to the final running FPS value.
            duration: end - start,
            first: tick <= 0,
            index,
            lag,
            last: true,
            previousTimestamp,
            processed,
            tick,
            timestamp,
            tock,
          });
        }
      };
    })(_fps(), isNaN(limit) ? Infinity : limit * _fps());

    keyframe = requestAnimationFrame(fn);
  });

  // Throttles the current FPS & interval value from the valid number value.
  const throttle = (value: any) => {
    fpsCache = parseInt(value) || _fps();
    fpsInterval = value ? fpsToInterval(value) : 0;

    return fpsInterval;
  };

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
    fps: () => (fpsInterval ? fpsCache : 0),

    // Returns the running FPS interval value.
    interval: () => fpsInterval,

    // Pause the running thread and prevent any calls to the defined handler.
    pause: () => throttle(0),

    // The defined behavior for the animation thread.
    strict,

    // The initial Promise Object that should control the animation context.
    request,

    // Restores to the initial defined FPS value.
    restore: () => throttle(fps),

    // Resumes the current thread to the previous throttled value or the
    // initial FPS value prop.
    resume: (value?: number) =>
      throttle(value || (fpsCache != null ? fpsCache : fps)),

    // Throttles the running thread.
    throttle,
  };

  return thread;
}
