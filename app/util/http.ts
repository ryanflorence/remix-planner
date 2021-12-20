export const CACHE_CONTROL = {
  /**
   * max-age=3
   *
   * Enough time for link prefetching to be effective, but short enough that if
   * they hover w/o visiting, we don't cache stale data for a later click
   */
  safePrefetch: "max-age=3",

  /**
   * "no-cache, max-age=0, must-revalidate"
   *
   * Don't want this cached even if it gets prefetched
   */
  none: "no-cache, max-age=0, must-revalidate",
};
