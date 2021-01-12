import produce from "immer";
import * as React from "react";
import { useTrackMutations } from "./utils";

/**
 * Hook similar to useState, but uses immer internally to ensure immutable updates.
 * Allows using the setter function to be written 'mutably',
 * while letting take care of applying the immutable updates.
 * If not in development mode, checks for mutations between renders and will
 * throw an error if detected.
 * @param initialState - initial state, or lazy function to return initial state
 */
function useImmerState<S>(initialState: S | (() => S)) {
  const [state, setState] = React.useState<S>(initialState);

  if (process.env.NODE_ENV !== "production") {
    // Yes we broke the rule, but kept the spirit.
    // The number of hooks won't change between renders,
    // because the environment won't change between renders.
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useTrackMutations(state);
  }

  // TODO: allow saving a 'checkpoint'?

  const setStateWithImmer = React.useCallback(
    (updates: S | ((draftState: S) => void)) => {
      if (typeof updates === "function") {
        const draftUpdates = updates as (draftState: S) => void;
        setState((prevState) => produce(prevState, draftUpdates));
      } else {
        setState(updates);
      }
    },
    []
  );

  return [state, setStateWithImmer] as const;
}

export default useImmerState;
