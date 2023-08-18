import {
  AnimationThreadOptions,
  AnimationThreadProps,
  AnimationThreadResponse,
} from "./_types/main";

/**
 * Defines the default options when creating a new animation thread.
 */
export const defaults = {
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
  let previousTimestamp: number = performance.now() || Date.now();
  let keyframe: any;
  let tick = 0;
  let tock = 0;
  const { limit } = {
    ...defaults,
    ...(options instanceof Object
      ? options || defaults
      : { limit: options || defaults.limit }),
  };

  const _fps = () => parseInt(String(fpsCache)) || fps;

  const request = new Promise<AnimationThreadResponse>((stop) => {
    // i = interval, l = limit
    const fn = (function (i: number, l?: number) {
      return function (timestamp: number) {
        if (typeof l === "undefined" || l > 0) {
          keyframe !== undefined && cancelAnimationFrame(keyframe);
          keyframe = requestAnimationFrame(fn);

          const elapsed = timestamp - (previousTimestamp || 0);

          // if (fpsInterval && !elapsed) {
          //   elapsed = timestamp - fpsInterval;
          // }

          try {
            if (fpsInterval && elapsed > fpsInterval) {
              handler({
                first: tick <= 0,
                last: tick >= limit,
                previousTimestamp,
                stop,
                tick,
                timestamp,
                tock,
              });

              l && l--;
              tick += 1;
              tock = Math.round(tick / fps);
              previousTimestamp = timestamp - (elapsed % fpsInterval);
            }
          } catch (exception) {
            if (exception) {
              l = 0;
              console && console.error(exception);
            }
          }
        } else {
          stop({
            first: tick <= 0,
            last: true,
            previousTimestamp,
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

  // Stop the thread when done.
  request.finally(function () {
    // Unref the initial thread since we cannot restore it anymore at this point.
    // Keep in mind that
    Object.keys(thread).forEach((key) => {
      delete thread[key];
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
