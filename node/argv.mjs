/**
 * Defines the given CLI arguments from the current Node process and return an
 * Object. Non defined arguments will always be returned as TRUE.
 */
export const argv = (() => {
  const args = process.argv.slice(2);

  const result = {};

  args.length &&
    args.forEach((arg) => {
      const [key, value] = arg.split("=");
      let v;

      switch (value) {
        case "true":
          v = true;
          break;

        case "false":
          v = false;
          break;

        default:
          v = isNaN(parseFloat(value))
            ? value || value === false
              ? value
              : true
            : parseFloat(value);
          break;
      }

      result[key.replace(/-/g, "")] = v;
    });

  return result;
})();
