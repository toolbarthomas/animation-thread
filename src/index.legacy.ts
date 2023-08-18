import { requestAnimationThread } from "src";

//@ts-ignore
if (!window.requestAnimationThread) {
  //@ts-ignore
  window.requestAnimationThread = requestAnimationThread;
}
