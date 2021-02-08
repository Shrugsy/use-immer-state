import produce, { Draft } from 'immer';
import { isStepValid } from './utils';

export type ReducerState<S> = {
  history: ReadonlyArray<S>;
  stepNum: number;
  checkpoint: number;
  isCheckpointValid: boolean;
};

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

function setStateReducer<S>(state: ReducerState<S>, action: SetStateAction<S>) {
  let nextStatePiece: S;
  const newHistory = state.history.slice(0, state.stepNum + 1);
  if (typeof action.payload === 'function') {
    const updater = action.payload as (
      draftState: Draft<S>
    ) => Draft<S> | void | undefined;
    // chop off any 'future' history if applicable

    // get new state piece
    nextStatePiece = produce(state.history[state.stepNum], updater) as S;
  } else {
    nextStatePiece = action.payload;
  }
  const isCheckpointStillValid = state.checkpoint < state.history.length - 1;
  return {
    ...state,
    history: [...newHistory, nextStatePiece],
    stepNum: state.stepNum + 1,
    isCheckpointValid: isCheckpointStillValid,
  };
}

function goToReducer<S>(state: ReducerState<S>, action: GoToAction) {
  const stepNum = action.payload;
  if (isStepValid(stepNum, state.history.length)) {
    return { ...state, stepNum };
  }
  return state;
}

function goBackReducer<S>(state: ReducerState<S>) {
  const previousStep = state.stepNum - 1;
  if (isStepValid(previousStep, state.history.length)) {
    return { ...state, stepNum: previousStep };
  }
  return state;
}

function goForwardReducer<S>(state: ReducerState<S>) {
  const nextStep = state.stepNum + 1;
  if (isStepValid(nextStep, state.history.length)) {
    return { ...state, stepNum: nextStep };
  }
  return state;
}

function saveCheckpointReducer<S>(state: ReducerState<S>) {
  return { ...state, checkpoint: state.stepNum, isCheckpointValid: true };
}

function restoreCheckpointReducer<S>(state: ReducerState<S>) {
  const { checkpoint, isCheckpointValid } = state;
  if (!isCheckpointValid) {
    console.error(
      `Unable to restore checkpoint: saved checkpoint at index ${checkpoint} no longer exists!`
    );
    return state;
  }
  // *should* always be valid here, but check as a precaution
  if (isStepValid(checkpoint, state.history.length)) {
    return { ...state, stepNum: checkpoint };
  }
  return state;
}

type SetStateAction<S> = {
  type: 'state/setState';
  payload: S | ((draftState: Draft<S>) => Draft<S> | void | undefined);
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
