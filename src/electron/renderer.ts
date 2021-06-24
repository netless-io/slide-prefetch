import {
  SlidePrefetch as SlidePrefetchCore,
  SlidePrefetchOptions as SlidePrefetchOptionsCore,
} from "../SlidePrefetch";
import { channelName } from "./share";

export type SlidePrefetchOptions = Omit<SlidePrefetchOptionsCore, "cacheName"> & {
  /** If specified, it will call `window[name][method]()` instead of `ipcRenderer.invoke()` */
  contextBridge?: {
    name: string;
    method: string;
  };
};

export class SlidePrefetch extends SlidePrefetchCore {
  constructor({ onFetch, ...options }: SlidePrefetchOptions) {
    super({ ...options, onFetch: onFetch || createOnFetchFn(options.contextBridge) });
  }
}

type OnFetchFn = Exclude<SlidePrefetch["onFetch"], undefined>;
function createOnFetchFn(contextBridge?: { name: string; method: string }): OnFetchFn {
  if (contextBridge) {
    const { name, method } = contextBridge;
    return async (url, blob) => (window as any)[name][method](url, await blob.arrayBuffer());
  } else {
    return async (url, blob) =>
      require("electron").ipcRenderer.invoke(channelName, url, await blob.arrayBuffer());
  }
}
