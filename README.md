**Note: ** Package has not yet been published and the documentation is not yet final.

# Animation Thread

Animation Thread is a small `requestAnimationFrame` wrapper with configurable FPS and optional lifecycle.

## Technical

The default [window.requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame) interface is very limited and you need to implement your own logic to call the context within a custom FPS cycle; instead of the default screen's refresh rate.

This utility provides a simple interface to setup a new `requestAnimationFrame` with the mentioned features. The defined handler parameter will be called within the running FPS cycle as an endless loop, but you can also run the thread for a custom duration that will cleanup afterwards.

With this module you can also control the playback during the running animation, e.g. `pause`, `resume` and adjust the running FPS.

**Note:** Keep in mind that the actual interface is destroyed if the thread is not running in a loop and has already ended.

## Installation

```shell
$ npm install @toolbarthomas/animation-thread

```

## Setup

Animation Thread is a module that should be used within the Browser. Valid CommonJS and Ecmascript modules are available within this package and you can also use the package within your [Typescript](https://www.typescriptlang.org/) project.

#### ESM Module (modern Browsers)
```ts
import { requestAnimationThread } from "@toolbarthomas/animation-thread/dist/index.js"

```

#### Typescript
```ts
import { requestAnimationThread } from "@toolbarthomas/animation-thread"

```

#### CommonJS Module
```ts
import { requestAnimationThread } from "@toolbarthomas/animation-thread/dist/index.cjs"

```

#### Legacy Browser (not recommended)
```html
<script src="@toolbarthomas/animation-thread/dist/legacy.js"></script>
<!-- Exposes the module to the window Object instead. This method is not recommended! -->
<script>requestAnimationThread(...)</script>

```

**Note:** Keep in mind that the behaviour of this module can currently give unexpected results when using outside the browser context. A setInterval fallback could be implemented within the future.

## Usage

```js
...
requestAnimationFrame(() => {...}, 10) // Loop @10FPS
requestAnimationFrame(() => {...}, 20, 5) // Loop @20FPS for 5 seconds.

const thread = requestAnimationFrame(() => {...}, 30); // See 'Readme Interface' section regarding the instance API.

```

The assigned handler will be called directly with the defined properties, keep in mind that the defined FPS will not run higher than your device's screen refresh rate.

## Thread API

You can optionally control the playback of the running animation thread by using the following methods:

| Name       | Parameters | Description                                                                       |
| ---------- | ---------- | --------------------------------------------------------------------------------- |
| fps()      | -          | Returns the defined FPS of the running thread.                                    |
| interval() | -          | Returns the defined FPS interval value of the running thread.                     |
| pause()    | -          | Set the FPS to 0 and stop any animation of the running thread.                    |
| request    | -          | The intial Promise Object that will close & cleanup the initial animation thread. |
| restore()  | -          | Restores to the initial defined FPS value.                                        |
| resume()   | ?number    | Resumes to the given FPS value or use the intial defined FPS.                     |
| throttle() | number     | Updates the running FPS and FPS interval value of the running thread.             |

## Handler API

The actual handler will be defined within a new Promise Object that can close the created animation thread and has the current timestamp context to use within the current cycle:

```js
requestAnimationThread((props) => {
  ...
  // Close the loop, see the table below for all the available properties:
  props.stop();
})

```

| Property          | Type     | Description                                                          |
| ----------------- | -------- | -------------------------------------------------------------------- |
| first             | boolean  | Indicates if the handler is running as the first frame.              |
| last              | boolean  | Indicates if the handler is running as the last frame.               |
| previousTimestamp | number   | The timestamp of the previous called frame.                          |
| stop              | function | Resolves the created Promise and closes the animation thread.        |
| timestamp         | number   | The timestamp from the running requestAnimationFrame context.        |
| tick              | number   | The context a handler is called for each frame within a single tock. |
| tock              | number   | The iteration value in seconds.                                      |

## Typescript support

Type definitions for the module are defined within the main src: `@toolbarthomas/animation-thread/src/_types/main.d.ts`

## Why?

I needed an efficient way to call some logic multiple times within a certain amount of time in another project. I was inspired by the alternative setInterval method from [The Code Ship](https://www.thecodeship.com/web-development/alternative-to-javascript-evil-setinterval/) and created an extended version that uses the mentioned `requestAnimationFrame` instead.

This is not a complete solution for animation and I originally did not created it for that purpose. The logic was initially used in order to efficiently run some logic during a runnig video stream from the Device Camera / WebCam.

### Credtis to...

[The Code Ship](https://www.thecodeship.com) for the alternative [setInterval](https://www.thecodeship.com) implementation.

### Licence

Software: [MIT](./LICENSE)
