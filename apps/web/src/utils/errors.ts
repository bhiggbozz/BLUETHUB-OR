import { AxiosError } from "axios";

/** Pulls the backend's `responseMessage` off a failed API call, falling back
 * when the error isn't a shaped AxiosError (network failure, etc). */
export const getErrorMessage = (err: unknown, fallback: string): string => {
  const e = err as AxiosError<{ responseMessage?: string }>;
  return e.response?.data?.responseMessage ?? fallback;
};
