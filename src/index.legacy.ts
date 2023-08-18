import { requestAnimationThread } from "src";

if (!window.requestAnimationThread) {
  window.requestAnimationThread = requestAnimationThread;
}
