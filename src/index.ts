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
  let maxFps = 0;
  let currentFPS: number = fps;
  let previousFPS: number = fps;
  let fpsInterval: number = fpsToInterval(fps);
  let previousTimestamp: number = 0;
  let keyframe: number;
  let frame = 0;
  let tick = 0;
  let tock = 0;
  let lag = 0;
  let updateIndex = false;
  let processed = 0;
  let status = "clean";
  const { limit, strict } = {
    ...defaults,
    ...(options instanceof Object
      ? options || defaults
      : { limit: options || defaults.limit }),
  };

  // Alias function to return the current FPS value.
  const _fps = () => parseInt(String(currentFPS)) || fps;

  // Alias function to return the current timestamp.
  const _now = () => window.performance.now() || Date.now();

  // Alias function to define the running index limit.
  const _limit = () => limit * _fps();

  // Idle callback that updates the properties before entering the new frame.
  const update: IdleRequestCallback = function () {
    averageTimestamp = _now();
    maxFps = 60 % frame === 60 ? 60 : frame;
    frame = 0;
  };

  // Idle callback before the current frame is called.
  const accumulate: IdleRequestCallback = function (deadline) {
    frame += 1;
  };

  // Times the runtime of the created thread.
  let start = 0;
  let end = 0;
  let averageTimestamp: number;

  const request = new Promise<AnimationThreadResponse>((stop) => {
    const fn = (function (_: number, index?: number) {
      return function (timestamp: number) {
        if (typeof index === "undefined" || index > 0) {
          // Start the timer on the first frame since the requested frame
          // can start later.
          const now = _now();
          const multiplier = fps / _fps();

          const elapsed = now - (previousTimestamp || start);
          const runtime = timestamp - averageTimestamp;

          if (runtime > fpsInterval * _fps()) {
            requestIdleCallback(update);
          }

          if (keyframe !== undefined) {
            cancelAnimationFrame(keyframe);
            keyframe = requestAnimationFrame(fn);

            // Keep track of the running FPS of the Device.
            requestIdleCallback(accumulate);
          }

          try {
            if (fpsInterval && elapsed > fpsInterval) {
              lag += elapsed * multiplier;

              const props = {
                first: tick <= 0,
                lag,
                last:
                  index === Infinity ? false : tick >= (index || 0) * _fps(),
                multiplier,
                previousTimestamp,
                stop,
                tick,
                timestamp,
                tock,
              };

              handler(props);

              tick += 1;
              tock = Math.round(tick / _fps());
              lag -= fpsInterval * multiplier;

              // Updates the running index during strict mode in order to
              // stop the animation within the expected limit.
              if (index !== undefined && strict) {
                const fpsRatio = currentFPS / previousFPS;
                const updatedIndex = index * fpsRatio;

                updateIndex && console.log("To", currentFPS);

                if (index !== updatedIndex && updateIndex) {
                  // Prevents an infinite index if the frame speed changes before
                  // updating the running index.
                  if (updatedIndex > _limit()) {
                    index = index;
                  } else {
                    index = updatedIndex;
                  }

                  updateIndex = false;
                }
              }

              if (index !== undefined && index < 1) {
                status = "dirty";
              }

              if (index !== undefined && index >= 1) {
                index -= 1;
              } else if (index !== Infinity) {
                index = 0;
              }

              processed += 1;

              previousTimestamp = now;

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
            average: currentFPS / fps, // Will be relative to the final running FPS value.
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
    })(_fps(), isNaN(limit) ? Infinity : _limit());

    if (!start && !previousTimestamp) {
      start = _now();
    }

    averageTimestamp = start;

    keyframe = requestAnimationFrame(fn);
  });

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

    // The defined behavior for the animation thread.
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
