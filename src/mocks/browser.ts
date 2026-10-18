import { setupWorker } from "msw/browser";
import { handlers } from "./handlers";

const worker = setupWorker(...handlers);
let starting: Promise<unknown> | undefined;

export function startMockApi() {
  starting ??= worker
    .start({
      serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
      onUnhandledRequest: "bypass",
    })
    .catch((error) => {
      starting = undefined;
      throw error;
    });
  return starting;
}
