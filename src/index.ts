import * as React from "react";
import { Draft } from "immer";
import { useTrackMutations } from "./utils";
import { makeReducer, ReducerState } from "./makeReducer";
export { setAutoFreeze } from "immer";

/**
 * Hook similar to useState, but uses immer internally to ensure immutable updates.
 * Allows using the setter function to be written 'mutably',
 * while letting take care of applying the immutable updates.
 *
 * Provides time travel support including `history`, `checkpoints`, `goTo`,
 * and `reset` functionality.
 *
 * If not in development mode, checks for mutations between renders and will
 * throw an error if detected.
 *
 * https://github.com/Shrugsy/use-immer-state#readme
 * @param initialState - initial state, or lazy function to return initial state
 */
export function useImmerState<S>(initialState: S | (() => S)) {
  // initial state placed in a ref (and never changed)
  // so we can use it without lying to dependency arrays
  const initialStateRef = React.useRef(initialState);

  /*=============================/
  /     Initial Reducer State    /
  /=============================*/
  const initialReducerState = React.useMemo<ReducerState<S>>(() => {
    const passedInInitialState = initialStateRef.current;
    let initialStatePiece = passedInInitialState;

    // handle lazy initial state if applicable
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

  /*=============================/
  /           Reducer            /
  /=============================*/
  const reducer = React.useMemo(() => {
    return makeReducer(initialReducerState);
  }, [initialReducerState]);

  /*=============================/
  /          useReducer          /
  /=============================*/
  const [state, dispatchAction] = React.useReducer(
    reducer,
    initialReducerState
  );

  /*=============================/
  /      Mutation tracking       /
  /=============================*/
  if (process.env.NODE_ENV !== "production") {
    // Yes we broke the rule, but kept the spirit.
    // The number of hooks won't change between renders,
    // because the environment won't change between renders.
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useTrackMutations(state.history);
  }

  /*=============================/
  /         Exposed API          /
  /=============================*/
  /**
   * Set new state. Accepts either a static value, or functional notation.
   * Using functional notation allows for writing draft updates 'mutably'
   * to produce the next immutable state.
   */
  const setState = React.useCallback(
    (updates: S | ((draftState: Draft<S>) => Draft<S> | void | undefined)) => {
      dispatchAction({
        type: "state/setState",
        payload: updates,
      });
    },
    [dispatchAction]
  );

  /**
   * Go to a provided step number (index) in the state history.
   */
  const goTo = React.useCallback(
    (step: number) => {
      dispatchAction({
        type: "state/goTo",
        payload: step,
      });
    },
    [dispatchAction]
  );

  /**
   * Go to the previous step in state history.
   */
  const goBack = React.useCallback(() => {
    dispatchAction({
      type: "state/goBack",
    });
  }, [dispatchAction]);

  /**
   * Go to the next step in state history.
   */
  const goForward = React.useCallback(() => {
    dispatchAction({
      type: "state/goForward",
    });
  }, [dispatchAction]);

  /**
   * Save the current step in state history as a checkpoint.
   */
  const saveCheckpoint = React.useCallback(() => {
    dispatchAction({
      type: "state/saveCheckpoint",
    });
  }, [dispatchAction]);

  /**
   * Restore the saved checkpoint step in state history.
   * Will restore to initial state if no checkpoint was explicitly saved.
   */
  const restoreCheckpoint = React.useCallback(() => {
    dispatchAction({
      type: "state/restoreCheckpoint",
    });
  }, [dispatchAction]);

  /**
   * Reset to initial state, including state history & checkpoint.
   */
  const reset = React.useCallback(() => {
    dispatchAction({
      type: "state/reset",
    });
  }, [dispatchAction]);

  const extraApi = React.useMemo(
    () => ({
      history: state.history,
      stepNum: state.stepNum,
      goTo,
      goBack,
      goForward,
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
      goBack,
      goForward,
      saveCheckpoint,
      restoreCheckpoint,
      state.checkpoint,
      state.isCheckpointValid,
      reset,
    ]
  );

  return [state.history[state.stepNum], setState, extraApi] as const;
}
