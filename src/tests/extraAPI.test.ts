import { act, renderHook } from '@testing-library/react-hooks';
import { expectType } from 'tsd';
import { mockConsoleError } from './helpers';
import { Updates, useImmerState } from '../';

describe('extra API', () => {
  test('shows history, step, and can goto a point in history', () => {
    const initialState = [
      { id: 0, value: 'foo' },
      { id: 1, value: 'bar' },
    ];

    type InitialTestState = typeof initialState;

    const { result } = renderHook(() => useImmerState(initialState));

    // first render
    let [state, setState, { history, stepNum, goTo }] = result.current;

    // [ASSERT] - types should be as expected
    expectType<InitialTestState>(state);
    expectType<(foo: Updates<InitialTestState>) => void>(setState);
    expectType<readonly InitialTestState[]>(history);
    expectType<number>(stepNum);
    expectType<(step: number) => void>(goTo);

    expect(stepNum).toEqual(0);

    // [ACTION] - change value for second item
    act(() => {
      setState((prev) => {
        prev[1]!.value = 'newBar';
      });
    });

    // [ASSERT] - values should be updated
    // second render
    [state, setState, { history, stepNum, goTo }] = result.current;
    expect(stepNum).toEqual(1);
    expect(state).toEqual([
      { id: 0, value: 'foo' },
      { id: 1, value: 'newBar' },
    ]);

    // history should be extended
    expect(history).toEqual([
      [
        { id: 0, value: 'foo' },
        { id: 1, value: 'bar' },
      ],
      [
        { id: 0, value: 'foo' },
        { id: 1, value: 'newBar' },
      ],
    ]);

    // [ACTION] - change value for first item
    // set new state
    act(() => {
      setState((prev) => {
        prev[0]!.value = 'newFoo';
      });
    });

    // [ASSERT] - values should be updated
    // third render
    [state, setState, { history, stepNum, goTo }] = result.current;
    expect(stepNum).toEqual(2);
    expect(state).toEqual([
      { id: 0, value: 'newFoo' },
      { id: 1, value: 'newBar' },
    ]);

    // history should be extended
    expect(history).toEqual([
      [
        { id: 0, value: 'foo' },
        { id: 1, value: 'bar' },
      ],
      [
        { id: 0, value: 'foo' },
        { id: 1, value: 'newBar' },
      ],
      [
        { id: 0, value: 'newFoo' },
        { id: 1, value: 'newBar' },
      ],
    ]);

    // [ACTION] - change value for first item
    // set new state
    act(() => {
      setState((prev) => {
        prev[0]!.value = 'newNewFoo';
      });
    });

    // [ASSERT] - values should be updated
    // fourth render
    [state, setState, { history, stepNum, goTo }] = result.current;
    expect(stepNum).toEqual(3);
    expect(state).toEqual([
      { id: 0, value: 'newNewFoo' },
      { id: 1, value: 'newBar' },
    ]);

    // history should be extended
    expect(history).toEqual([
      [
        { id: 0, value: 'foo' },
        { id: 1, value: 'bar' },
      ],
      [
        { id: 0, value: 'foo' },
        { id: 1, value: 'newBar' },
      ],
      [
        { id: 0, value: 'newFoo' },
        { id: 1, value: 'newBar' },
      ],
      [
        { id: 0, value: 'newNewFoo' },
        { id: 1, value: 'newBar' },
      ],
    ]);

    // [ACTION] - time travel to step/index 1
    act(() => {
      goTo(1);
    });

    // [ASSERT] - should see state reflecting step/index 1
    // fifth render
    [state, setState, { history, stepNum, goTo }] = result.current;
    expect(stepNum).toEqual(1);
    expect(state).toEqual([
      { id: 0, value: 'foo' },
      { id: 1, value: 'newBar' },
    ]);

    // history should remain
    expect(history).toEqual([
      [
        { id: 0, value: 'foo' },
        { id: 1, value: 'bar' },
      ],
      [
        { id: 0, value: 'foo' },
        { id: 1, value: 'newBar' },
      ],
      [
        { id: 0, value: 'newFoo' },
        { id: 1, value: 'newBar' },
      ],
      [
        { id: 0, value: 'newNewFoo' },
        { id: 1, value: 'newBar' },
      ],
    ]);

    // [ACTION] - change value of second item in state
    // set new state, should purge any 'future' history and re-write new
    act(() => {
      setState((prev) => {
        prev[1]!.value = 're-wrote the timeline';
      });
    });

    // [ASSERT] - future history should have been re-written
    // sixth render
    [state, setState, { history, stepNum, goTo }] = result.current;

    expect(stepNum).toEqual(2);
    expect(state).toEqual([
      { id: 0, value: 'foo' },
      { id: 1, value: 're-wrote the timeline' },
    ]);

    // history should be re-written
    expect(history).toEqual([
      [
        { id: 0, value: 'foo' },
        { id: 1, value: 'bar' },
      ],
      [
        { id: 0, value: 'foo' },
        { id: 1, value: 'newBar' },
      ],
      [
        { id: 0, value: 'foo' },
        { id: 1, value: 're-wrote the timeline' },
      ],
    ]);

    // [ACTION] - go to step 0
    act(() => {
      goTo(0);
    });

    // [ASSERT] - details should reflect step 0
    // seventh render
    [state, setState, { history, stepNum, goTo }] = result.current;

    expect(stepNum).toEqual(0);
    expect(state).toEqual([
      { id: 0, value: 'foo' },
      { id: 1, value: 'bar' },
    ]);

    // history should remain
    expect(history).toEqual([
      [
        { id: 0, value: 'foo' },
        { id: 1, value: 'bar' },
      ],
      [
        { id: 0, value: 'foo' },
        { id: 1, value: 'newBar' },
      ],
      [
        { id: 0, value: 'foo' },
        { id: 1, value: 're-wrote the timeline' },
      ],
    ]);

    // [ACTION] - set new state (using non-function setter)
    act(() => {
      setState([
        { id: 0, value: 'faz' },
        { id: 1, value: 'baz' },
        { id: 2, value: 'hello' },
        { id: 3, value: 'world' },
      ]);
    });

    // [ASSERT] - details should reflect the new state
    // eighth render
    [state, setState, { history, stepNum, goTo }] = result.current;

    expect(stepNum).toEqual(1);
    expect(state).toEqual([
      { id: 0, value: 'faz' },
      { id: 1, value: 'baz' },
      { id: 2, value: 'hello' },
      { id: 3, value: 'world' },
    ]);

    // history should be re-written
    expect(history).toEqual([
      [
        { id: 0, value: 'foo' },
        { id: 1, value: 'bar' },
      ],
      [
        { id: 0, value: 'faz' },
        { id: 1, value: 'baz' },
        { id: 2, value: 'hello' },
        { id: 3, value: 'world' },
      ],
    ]);
  });

  test("trying to 'goTo' with an invalid input won't work and won't break functionality", () => {
    const initialState = [
      { id: 0, value: 'foo' },
      { id: 1, value: 'bar' },
    ];

    const { result } = renderHook(() => useImmerState(initialState));

    // first render
    let [state, setState, { history, stepNum, goTo }] = result.current;
    expect(stepNum).toEqual(0);
    act(() => {
      setState((prev) => {
        prev[1]!.value = 'newBar';
      });
    });

    // second render
    [state, setState, { history, stepNum, goTo }] = result.current;
    expect(stepNum).toEqual(1);
    expect(state).toEqual([
      { id: 0, value: 'foo' },
      { id: 1, value: 'newBar' },
    ]);
    expect(history).toEqual([
      [
        { id: 0, value: 'foo' },
        { id: 1, value: 'bar' },
      ],
      [
        { id: 0, value: 'foo' },
        { id: 1, value: 'newBar' },
      ],
    ]);

    mockConsoleError.mute();
    act(() => {
      // @ts-expect-error ts(2345) - intentionally passing wrong type to check behaviour
      goTo('0');
    });
    mockConsoleError.unmute();

    // still second render (no new render should have triggered)
    [state, setState, { history, stepNum, goTo }] = result.current;
    // step number & state shouldn't have changed
    expect(stepNum).toEqual(1);
    expect(state).toEqual([
      { id: 0, value: 'foo' },
      { id: 1, value: 'newBar' },
    ]);
    expect(history).toEqual([
      [
        { id: 0, value: 'foo' },
        { id: 1, value: 'bar' },
      ],
      [
        { id: 0, value: 'foo' },
        { id: 1, value: 'newBar' },
      ],
    ]);

    act(() => {
      // calling again afterwards should still function as expected
      goTo(0);
    });

    // third render
    [state, setState, { history, stepNum, goTo }] = result.current;
    // step number & state should now change as per the 'goTo(0)' call
    expect(stepNum).toEqual(0);
    expect(state).toEqual([
      { id: 0, value: 'foo' },
      { id: 1, value: 'bar' },
    ]);
    expect(history).toEqual([
      [
        { id: 0, value: 'foo' },
        { id: 1, value: 'bar' },
      ],
      [
        { id: 0, value: 'foo' },
        { id: 1, value: 'newBar' },
      ],
    ]);
  });

  test('can goBack and goForward one step at a time', () => {
    const initialState = [
      { id: 0, value: 'foo' },
      { id: 1, value: 'bar' },
    ];

    type InitialTestState = typeof initialState;

    const { result } = renderHook(() => useImmerState(initialState));

    // first render
    let [
      state,
      setState,
      { history, stepNum, goBack, goForward },
    ] = result.current;

    expectType<InitialTestState>(state);
    expectType<(foo: Updates<InitialTestState>) => void>(setState);
    expectType<readonly InitialTestState[]>(history);
    expectType<number>(stepNum);
    expectType<() => void>(goBack);
    expectType<() => void>(goForward);

    expect(stepNum).toEqual(0);
    act(() => {
      setState((prev) => {
        prev[1]!.value = 'newBar';
      });
    });

    act(() => {
      setState((prev) => {
        prev[0]!.value = 'newFoo';
      });
    });

    // third render (set state twice separately)
    [state, setState, { history, stepNum, goBack, goForward }] = result.current;
    expect(stepNum).toEqual(2);
    expect(state).toEqual([
      { id: 0, value: 'newFoo' },
      { id: 1, value: 'newBar' },
    ]);

    expect(history).toEqual([
      [
        { id: 0, value: 'foo' },
        { id: 1, value: 'bar' },
      ],
      [
        { id: 0, value: 'foo' },
        { id: 1, value: 'newBar' },
      ],
      [
        { id: 0, value: 'newFoo' },
        { id: 1, value: 'newBar' },
      ],
    ]);

    mockConsoleError.mute();
    act(() => {
      // try to go forward, but already at latest step in history
      goForward();
    });
    mockConsoleError.unmute();

    // should still be third render, nothing should have happened besides a console warning
    [state, setState, { history, stepNum, goBack, goForward }] = result.current;
    expect(stepNum).toEqual(2);
    expect(state).toEqual([
      { id: 0, value: 'newFoo' },
      { id: 1, value: 'newBar' },
    ]);

    expect(history).toEqual([
      [
        { id: 0, value: 'foo' },
        { id: 1, value: 'bar' },
      ],
      [
        { id: 0, value: 'foo' },
        { id: 1, value: 'newBar' },
      ],
      [
        { id: 0, value: 'newFoo' },
        { id: 1, value: 'newBar' },
      ],
    ]);

    act(() => {
      // should be able to go back a step fine
      goBack();
    });

    // fourth render
    [state, setState, { history, stepNum, goBack, goForward }] = result.current;
    expect(stepNum).toEqual(1);
    expect(state).toEqual([
      { id: 0, value: 'foo' },
      { id: 1, value: 'newBar' },
    ]);

    expect(history).toEqual([
      [
        { id: 0, value: 'foo' },
        { id: 1, value: 'bar' },
      ],
      [
        { id: 0, value: 'foo' },
        { id: 1, value: 'newBar' },
      ],
      [
        { id: 0, value: 'newFoo' },
        { id: 1, value: 'newBar' },
      ],
    ]);

    act(() => {
      // go back to first step (initial state)
      goBack();
    });

    // fifth render
    [state, setState, { history, stepNum, goBack, goForward }] = result.current;
    expect(stepNum).toEqual(0);
    expect(state).toEqual([
      { id: 0, value: 'foo' },
      { id: 1, value: 'bar' },
    ]);

    expect(history).toEqual([
      [
        { id: 0, value: 'foo' },
        { id: 1, value: 'bar' },
      ],
      [
        { id: 0, value: 'foo' },
        { id: 1, value: 'newBar' },
      ],
      [
        { id: 0, value: 'newFoo' },
        { id: 1, value: 'newBar' },
      ],
    ]);

    mockConsoleError.mute();
    act(() => {
      // try going back again, but already at earliest step
      goBack();
    });
    mockConsoleError.unmute();

    // fifth render (shouldn't re-render)
    [state, setState, { history, stepNum, goBack, goForward }] = result.current;
    expect(stepNum).toEqual(0);
    expect(state).toEqual([
      { id: 0, value: 'foo' },
      { id: 1, value: 'bar' },
    ]);

    expect(history).toEqual([
      [
        { id: 0, value: 'foo' },
        { id: 1, value: 'bar' },
      ],
      [
        { id: 0, value: 'foo' },
        { id: 1, value: 'newBar' },
      ],
      [
        { id: 0, value: 'newFoo' },
        { id: 1, value: 'newBar' },
      ],
    ]);

    act(() => {
      // should be able to go forward fine
      goForward();
    });

    // sixth render
    [state, setState, { history, stepNum, goBack, goForward }] = result.current;
    expect(stepNum).toEqual(1);
    expect(state).toEqual([
      { id: 0, value: 'foo' },
      { id: 1, value: 'newBar' },
    ]);

    expect(history).toEqual([
      [
        { id: 0, value: 'foo' },
        { id: 1, value: 'bar' },
      ],
      [
        { id: 0, value: 'foo' },
        { id: 1, value: 'newBar' },
      ],
      [
        { id: 0, value: 'newFoo' },
        { id: 1, value: 'newBar' },
      ],
    ]);
  });

  test('can save and restore from a checkpoint', () => {
    const initialState = [
      { id: 0, value: 'foo' },
      { id: 1, value: 'bar' },
    ];

    type InitialTestState = typeof initialState;

    const { result } = renderHook(() => useImmerState(initialState));

    // first render
    let [
      state,
      setState,
      {
        history,
        stepNum,
        checkpoint,
        isCheckpointValid,
        saveCheckpoint,
        restoreCheckpoint,
      },
    ] = result.current;

    expectType<InitialTestState>(state);
    expectType<(foo: Updates<InitialTestState>) => void>(setState);
    expectType<readonly InitialTestState[]>(history);
    expectType<number>(stepNum);
    expectType<() => void>(saveCheckpoint);
    expectType<() => void>(restoreCheckpoint);

    expect(checkpoint).toEqual(0);
    expect(isCheckpointValid).toBe(true);
    expect(stepNum).toEqual(0);
    act(() => {
      setState((prev) => {
        prev[1]!.value = 'newBar';
      });
    });
    act(() => {
      setState((prev) => {
        prev[0]!.value = 'newFoo';
      });
    });

    [, , { saveCheckpoint }] = result.current;
    act(() => {
      saveCheckpoint();
    });
    act(() => {
      setState([
        { id: 0, value: 'newNewFoo' },
        { id: 1, value: 'newNewBar' },
        { id: 2, value: 'faz' },
      ]);
    });
    act(() => {
      setState((prev) => {
        prev[3] = { id: 3, value: 'baz' };
      });
    });
    // sixth render
    [
      state,
      setState,
      {
        history,
        stepNum,
        checkpoint,
        isCheckpointValid,
        saveCheckpoint,
        restoreCheckpoint,
      },
    ] = result.current;
    expect(checkpoint).toEqual(2);
    expect(isCheckpointValid).toBe(true);
    expect(stepNum).toEqual(4);
    expect(state).toEqual([
      { id: 0, value: 'newNewFoo' },
      { id: 1, value: 'newNewBar' },
      { id: 2, value: 'faz' },
      { id: 3, value: 'baz' },
    ]);
    expect(history).toEqual([
      [
        { id: 0, value: 'foo' },
        { id: 1, value: 'bar' },
      ],
      [
        { id: 0, value: 'foo' },
        { id: 1, value: 'newBar' },
      ],
      [
        { id: 0, value: 'newFoo' },
        { id: 1, value: 'newBar' },
      ],
      [
        { id: 0, value: 'newNewFoo' },
        { id: 1, value: 'newNewBar' },
        { id: 2, value: 'faz' },
      ],
      [
        { id: 0, value: 'newNewFoo' },
        { id: 1, value: 'newNewBar' },
        { id: 2, value: 'faz' },
        { id: 3, value: 'baz' },
      ],
    ]);

    act(() => {
      restoreCheckpoint();
    });

    // seventh render
    [
      state,
      setState,
      {
        history,
        stepNum,
        checkpoint,
        isCheckpointValid,
        saveCheckpoint,
        restoreCheckpoint,
      },
    ] = result.current;
    expect(checkpoint).toEqual(2);
    expect(isCheckpointValid).toBe(true);
    expect(stepNum).toEqual(2);
    expect(state).toEqual([
      { id: 0, value: 'newFoo' },
      { id: 1, value: 'newBar' },
    ]);
    expect(history).toEqual([
      [
        { id: 0, value: 'foo' },
        { id: 1, value: 'bar' },
      ],
      [
        { id: 0, value: 'foo' },
        { id: 1, value: 'newBar' },
      ],
      [
        { id: 0, value: 'newFoo' },
        { id: 1, value: 'newBar' },
      ],
      [
        { id: 0, value: 'newNewFoo' },
        { id: 1, value: 'newNewBar' },
        { id: 2, value: 'faz' },
      ],
      [
        { id: 0, value: 'newNewFoo' },
        { id: 1, value: 'newNewBar' },
        { id: 2, value: 'faz' },
        { id: 3, value: 'baz' },
      ],
    ]);

    // setState now should override the future history
    act(() => {
      setState([
        { id: 0, value: 'clearedFoo' },
        { id: 1, value: 'clearedBar' },
      ]);
    });
    [
      state,
      setState,
      {
        history,
        stepNum,
        checkpoint,
        isCheckpointValid,
        saveCheckpoint,
        restoreCheckpoint,
      },
    ] = result.current;
    expect(checkpoint).toEqual(2);
    expect(isCheckpointValid).toBe(true);
    expect(stepNum).toEqual(3);
    expect(state).toEqual([
      { id: 0, value: 'clearedFoo' },
      { id: 1, value: 'clearedBar' },
    ]);
    expect(history).toEqual([
      [
        { id: 0, value: 'foo' },
        { id: 1, value: 'bar' },
      ],
      [
        { id: 0, value: 'foo' },
        { id: 1, value: 'newBar' },
      ],
      [
        { id: 0, value: 'newFoo' },
        { id: 1, value: 'newBar' },
      ],
      [
        { id: 0, value: 'clearedFoo' },
        { id: 1, value: 'clearedBar' },
      ],
    ]);
  });

  test('Does not permit restoring a checkpoint if it no longer exists', () => {
    const initialState = [
      { id: 0, value: 'foo' },
      { id: 1, value: 'bar' },
    ];

    const { result } = renderHook(() => useImmerState(initialState));

    // first render
    let [
      state,
      setState,
      {
        history,
        stepNum,
        checkpoint,
        isCheckpointValid,
        saveCheckpoint,
        restoreCheckpoint,
        goTo,
      },
    ] = result.current;
    expect(checkpoint).toEqual(0);
    expect(isCheckpointValid).toBe(true);
    expect(stepNum).toEqual(0);
    expect(state).toEqual([
      { id: 0, value: 'foo' },
      { id: 1, value: 'bar' },
    ]);
    expect(history).toEqual([
      [
        { id: 0, value: 'foo' },
        { id: 1, value: 'bar' },
      ],
    ]);

    // [ACTION] - change value of second item
    act(() => {
      setState((prev) => {
        prev[1]!.value = 'newBar';
      });
    });

    // second render
    [
      state,
      setState,
      {
        history,
        stepNum,
        checkpoint,
        saveCheckpoint,
        restoreCheckpoint,
        goTo,
        isCheckpointValid,
      },
    ] = result.current;
    // [ASSERT] - details should be correct
    expect(checkpoint).toEqual(0);
    expect(isCheckpointValid).toBe(true);
    expect(stepNum).toEqual(1);
    expect(state).toEqual([
      { id: 0, value: 'foo' },
      { id: 1, value: 'newBar' },
    ]);
    expect(history).toEqual([
      [
        { id: 0, value: 'foo' },
        { id: 1, value: 'bar' },
      ],
      [
        { id: 0, value: 'foo' },
        { id: 1, value: 'newBar' },
      ],
    ]);

    // [ACTION] - save checkpoint at index 1
    act(() => {
      saveCheckpoint();
    });
    // [ACTION] - go to index 0
    act(() => {
      goTo(0);
    });

    // third render
    [
      state,
      setState,
      {
        history,
        stepNum,
        checkpoint,
        isCheckpointValid,
        saveCheckpoint,
        restoreCheckpoint,
      },
    ] = result.current;
    // [ASSERT] - checkpoint should be at 1, state should be at index 0
    expect(checkpoint).toEqual(1);
    expect(isCheckpointValid).toBe(true);
    expect(stepNum).toEqual(0);
    expect(state).toEqual([
      { id: 0, value: 'foo' },
      { id: 1, value: 'bar' },
    ]);
    expect(history).toEqual([
      [
        { id: 0, value: 'foo' },
        { id: 1, value: 'bar' },
      ],
      [
        { id: 0, value: 'foo' },
        { id: 1, value: 'newBar' },
      ],
    ]);

    // [ACTION] - set state twice
    act(() => {
      // set state again (twice!), which overwrites history from index 1,
      // making our saved checkpoint at index 1 invalid
      setState((prev) => {
        prev[0]!.value = 're-wrote the timeline';
      });
      setState((prev) => {
        prev[0]!.value = 're-wrote the timeline again';
      });
    });

    // fourth render
    [
      state,
      setState,
      {
        history,
        stepNum,
        checkpoint,
        isCheckpointValid,
        saveCheckpoint,
        restoreCheckpoint,
      },
    ] = result.current;
    // [ASSERT] - history including checkpoint should be overridden
    // so checkpoint should be invalid
    expect(checkpoint).toEqual(1);
    expect(isCheckpointValid).toBe(false);
    expect(stepNum).toEqual(2);
    expect(state).toEqual([
      { id: 0, value: 're-wrote the timeline again' },
      { id: 1, value: 'bar' },
    ]);
    expect(history).toEqual([
      [
        { id: 0, value: 'foo' },
        { id: 1, value: 'bar' },
      ],
      [
        { id: 0, value: 're-wrote the timeline' },
        { id: 1, value: 'bar' },
      ],
      [
        { id: 0, value: 're-wrote the timeline again' },
        { id: 1, value: 'bar' },
      ],
    ]);

    // [ACTION] - attempt to restore the (invalid) checkpoint
    // silence the expected console error for the tests
    const mock = jest.spyOn(console, 'error');
    mock.mockImplementation(() => null);
    act(() => {
      // this should intentionally not work since the checkpoint is now gone from the history
      restoreCheckpoint();
    });
    mock.mockRestore();

    // fifth render
    [
      state,
      setState,
      {
        history,
        stepNum,
        checkpoint,
        isCheckpointValid,
        saveCheckpoint,
        restoreCheckpoint,
      },
    ] = result.current;
    // [ASSERT] - details should not have changed since the checkpoint was invalid
    expect(checkpoint).toEqual(1);
    expect(isCheckpointValid).toBe(false);
    expect(stepNum).toEqual(2);
    expect(state).toEqual([
      { id: 0, value: 're-wrote the timeline again' },
      { id: 1, value: 'bar' },
    ]);
    expect(history).toEqual([
      [
        { id: 0, value: 'foo' },
        { id: 1, value: 'bar' },
      ],
      [
        { id: 0, value: 're-wrote the timeline' },
        { id: 1, value: 'bar' },
      ],
      [
        { id: 0, value: 're-wrote the timeline again' },
        { id: 1, value: 'bar' },
      ],
    ]);

    // [ACTION] - save checkpoint at current step (latest, index 2)
    // and go back one step
    const [, , { goBack }] = result.current;
    act(() => {
      saveCheckpoint();
      goBack();
    });
    [
      state,
      setState,
      { history, stepNum, checkpoint, isCheckpointValid },
    ] = result.current;
    // [ASSERT] - checkpoint should be at index 2, and should be valid
    // state should be at index 1
    expect(checkpoint).toEqual(2);
    expect(isCheckpointValid).toBe(true);
    expect(stepNum).toEqual(1);
    expect(state).toEqual([
      { id: 0, value: 're-wrote the timeline' },
      { id: 1, value: 'bar' },
    ]);
    expect(history).toEqual([
      [
        { id: 0, value: 'foo' },
        { id: 1, value: 'bar' },
      ],
      [
        { id: 0, value: 're-wrote the timeline' },
        { id: 1, value: 'bar' },
      ],
      [
        { id: 0, value: 're-wrote the timeline again' },
        { id: 1, value: 'bar' },
      ],
    ]);

    // [ACTION] - set new state
    act(() => {
      setState((prev) => {
        prev[0]!.value = 'changed state where checkpoint pointed';
      });
    });

    // [ASSERT] - checkpoint should no longer be valid
    // state should be updated
    [
      state,
      setState,
      { history, stepNum, checkpoint, isCheckpointValid },
    ] = result.current;
    expect(checkpoint).toEqual(2);
    expect(isCheckpointValid).toBe(false);
    expect(stepNum).toEqual(2);
    expect(state).toEqual([
      { id: 0, value: 'changed state where checkpoint pointed' },
      { id: 1, value: 'bar' },
    ]);
    expect(history).toEqual([
      [
        { id: 0, value: 'foo' },
        { id: 1, value: 'bar' },
      ],
      [
        { id: 0, value: 're-wrote the timeline' },
        { id: 1, value: 'bar' },
      ],
      [
        { id: 0, value: 'changed state where checkpoint pointed' },
        { id: 1, value: 'bar' },
      ],
    ]);
  });

  test('can reset to original state', () => {
    const initialState = [
      { id: 0, value: 'foo' },
      { id: 1, value: 'bar' },
    ];

    type InitialTestState = typeof initialState;

    const { result } = renderHook(() => useImmerState(initialState));

    // first render
    let [state, setState, { history, stepNum, reset }] = result.current;

    expectType<InitialTestState>(state);
    expectType<(foo: Updates<InitialTestState>) => void>(setState);
    expectType<readonly InitialTestState[]>(history);
    expectType<number>(stepNum);
    expectType<() => void>(reset);

    expect(stepNum).toEqual(0);
    expect(state).toEqual([
      { id: 0, value: 'foo' },
      { id: 1, value: 'bar' },
    ]);

    // history should just have initial state
    expect(history).toEqual([
      [
        { id: 0, value: 'foo' },
        { id: 1, value: 'bar' },
      ],
    ]);
    act(() => {
      setState((prev) => {
        prev[1]!.value = 'newBar';
      });
    });
    [state, setState, { history, stepNum, reset }] = result.current;
    expect(stepNum).toEqual(1);
    expect(state).toEqual([
      { id: 0, value: 'foo' },
      { id: 1, value: 'newBar' },
    ]);

    // history should be extended
    expect(history).toEqual([
      [
        { id: 0, value: 'foo' },
        { id: 1, value: 'bar' },
      ],
      [
        { id: 0, value: 'foo' },
        { id: 1, value: 'newBar' },
      ],
    ]);
    act(() => {
      setState((prev) => {
        prev[0]!.value = 'newFoo';
      });
    });
    [state, setState, { history, stepNum, reset }] = result.current;
    expect(stepNum).toEqual(2);
    expect(state).toEqual([
      { id: 0, value: 'newFoo' },
      { id: 1, value: 'newBar' },
    ]);

    // history should be extended
    expect(history).toEqual([
      [
        { id: 0, value: 'foo' },
        { id: 1, value: 'bar' },
      ],
      [
        { id: 0, value: 'foo' },
        { id: 1, value: 'newBar' },
      ],
      [
        { id: 0, value: 'newFoo' },
        { id: 1, value: 'newBar' },
      ],
    ]);
    act(() => {
      reset();
    });
    [state, setState, { history, stepNum, reset }] = result.current;
    expect(stepNum).toEqual(0);
    expect(state).toEqual([
      { id: 0, value: 'foo' },
      { id: 1, value: 'bar' },
    ]);

    // history should be reset to initial state
    expect(history).toEqual([
      [
        { id: 0, value: 'foo' },
        { id: 1, value: 'bar' },
      ],
    ]);
    act(() => {
      setState((prev) => {
        prev[0]!.value = 're-wrote the timeline';
      });
    });
    [state, , { history, stepNum }] = result.current;
    expect(stepNum).toEqual(1);
    expect(state).toEqual([
      { id: 0, value: 're-wrote the timeline' },
      { id: 1, value: 'bar' },
    ]);

    // history should be extended
    expect(history).toEqual([
      [
        { id: 0, value: 'foo' },
        { id: 1, value: 'bar' },
      ],
      [
        { id: 0, value: 're-wrote the timeline' },
        { id: 1, value: 'bar' },
      ],
    ]);
  });

  test('can manage checkpoints while excluding items from history', () => {
    const initialState = [
      { id: 0, value: 'foo' },
      { id: 1, value: 'bar' },
    ];

    const { result } = renderHook(() => useImmerState(initialState));

    // [ASSERT] - initial details should be as per initial state & default
    let [
      state,
      setState,
      {
        history,
        stepNum,
        checkpoint,
        isCheckpointValid,
        saveCheckpoint,
        restoreCheckpoint,
        goBack,
        goForward,
      },
    ] = result.current;
    expect(checkpoint).toEqual(0);
    expect(isCheckpointValid).toBe(true);
    expect(stepNum).toEqual(0);
    expect(state).toEqual([
      { id: 0, value: 'foo' },
      { id: 1, value: 'bar' },
    ]);
    expect(history).toEqual([
      [
        { id: 0, value: 'foo' },
        { id: 1, value: 'bar' },
      ],
    ]);

    // [ACTION] - set state while excluding from history
    act(() => {
      setState((prev) => {
        prev[1]!.value = 'alteredBar';
      }, false);
    });

    // [ASSERT] - details should be updated, but history unaffected
    [
      state,
      setState,
      {
        history,
        stepNum,
        checkpoint,
        isCheckpointValid,
        saveCheckpoint,
        restoreCheckpoint,
        goBack,
        goForward,
      },
    ] = result.current;
    expect(checkpoint).toEqual(0);
    expect(isCheckpointValid).toBe(true);
    expect(stepNum).toEqual(0);
    expect(state).toEqual([
      { id: 0, value: 'foo' },
      { id: 1, value: 'alteredBar' },
    ]);
    expect(history).toEqual([
      [
        { id: 0, value: 'foo' },
        { id: 1, value: 'bar' },
      ],
    ]);

    // [ACTION] - change state, counting towards history
    act(() => {
      setState((prev) => {
        prev[0]!.value = 'alteredFoo';
      });
    });

    // [ASSERT] - new details should reflect the altered data
    [
      state,
      setState,
      {
        history,
        stepNum,
        checkpoint,
        isCheckpointValid,
        saveCheckpoint,
        restoreCheckpoint,
        goBack,
        goForward,
      },
    ] = result.current;
    expect(checkpoint).toEqual(0);
    expect(isCheckpointValid).toBe(true);
    expect(stepNum).toEqual(1);
    expect(state).toEqual([
      { id: 0, value: 'alteredFoo' },
      // note that the change from the 'excluded from history' item is kept here
      { id: 1, value: 'alteredBar' },
    ]);
    expect(history).toEqual([
      [
        { id: 0, value: 'foo' },
        { id: 1, value: 'bar' },
      ],
      [
        { id: 0, value: 'alteredFoo' },
        { id: 1, value: 'alteredBar' },
      ],
    ]);

    // [ACTION] - save checkpoint at current step/index (1)
    act(() => {
      saveCheckpoint();
    });
    // [ASSERT] - new details should reflect the altered data
    [
      state,
      setState,
      {
        history,
        stepNum,
        checkpoint,
        isCheckpointValid,
        saveCheckpoint,
        restoreCheckpoint,
        goBack,
        goForward,
      },
    ] = result.current;
    expect(checkpoint).toEqual(1);
    expect(isCheckpointValid).toBe(true);
    expect(stepNum).toEqual(1);
    expect(state).toEqual([
      { id: 0, value: 'alteredFoo' },
      { id: 1, value: 'alteredBar' },
    ]);
    expect(history).toEqual([
      [
        { id: 0, value: 'foo' },
        { id: 1, value: 'bar' },
      ],
      [
        { id: 0, value: 'alteredFoo' },
        { id: 1, value: 'alteredBar' },
      ],
    ]);

    // [ACTION] - add new state excluded from history
    act(() => {
      setState((prev) => {
        prev[0]!.value = 'doubleAlteredFoo';
      }, false);
    });
    // [ASSERT] - new details should reflect the altered data
    [
      state,
      setState,
      {
        history,
        stepNum,
        checkpoint,
        isCheckpointValid,
        saveCheckpoint,
        restoreCheckpoint,
        goBack,
        goForward,
      },
    ] = result.current;
    expect(checkpoint).toEqual(1);
    expect(isCheckpointValid).toBe(true);
    expect(stepNum).toEqual(1);
    expect(state).toEqual([
      { id: 0, value: 'doubleAlteredFoo' },
      { id: 1, value: 'alteredBar' },
    ]);
    expect(history).toEqual([
      [
        { id: 0, value: 'foo' },
        { id: 1, value: 'bar' },
      ],
      [
        { id: 0, value: 'alteredFoo' },
        { id: 1, value: 'alteredBar' },
      ],
    ]);

    // [ACTION] - save checkpoint again (still at step/index 1)
    act(() => {
      saveCheckpoint();
    });
    // [ASSERT] - should still be at checkpoint 1
    [
      state,
      setState,
      {
        history,
        stepNum,
        checkpoint,
        isCheckpointValid,
        saveCheckpoint,
        restoreCheckpoint,
        goBack,
        goForward,
      },
    ] = result.current;
    expect(checkpoint).toEqual(1);
    expect(isCheckpointValid).toBe(true);
    expect(stepNum).toEqual(1);
    expect(state).toEqual([
      { id: 0, value: 'doubleAlteredFoo' },
      { id: 1, value: 'alteredBar' },
    ]);
    expect(history).toEqual([
      [
        { id: 0, value: 'foo' },
        { id: 1, value: 'bar' },
      ],
      [
        { id: 0, value: 'alteredFoo' },
        { id: 1, value: 'alteredBar' },
      ],
    ]);

    // [ACTION] - restore checkpoint
    act(() => {
      restoreCheckpoint();
    });

    // [ASSERT] - state should be correctly changed as per the checkpoint
    [
      state,
      setState,
      {
        history,
        stepNum,
        checkpoint,
        isCheckpointValid,
        saveCheckpoint,
        restoreCheckpoint,
        goBack,
        goForward,
      },
    ] = result.current;
    expect(checkpoint).toEqual(1);
    expect(isCheckpointValid).toBe(true);
    expect(stepNum).toEqual(1);
    expect(state).toEqual([
      { id: 0, value: 'alteredFoo' },
      { id: 1, value: 'alteredBar' },
    ]);
    expect(history).toEqual([
      [
        { id: 0, value: 'foo' },
        { id: 1, value: 'bar' },
      ],
      [
        { id: 0, value: 'alteredFoo' },
        { id: 1, value: 'alteredBar' },
      ],
    ]);

    // [ACTION] - change state 3 times without affecting history
    act(() => {
      setState((prev) => {
        prev[0]!.value = 'alteredFoo1';
      }, false);
    });
    act(() => {
      setState((prev) => {
        prev[1]!.value = 'alteredBar1';
      }, false);
    });
    act(() => {
      setState((prev) => {
        prev[0]!.value = 'alteredFoo2';
      }, false);
    });

    // [ASSERT] - state should be changed, but history unchanged
    [
      state,
      setState,
      {
        history,
        stepNum,
        checkpoint,
        isCheckpointValid,
        saveCheckpoint,
        restoreCheckpoint,
        goBack,
        goForward,
      },
    ] = result.current;
    expect(checkpoint).toEqual(1);
    expect(isCheckpointValid).toBe(true);
    expect(stepNum).toEqual(1);
    expect(state).toEqual([
      { id: 0, value: 'alteredFoo2' },
      { id: 1, value: 'alteredBar1' },
    ]);
    expect(history).toEqual([
      [
        { id: 0, value: 'foo' },
        { id: 1, value: 'bar' },
      ],
      [
        { id: 0, value: 'alteredFoo' },
        { id: 1, value: 'alteredBar' },
      ],
    ]);

    // [ACTION] - go back one step
    act(() => {
      goBack();
    });

    // [ASSERT] - state should reflect the previous index
    // should not count any changes that ignored history
    [
      state,
      setState,
      {
        history,
        stepNum,
        checkpoint,
        isCheckpointValid,
        saveCheckpoint,
        restoreCheckpoint,
        goBack,
        goForward,
      },
    ] = result.current;
    expect(checkpoint).toEqual(1);
    expect(isCheckpointValid).toBe(true);
    expect(stepNum).toEqual(0);
    expect(state).toEqual([
      { id: 0, value: 'foo' },
      { id: 1, value: 'bar' },
    ]);
    expect(history).toEqual([
      [
        { id: 0, value: 'foo' },
        { id: 1, value: 'bar' },
      ],
      [
        { id: 0, value: 'alteredFoo' },
        { id: 1, value: 'alteredBar' },
      ],
    ]);

    // [ACTION] - go forward one step
    act(() => {
      goForward();
    });

    // [ASSERT] - state should reflect the next index
    // should not count any changes made that ignored history
    [
      state,
      setState,
      {
        history,
        stepNum,
        checkpoint,
        isCheckpointValid,
        saveCheckpoint,
        restoreCheckpoint,
        goBack,
        goForward,
      },
    ] = result.current;
    expect(checkpoint).toEqual(1);
    expect(isCheckpointValid).toBe(true);
    expect(stepNum).toEqual(1);
    expect(state).toEqual([
      { id: 0, value: 'alteredFoo' },
      { id: 1, value: 'alteredBar' },
    ]);
    expect(history).toEqual([
      [
        { id: 0, value: 'foo' },
        { id: 1, value: 'bar' },
      ],
      [
        { id: 0, value: 'alteredFoo' },
        { id: 1, value: 'alteredBar' },
      ],
    ]);
  });
});
