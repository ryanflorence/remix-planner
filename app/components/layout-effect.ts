import React from "react";

export let useLayoutEffect =
  typeof window === "undefined" ? () => {} : React.useLayoutEffect;
