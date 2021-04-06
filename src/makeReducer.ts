import produce, { Draft } from 'immer';
import { isStepValid } from './utils';

export type ReducerState<S> = {
  /*
  Equal to history[stepNum] in normal circumstances,
  but can diverge if a setState diverges and does not contribute to history.
   */
  currentStateItem: S;
  /*
  An array of previous state history
   */
  history: ReadonlyArray<S>;
  /* 
  Whether the current 'state' is part of the state history, or diverged.
  Intended for cases when state should change, but is not desired to count towards the history.
  */
  isPartOfHistory: boolean;
  /*
  Current step number in history
  */
  stepNum: number;
  /*
  A saved step number in history
  */
  checkpoint: number;
  /*
  Whether the saved checkpoint is valid. A checkpoint may become invalid when going backwards
  in history, and creating new state earlier than the checkpoint (erasing history past that point)
  */
  isCheckpointValid: boolean;
};

/*=============================/
/        Reducer creator       /
/=============================*/
export function makeReducer<S>(initialState: ReducerState<S>) {
  return function reducer(state: ReducerState<S>, action: AllActions<S>) {
    switch (action.type) {
      case 'state/setState': {
        return setStateReducer(state, action);
      }
      case 'state/goTo': {
        return goToReducer(state, action);
      }
      case 'state/goBack': {
        return goBackReducer(state);
      }
      case 'state/goForward': {
        return goForwardReducer(state);
      }
      case 'state/saveCheckpoint': {
        return saveCheckpointReducer(state);
      }
      case 'state/restoreCheckpoint': {
        return restoreCheckpointReducer(state);
      }
      case 'state/reset': {
        return initialState;
      }
      default: {
        // @ts-expect-error shouldn't ever reach this branch, type should be never
        throw new Error(`Received an unexpected action type: ${action.type}`);
      }
    }
  };
}

/*=============================/
/           Reducers           /
/=============================*/

/**
 * Reducer for setting next state
 */
function setStateReducer<S>(
  state: ReducerState<S>,
  action: SetStateAction<S>
): ReducerState<S> {
  let nextStatePiece: S;
  const { updates, includeInHistory } = action.payload;

  if (typeof updates === 'function') {
    const updater = updates as (
      draftState: Draft<S>
    ) => Draft<S> | void | undefined;

    // get new state piece
    nextStatePiece = produce(state.currentStateItem, updater) as S;
  } else {
    nextStatePiece = updates;
  }

  if (nextStatePiece === state.currentStateItem) {
    return state;
  }

  // chop off any 'future' history if applicable

  let choppedHistory: ReadonlyArray<S>;
  let newHistory: ReadonlyArray<S>;
  let newStepNum: number;

  if (includeInHistory) {
    choppedHistory = state.history.slice(0, state.stepNum + 1);
    newHistory = [...choppedHistory, nextStatePiece];
    newStepNum = state.stepNum + 1;
  } else {
    choppedHistory = state.history;
    newHistory = state.history;
    newStepNum = state.stepNum;
  }
  // checkpoint is invalid here if it was already invalid
  // also invalid if it is equal to the last index that is being overwritten
  const isCheckpointStillValid =
    state.isCheckpointValid && state.checkpoint < choppedHistory.length;

  return {
    ...state,
    currentStateItem: nextStatePiece,
    isPartOfHistory: includeInHistory,
    history: newHistory,
    stepNum: newStepNum,
    isCheckpointValid: isCheckpointStillValid,
  };
}

/**
 * Reducer for going to a particular step
 */
function goToReducer<S>(
  state: ReducerState<S>,
  action: GoToAction
): ReducerState<S> {
  const stepNum = action.payload;
  if (isStepValid(stepNum, state.history.length)) {
    return {
      ...state,
      stepNum,
      currentStateItem: state.history[stepNum] as S,
      isPartOfHistory: true,
    };
  }
  return state;
}

/**
 * Reducer for going back one step
 */
function goBackReducer<S>(state: ReducerState<S>): ReducerState<S> {
  const previousStep = state.stepNum - 1;
  if (isStepValid(previousStep, state.history.length)) {
    return {
      ...state,
      stepNum: previousStep,
      currentStateItem: state.history[previousStep] as S,
      isPartOfHistory: true,
    };
  }
  return state;
}

/**
 * Reducer for going forward one step
 */
function goForwardReducer<S>(state: ReducerState<S>): ReducerState<S> {
  const nextStep = state.stepNum + 1;
  if (isStepValid(nextStep, state.history.length)) {
    return {
      ...state,
      stepNum: nextStep,
      currentStateItem: state.history[nextStep] as S,
      isPartOfHistory: true,
    };
  }
  return state;
}

/**
 * Reducer for saving current step as a 'checkpoint'
 */
function saveCheckpointReducer<S>(state: ReducerState<S>): ReducerState<S> {
  return { ...state, checkpoint: state.stepNum, isCheckpointValid: true };
}

/**
 * Reducer for going directly to the saved 'checkpoint'
 */
function restoreCheckpointReducer<S>(state: ReducerState<S>): ReducerState<S> {
  const { checkpoint, isCheckpointValid } = state;
  if (!isCheckpointValid) {
    console.error(
      `Unable to restore checkpoint: saved checkpoint at index ${checkpoint} no longer exists!`
    );
    return state;
  }
  // *should* always be valid here, but check as a precaution
  if (isStepValid(checkpoint, state.history.length)) {
    return {
      ...state,
      stepNum: checkpoint,
      currentStateItem: state.history[checkpoint] as S,
      isPartOfHistory: true,
    };
  }
  return state;
}

/*=============================/
/         Action types         /
/=============================*/
type SetStateAction<S> = {
  type: 'state/setState';
  payload: {
    updates: S | ((draftState: Draft<S>) => Draft<S> | void | undefined);
    includeInHistory: boolean;
  };
};

type GoToAction = {
  type: 'state/goTo';
  payload: number;
};

type GoBackAction = {
  type: 'state/goBack';
};
type GoForwardAction = {
  type: 'state/goForward';
};
type SaveCheckpointAction = {
  type: 'state/saveCheckpoint';
};
type RestoreCheckpointAction = {
  type: 'state/restoreCheckpoint';
};
type ResetAction = {
  type: 'state/reset';
};

type AllActions<S> =
  | SetStateAction<S>
  | GoToAction
  | GoBackAction
  | GoForwardAction
  | SaveCheckpointAction
  | RestoreCheckpointAction
  | ResetAction;
