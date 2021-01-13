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
  let initialStateHistory: S[] | (() => S[]);
  if (typeof initialState === "function") {
    const passedInitialState = initialState as () => S;
    initialStateHistory = () => [passedInitialState()];
  } else {
    initialStateHistory = [initialState];
  }
  const [stateHistory, setStateHistory] = React.useState<S[]>(
    initialStateHistory
  );
  const stateHistoryRef = React.useRef(stateHistory);
  stateHistoryRef.current = stateHistory;

  const [stepNum, setStepNum] = React.useState(0);
  const stepNumRef = React.useRef(stepNum);
  stepNumRef.current = stepNum;

  const [checkpoint, setCheckpoint] = React.useState(0);

  if (process.env.NODE_ENV !== "production") {
    // Yes we broke the rule, but kept the spirit.
    // The number of hooks won't change between renders,
    // because the environment won't change between renders.
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useTrackMutations(stateHistory);
  }

  const setStateWithImmer = React.useCallback(
    (updates: S | ((draftState: S) => void)) => {
      if (typeof updates === "function") {
        const draftUpdater = updates as (draftState: S) => void;
        setStateHistory((prevStateHistory) => {
          // chop any 'future' history that is no longer applicable

          let newStateHistory = chopPastIndex(
            prevStateHistory,
            stepNumRef.current
          );

          // create the new history step based on the provided draft updater
          const newStateItem = produce(
            newStateHistory[stepNumRef.current],
            draftUpdater
          );
          // add it as our new final step
          newStateHistory = [...newStateHistory, newStateItem];

          setStepNum(newStateHistory.length - 1);
          return newStateHistory;
        });
      } else {
        // chop any 'future' history that is no longer applicable
        const nextStateHistory = chopPastIndex(
          stateHistoryRef.current,
          stepNumRef.current
        );
        setStepNum(nextStateHistory.length);
        setStateHistory([...nextStateHistory, updates]);
      }
    },
    []
  );

  const goTo = React.useCallback((step: number) => {
    if (typeof step !== "number") {
      console.error(
        `Please only pass a number to this function! Received ${step}`
      );
      return;
    }
    if (step < 0) {
      console.error(`Step number ${step} below bounds!`);
      return;
    }
    if (step > stateHistoryRef.current.length) {
      console.error(
        `Step number ${step} above bounds! History length is ${stateHistoryRef.current.length}`
      );
      return;
    }
    setStepNum(step);
  }, []);

  const saveCheckpoint = React.useCallback(() => {
    setCheckpoint(stepNum);
  }, [stepNum]);

  const restoreCheckpoint = React.useCallback(() => {
    goTo(checkpoint);
  }, [goTo, checkpoint]);

  const extraApi = {
    history: stateHistory,
    stepNum,
    goTo,
    saveCheckpoint,
    restoreCheckpoint,
  };

  return [stateHistory[stepNum], setStateWithImmer, extraApi] as const;
}

export default useImmerState;

function chopPastIndex<T>(arr: T[], index: number): T[] {
  return arr.slice(0, index + 1);
}
