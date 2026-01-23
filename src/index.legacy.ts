import { requestAnimationThread } from "src";

const ref = globalThis as any;

if (!ref.requestAnimationThread) {
  ref.requestAnimationThread = requestAnimationThread;
}
