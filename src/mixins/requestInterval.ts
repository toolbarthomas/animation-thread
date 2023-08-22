/**
 * Alternative implementation for the setInterval function, since the default
 * handler will call the interval handlers out of order and can hold up the main
 * process;
 *
 * @param handler The defined Function handler to use within the interval.
 * @param duration The interval duration used within setTimeout handlers.
 * @param limit Optional limit to use for the interval to prevent the endless
 * loop.
 */
export function requestInterval(
  handler: () => void,
  duration = 0,
  limit = Infinity
) {
  let timer: number;

  const fn = (function (w: number, t?: number) {
    return function () {
      if (typeof t === "undefined" || t-- > 0) {
        timer && clearTimeout(timer);
        timer = setTimeout(fn, w);

        try {
          handler.call(null);
        } catch (exception) {
          if (exception) {
            t = 0;
            console.error(exception);
          }
        }
      }
    };
  })(duration, limit);

  timer = setTimeout(fn, duration);

  return { timer, stop: () => timer !== undefined && clearTimeout(timer) };
}
