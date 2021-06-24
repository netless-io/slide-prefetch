declare interface Window {
  /** only exists in electron */
  readonly api?: {
    save(url: string, buffer: ArrayBuffer): Promise<void>;
  };

  SlidePrefetch?: typeof import("../src").SlidePrefetch;
}
