import {
  AnimationThreadOptions,
  AnimationThreadProps,
  AnimationThreadResponse,
} from "./_types/main";

/**
 * Defines the default options when creating a new animation thread.
 */
export const defaults: AnimationThreadOptions = {
  limit: Infinity,
};

/**
 * Converts the given FPS value to a valid timestamp integer.
 *
 * @param value The value to convert.
 */
export const defineFPSInterval = (value: number) =>
  1000 / (parseInt(String(value)) || 30);

/**
 * Assigns the defined handler within the requestAnimationFrame method that is
 * throttled to the defined FPS limit instead of each screen refresh.
 * A requested animation thread will loop by default and can be stopped within
 * the assigned handler property. A thread can also run for a certain amount if
 * the limit is a valid interger.
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
  let fpsInterval: number = defineFPSInterval(fps);
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

  const thread = new Promise<AnimationThreadResponse>((stop) => {
    // i = interval, l = limit
    const fn = (function (i: number, l?: number) {
      return function (timestamp: number) {
        if (typeof l === "undefined" || l > 0) {
          keyframe !== undefined && cancelAnimationFrame(keyframe);
          keyframe = requestAnimationFrame(fn);

          const elapsed = timestamp - previousTimestamp;

          try {
            if (elapsed > fpsInterval) {
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
    })(fps, isNaN(limit) ? Infinity : limit * fps);

    keyframe = requestAnimationFrame(fn);
  });

  const throttle = (value: number) =>
    (fpsInterval = defineFPSInterval(value || fps));

  // Stop the thread when done.
  thread.finally(function () {
    keyframe && cancelAnimationFrame(keyframe);
  });

  return { thread, throttle };
}
