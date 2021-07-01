export interface Share {
  [slideId: number]: {
    /** `dynamicConvert/{uuid}/...` */
    name: string;
    /** in bytes */
    size: number;
    /** shared in these slides */
    slides: number[];
  }[];
}

export interface Progress {
  [uuid: string]: {
    /** if `done`, all resources have cached, don't download again */
    done?: true;
    /** if `fail`, something went wrong, don't download again */
    fail?: true;
    /** if `fail` is true, `reason` contains the error message */
    reason?: Error;
    /**
     * - layout: downloading presentationML.zip
     * - share: downloading bigFile.json
     * - res: downloading resourceN.zip
     * - end: nothing todo
     */
    step: "layout" | "share" | "res" | "end";
    /** if `step: res`, it stores downloaded slides */
    cachedSlides: Set<number>;
    /**
     * if `step: share` success, `share` contains the share info,
     * otherwise, it is `null` (so that `typeof share` is `object`)
     */
    share?: Share | null;
    /** stores downloaded shared resources */
    cachedShares: Set<string>;
  };
}
