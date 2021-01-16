import * as React from "react";
import produce, { Draft } from "immer";
import { useTrackMutations, isStepValid } from "./utils";
import { createAction, createReducer } from "@reduxjs/toolkit";

// temporarily removed export
// export { setAutoFreeze } from "immer";

const goToAction = createAction<number>("state/goTo");
const saveCheckpointAction = createAction("state/saveCheckpoint");
const restoreCheckpointAction = createAction("state/restoreCheckpoint");
const resetAction = createAction("state/reset");

type ReducerState<S> = {
  history: ReadonlyArray<S>;
  stepNum: number;
  checkpoint: number;
  isCheckpointValid: boolean;
};

/**
 * Hook similar to useState, but uses immer internally to ensure immutable updates.
 * Allows using the setter function to be written 'mutably',
 * while letting take care of applying the immutable updates.
 * If not in development mode, checks for mutations between renders and will
 * throw an error if detected.
 * @param initialState - initial state, or lazy function to return initial state
 */
export function useImmerState<S>(initialState: S | (() => S)) {
  const initialStateRef = React.useRef(initialState);
  const isFirstRenderRef = React.useRef(true);

  const setStateAction = React.useMemo(
    () =>
      createAction<S | ((draftState: Draft<S>) => Draft<S> | void | undefined)>(
        "state/setState"
      ),
    []
  );

  const initialReducerState = React.useMemo<ReducerState<S>>(() => {
    const passedInInitialState = initialStateRef.current;
    let initialStatePiece = passedInInitialState;

    if (typeof passedInInitialState === "function") {
      const lazyInitialState = passedInInitialState as () => S;
      initialStatePiece = lazyInitialState();
    } else {
      initialStatePiece = passedInInitialState;
    }

    return {
      history: [initialStatePiece],
      stepNum: 0,
      checkpoint: 0,
      isCheckpointValid: true,
    };
  }, []);

  const reducer = React.useMemo(() => {
    return createReducer(initialReducerState, (builder) => {
      builder
        .addCase(setStateAction, (draftState, action) => {
          if (typeof action.payload === "function") {
            const updater = action.payload as (
              draftState: Draft<S>
            ) => Draft<S> | void | undefined;
            // chop off any 'future' history if applicable
            draftState.history.splice(draftState.stepNum + 1);

            // get new state piece
            const nextStatePiece = produce(
              draftState.history[draftState.stepNum],
              updater
            ) as Draft<S>;
            draftState.stepNum++;
            draftState.history.push(nextStatePiece);
          } else {
            draftState.history.splice(draftState.stepNum + 1);
            draftState.stepNum++;

            const draftUpdates = action.payload as Draft<S>;
            draftState.history.push(draftUpdates);
          }

          // checkpoint needs to have been one of the existing items,
          // excluding the new one
          if (draftState.checkpoint >= draftState.history.length - 1) {
            draftState.isCheckpointValid = false;
          }
        })
        .addCase(goToAction, (draftState, action) => {
          const step = action.payload;
          if (isStepValid(step, draftState.history.length)) {
            draftState.stepNum = step;
          }
        })
        .addCase(saveCheckpointAction, (draftState) => {
          draftState.isCheckpointValid = true;
          draftState.checkpoint = draftState.stepNum;
        })
        .addCase(restoreCheckpointAction, (draftState) => {
          const { checkpoint, isCheckpointValid } = draftState;
          if (!isCheckpointValid) {
            console.error(
              `Unable to restore checkpoint: saved checkpoint at index ${checkpoint} no longer exists!`
            );
            return;
          }
          if (isStepValid(checkpoint, draftState.history.length)) {
            draftState.stepNum = checkpoint;
          }
        })
        .addCase(resetAction, () => {
          return initialReducerState;
        });
    });
  }, [setStateAction, initialReducerState]);

  isFirstRenderRef.current = false;

  const [state, dispatchAction] = React.useReducer(
    reducer,
    initialReducerState
  );

  if (process.env.NODE_ENV !== "production") {
    // Yes we broke the rule, but kept the spirit.
    // The number of hooks won't change between renders,
    // because the environment won't change between renders.
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useTrackMutations(state.history);
  }

  const setState = React.useCallback(
    (updates: S | ((draftState: Draft<S>) => Draft<S> | void | undefined)) => {
      dispatchAction(setStateAction(updates));
    },
    [dispatchAction, setStateAction]
  );

  const goTo = React.useCallback(
    (step: number) => {
      dispatchAction(goToAction(step));
    },
    [dispatchAction]
  );

  const reset = React.useCallback(() => {
    dispatchAction(resetAction());
  }, [dispatchAction]);

  const saveCheckpoint = React.useCallback(() => {
    dispatchAction(saveCheckpointAction());
  }, [dispatchAction]);

  const restoreCheckpoint = React.useCallback(() => {
    dispatchAction(restoreCheckpointAction());
  }, [dispatchAction]);

  const extraApi = React.useMemo(
    () => ({
      history: state.history,
      stepNum: state.stepNum,
      goTo,
      saveCheckpoint,
      restoreCheckpoint,
      checkpoint: state.checkpoint,
      isCheckpointValid: state.isCheckpointValid,
      reset,
    }),
    [
      state.history,
      state.stepNum,
      goTo,
      saveCheckpoint,
      restoreCheckpoint,
      state.checkpoint,
      state.isCheckpointValid,
      reset,
    ]
  );

  return [state.history[state.stepNum], setState, extraApi] as const;
}
