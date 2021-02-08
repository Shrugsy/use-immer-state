import * as React from 'react';
import { Draft } from 'immer';
import { useTrackMutations } from './utils';
import { makeReducer, ReducerState } from './makeReducer';
export { setAutoFreeze } from 'immer';

export type InitialState<S> = S | (() => S);
export type Updates<S> =
  | S
  | ((draftState: Draft<S>) => Draft<S> | void | undefined);

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
export function useImmerState<S>(initialState: InitialState<S>) {
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
    if (typeof passedInInitialState === 'function') {
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
  if (process.env.NODE_ENV !== 'production') {
    // Yes we broke the rule, but kept the spirit.
    // The number of hooks won't change between renders,
    // because the environment won't change between renders.
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useTrackMutations(state.history, 'State History');
  }

  /*=============================/
  /         Exposed API          /
  /=============================*/

  const handlers = React.useMemo(
    () => ({
      /**
       * Set new state. Accepts either a static value, or functional notation.
       * Using functional notation allows for writing draft updates 'mutably'
       * to produce the next immutable state.
       */
      setState(updates: Updates<S>) {
        dispatchAction({
          type: 'state/setState',
          payload: updates,
        });
      },
      /**
       * Go to a provided step number (index) in the state history.
       */
      goTo(step: number) {
        dispatchAction({
          type: 'state/goTo',
          payload: step,
        });
      },
      /**
       * Go to the previous step in state history.
       */
      goBack() {
        dispatchAction({
          type: 'state/goBack',
        });
      },
      /**
       * Go to the next step in state history.
       */
      goForward() {
        dispatchAction({
          type: 'state/goForward',
        });
      },
      /**
       * Save the current step in state history as a checkpoint.
       */
      saveCheckpoint() {
        dispatchAction({
          type: 'state/saveCheckpoint',
        });
      },
      /**
       * Restore the saved checkpoint step in state history.
       * Will restore to initial state if no checkpoint was explicitly saved.
       */
      restoreCheckpoint() {
        dispatchAction({
          type: 'state/restoreCheckpoint',
        });
      },
      /**
       * Reset to initial state, including state history & checkpoint.
       */
      reset() {
        dispatchAction({
          type: 'state/reset',
        });
      },
    }),
    [dispatchAction]
  );

  const extraApi = React.useMemo(
    () => ({
      history: state.history,
      stepNum: state.stepNum,
      goTo: handlers.goTo,
      goBack: handlers.goBack,
      goForward: handlers.goForward,
      saveCheckpoint: handlers.saveCheckpoint,
      restoreCheckpoint: handlers.restoreCheckpoint,
      checkpoint: state.checkpoint,
      isCheckpointValid: state.isCheckpointValid,
      reset: handlers.reset,
    }),
    [
      state.history,
      state.stepNum,
      state.checkpoint,
      state.isCheckpointValid,
      handlers,
    ]
  );

  return [state.history[state.stepNum], handlers.setState, extraApi] as const;
}
