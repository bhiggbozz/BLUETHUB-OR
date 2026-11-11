/** Rejects with a clear, labeled error if `promise` hasn't settled within
 * `ms` — for calls (SignalR invoke, LiveKit room connect) that can otherwise
 * hang indefinitely with no client-side timeout, leaving the UI stuck on a
 * loading state with nothing in the console to explain why. */
export function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${Math.round(ms / 1000)}s. Check the backend is reachable and responding for this call.`));
    }, ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}
