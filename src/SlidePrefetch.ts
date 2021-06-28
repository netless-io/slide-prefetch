import { BlobReader, BlobWriter, ZipReader } from "@zip.js/zip.js";
import type { Room, RoomState } from "white-web-sdk";
import type { Progress } from "./types";
import { contentType, openCache, urls } from "./utils";

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

const dynamicConvertRE = /^pptx:\/\/(\S+?)\/dynamicConvert\/([0-9a-f]{32})\/(\d+)\.slide$/i;

export interface SlidePrefetchOptions {
  /** resource url = `baseUrl + "/dynamicConvert/{uuid}/..."` */
  baseUrl: string;
  /** `caches.open(cacheName)` */
  cacheName?: string;
  /** custom cache behavior */
  onFetch?: (url: string, blob: Blob) => void;
  /** @default 1000 // ms */
  debounceTimeout?: number;
  /** @default false */
  verbose?: boolean;
}

/**
 * NOTE: it is recommended to have only one {@link SlidePrefetch} instance
 *       because the cached info is not shared between them.
 * @example
 * var s = new SlidePrefetch({ baseUrl, cacheName })
 * s.listen(room)
 * ...
 * s.stop()
 */
export class SlidePrefetch {
  /**
   * Removes all cached slides.
   * It just calls `caches.delete(cacheName)`.
   */
  static clearCache(cacheName: string) {
    return caches.delete(cacheName);
  }

  protected onFetch?: (url: string, blob: Blob) => void;

  private readonly baseUrl: string;
  private readonly cacheName?: string;
  private readonly debounceTimeout: number;
  private readonly verbose: boolean;

  private room?: Room;
  private abortController?: AbortController;
  private debounceTimer = NaN;
  private progress: Progress = {};

  constructor({ baseUrl, cacheName, onFetch, debounceTimeout, verbose }: SlidePrefetchOptions) {
    if (!(cacheName || onFetch)) {
      throw new Error('You must set "cacheName" or "onFetch" to use SlidePrefetch.');
    }

    this.baseUrl = baseUrl;
    this.cacheName = cacheName;
    this.onFetch = onFetch;
    this.debounceTimeout = debounceTimeout || 1000;
    this.verbose = Boolean(verbose);
  }

  /**
   * Listen to room's scene change event, do prefetch slides.
   * @param room the return value of `await sdk.joinRoom()`
   */
  listen(room: Room) {
    if (this.room !== room) {
      if (this.room) this.stop();
      this.room = room;
      this.room.callbacks.on("onRoomStateChanged", this.onRoomStateChanged);
      this.room.callbacks.on("onKickedWithReason", this.stop);
      this.onRoomStateChanged(room.state);
    }
  }

  /**
   * Stop listening room.
   */
  stop = () => {
    if (this.room) {
      this.room.callbacks.off("onRoomStateChanged", this.onRoomStateChanged);
      this.room = undefined;
      this.abort();
    }
  };

  get isActive() {
    return Boolean(this.room);
  }

  private onRoomStateChanged = (modifyState: Partial<RoomState>) => {
    if (modifyState.sceneState) {
      const { scenes, index } = modifyState.sceneState;
      let uuid = "";
      const slides: number[] = [];
      for (const { ppt } of scenes) {
        const m = ppt?.src.match(dynamicConvertRE);
        if (m) {
          uuid = m[2];
          slides.push(+m[3]);
        } else {
          slides.push(-1);
        }
      }
      this.notify(uuid, slides, index);
    }
  };

  private abort() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = undefined;
    }
  }

  private notify(uuid: string, slides: number[], index: number) {
    if (!this.debounceTimer) clearTimeout(this.debounceTimer);
    if (!uuid) return;
    this.debounceTimer = setTimeout(this.jumpTo, this.debounceTimeout, uuid, slides, index);
  }

  private jumpTo = async (uuid: string, slides: number[], index: number) => {
    try {
      await this.jumpToWithoutCatch(uuid, slides, index);
    } catch (e) {
      if (e.name === "AbortError") {
        // that's ok, just ignore it
        return;
      }
      if (!(uuid in this.progress)) {
        throw new Error(`failed to prefetch ${uuid} at page ${index}`);
      }
      if (this.verbose) {
        console.debug(`failed to prefetch ${uuid}'s ${this.progress[uuid].step}`);
        console.debug(e);
      }
      this.progress[uuid].fail = true;
      this.progress[uuid].reason = e;
    }
  };

  private jumpToWithoutCatch = async (uuid: string, slides: number[], index: number) => {
    this.abort();
    if (!(uuid in this.progress)) {
      this.progress[uuid] = {
        step: "layout",
        cachedSlides: new Set(),
        cachedShares: new Set(),
      };
    }
    if (this.verbose) {
      console.debug(`prefetching ${uuid}`);
    }
    if (this.progress[uuid].step === "layout") {
      await this.fetchLayout(uuid);
    }
    if (this.progress[uuid].step === "share") {
      await this.fetchShare(uuid);
    }
    if (this.progress[uuid].step === "res") {
      await this.fetchSlides(uuid, slides, index);
    }
    this.progress[uuid].done = true;
  };

  private async fetchLayout(uuid: string) {
    this.abortController = new AbortController();
    const r = await fetch(urls.layout(this.baseUrl, uuid), { signal: this.abortController.signal });
    this.abortController = undefined;
    if (r.status === 404) {
      throw new NotFoundError(`not found ${uuid}/layout.zip`);
    }
    const hasTriedShare = typeof this.progress[uuid].share === "object";
    this.progress[uuid].step = hasTriedShare ? "res" : "share";
    await this.unzip(r, uuid, true);
  }

  private async fetchShare(uuid: string) {
    this.abortController = new AbortController();
    const r = await fetch(urls.share(this.baseUrl, uuid), { signal: this.abortController.signal });
    this.abortController = undefined;
    if (r.status === 404) {
      // that's ok, just ignore it
      this.progress[uuid].share = null;
    } else {
      try {
        this.progress[uuid].share = await r.json();
      } catch (error) {
        if (this.verbose) {
          console.debug(`failed to parse share.json of ${uuid}`);
          console.debug(error);
        }
        this.progress[uuid].share = null;
      }
    }
    this.progress[uuid].step = "res";
  }

  private async fetchSlides(uuid: string, slides: number[], index: number) {
    for (let i = index + 1; i < slides.length; ++i) {
      const slideId = slides[i];
      const share = this.progress[uuid].share?.[slideId];
      if (share) {
        for (const { name } of share) {
          if (!this.progress[uuid].cachedShares.has(name)) {
            this.fetchShareRes(name);
            this.progress[uuid].cachedShares.add(name);
          }
        }
      }
      if (slideId !== -1 && !this.progress[uuid].cachedSlides.has(slideId)) {
        this.abortController = new AbortController();
        const r = await fetch(urls.res(this.baseUrl, uuid, slideId), {
          signal: this.abortController.signal,
        });
        this.abortController = undefined;
        this.progress[uuid].cachedSlides.add(slideId);
        if (this.verbose) {
          console.debug(`cached slide ${slideId}`);
        }
        if (r.status === 404) {
          // that's ok, just ignore it
        } else {
          await this.unzip(r, uuid, false);
        }
      }
    }
    this.progress[uuid].step = "end";
  }

  private async fetchShareRes(name: string) {
    try {
      const url = urls.shareRes(this.baseUrl, name);
      const blob = await fetch(url).then((r) => r.blob());
      this.onFetch?.(url, blob);
    } catch {}
  }

  private async unzip(r: Response, uuid: string, throwError: boolean) {
    let reader: ZipReader | undefined;
    try {
      reader = new ZipReader(new BlobReader(await r.blob()));
      const entries = await reader.getEntries();
      for (const entry of entries) {
        if (!entry.getData) continue;
        const blob: Blob = await entry.getData(new BlobWriter());
        const url = urls.entry(this.baseUrl, uuid, entry.filename);
        await this.cacheEntry(url, blob, uuid);
      }
    } catch (error) {
      if (throwError) {
        throw error;
      } else if (this.verbose) {
        console.debug(`failed to unzip ${r.url}`);
        console.debug(error);
      }
    } finally {
      reader?.close();
    }
  }

  private async cacheEntry(url: string, blob: Blob, uuid: string) {
    if (this.onFetch) {
      this.onFetch(url, blob);
    }
    if (this.cacheName) {
      const cache = await openCache(this.cacheName);
      const response = new Response(blob, {
        headers: { "Content-Type": contentType(url) },
      });
      if (url.endsWith("/share.json")) {
        try {
          this.progress[uuid].share = await response.clone().json();
        } catch (error) {
          if (this.verbose) {
            console.debug(`failed to parse share.json of ${uuid}`);
            console.debug(error);
          }
          this.progress[uuid].share = null;
        }
      }
      cache.put(url, response);
    }
  }
}
