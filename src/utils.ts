import * as React from "react";
import { diffChars, Change } from "diff";

function getPartColor(part: Change) {
  if (part.added) {
    return "green";
  } else if (part.removed) {
    return "red";
  }
  return "grey";
}

function logDiffs(partArray: Change[]) {
  let diffStr = "";
  const cssArray = [] as string[];
  partArray.forEach((part) => {
    const color = getPartColor(part);
    diffStr += `%c${part.value}`;
    cssArray.push(`color:${color};`);
  });

  console.error(diffStr, ...cssArray);
}

export class MutationError extends Error {
  diffs?: Change[];
  constructor(message: string, diffs?: Change[]) {
    super(message);
    this.name = "MutationError";
    this.message = message;
    this.diffs = diffs;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, MutationError);
    }
  }
}

export function useTrackMutations<S>(state: S) {
  // store 'locked in' version of state
  const prevStateStringified = React.useRef(JSON.stringify(state));
  // store direct reference to state
  const prevStateRaw = React.useRef(state);

  React.useEffect(() => {
    // check if something changed in the previous state
    const lastRender = prevStateStringified.current;
    const thisRender = JSON.stringify(prevStateRaw.current);
    if (lastRender !== thisRender) {
      const diffs = diffChars(lastRender, thisRender);
      logDiffs(diffs);
      const errMsg =
        "Detected a state mutation between renders. See console output and stack trace for details.";
      throw new MutationError(errMsg, diffs);
    }

    // set the new state as previous to be checked next time
    prevStateStringified.current = JSON.stringify(state);
    prevStateRaw.current = state;
  });
}

export function isStepValid(step: number, historyLength: number): boolean {
  if (typeof step !== "number") {
    console.error(
      `Please only pass a number to this function! Received ${step}`
    );
    return false;
  }
  if (step < 0) {
    console.error(`Step number ${step} below bounds!`);
    return false;
  }
  if (step > historyLength) {
    console.error(
      `Step number ${step} above bounds! History length is ${historyLength}`
    );
    return false;
  }
  return true;
}
