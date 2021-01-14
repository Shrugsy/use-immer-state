import { act, renderHook } from "@testing-library/react-hooks";
import useImmerState from "../";

describe("extra API", () => {
  test("shows history, step, and can goto a point in history", () => {
    const initialState = [
      { id: 0, value: "foo" },
      { id: 1, value: "bar" },
    ];

    const { result } = renderHook(() => useImmerState(initialState));

    // first render
    let [state, setState, { history, stepNum, goTo }] = result.current;
    expect(stepNum).toEqual(0);
    act(() => {
      setState((prev) => {
        prev[1].value = "newBar";
      });
    });

    // second render
    [state, setState, { history, stepNum, goTo }] = result.current;
    expect(stepNum).toEqual(1);
    expect(state).toEqual([
      { id: 0, value: "foo" },
      { id: 1, value: "newBar" },
    ]);

    // history should be extended
    expect(history).toEqual([
      [
        { id: 0, value: "foo" },
        { id: 1, value: "bar" },
      ],
      [
        { id: 0, value: "foo" },
        { id: 1, value: "newBar" },
      ],
    ]);

    // set new state
    act(() => {
      setState((prev) => {
        prev[0].value = "newFoo";
      });
    });

    // third render
    [state, setState, { history, stepNum, goTo }] = result.current;
    expect(stepNum).toEqual(2);
    expect(state).toEqual([
      { id: 0, value: "newFoo" },
      { id: 1, value: "newBar" },
    ]);

    // history should be extended
    expect(history).toEqual([
      [
        { id: 0, value: "foo" },
        { id: 1, value: "bar" },
      ],
      [
        { id: 0, value: "foo" },
        { id: 1, value: "newBar" },
      ],
      [
        { id: 0, value: "newFoo" },
        { id: 1, value: "newBar" },
      ],
    ]);

    // set new state
    act(() => {
      setState((prev) => {
        prev[0].value = "newNewFoo";
      });
    });

    // fourth render
    [state, setState, { history, stepNum, goTo }] = result.current;
    expect(stepNum).toEqual(3);
    expect(state).toEqual([
      { id: 0, value: "newNewFoo" },
      { id: 1, value: "newBar" },
    ]);

    // history should be extended
    expect(history).toEqual([
      [
        { id: 0, value: "foo" },
        { id: 1, value: "bar" },
      ],
      [
        { id: 0, value: "foo" },
        { id: 1, value: "newBar" },
      ],
      [
        { id: 0, value: "newFoo" },
        { id: 1, value: "newBar" },
      ],
      [
        { id: 0, value: "newNewFoo" },
        { id: 1, value: "newBar" },
      ],
    ]);
    // time travel to step 1
    act(() => {
      goTo(1);
    });

    // fifth render
    [state, setState, { history, stepNum, goTo }] = result.current;
    expect(stepNum).toEqual(1);
    expect(state).toEqual([
      { id: 0, value: "foo" },
      { id: 1, value: "newBar" },
    ]);

    // history should remain
    expect(history).toEqual([
      [
        { id: 0, value: "foo" },
        { id: 1, value: "bar" },
      ],
      [
        { id: 0, value: "foo" },
        { id: 1, value: "newBar" },
      ],
      [
        { id: 0, value: "newFoo" },
        { id: 1, value: "newBar" },
      ],
      [
        { id: 0, value: "newNewFoo" },
        { id: 1, value: "newBar" },
      ],
    ]);
    // set new state, should purge any 'future' history and re-write new
    act(() => {
      setState((prev) => {
        prev[1].value = "re-wrote the timeline";
      });
    });

    // sixth render
    [state, setState, { history, stepNum, goTo }] = result.current;

    expect(stepNum).toEqual(2);
    expect(state).toEqual([
      { id: 0, value: "foo" },
      { id: 1, value: "re-wrote the timeline" },
    ]);

    // history should be re-written
    expect(history).toEqual([
      [
        { id: 0, value: "foo" },
        { id: 1, value: "bar" },
      ],
      [
        { id: 0, value: "foo" },
        { id: 1, value: "newBar" },
      ],
      [
        { id: 0, value: "foo" },
        { id: 1, value: "re-wrote the timeline" },
      ],
    ]);

    // go to step 1
    act(() => {
      goTo(0);
    });

    // seventh render
    [state, setState, { history, stepNum, goTo }] = result.current;

    expect(stepNum).toEqual(0);
    expect(state).toEqual([
      { id: 0, value: "foo" },
      { id: 1, value: "bar" },
    ]);

    // history should remain
    expect(history).toEqual([
      [
        { id: 0, value: "foo" },
        { id: 1, value: "bar" },
      ],
      [
        { id: 0, value: "foo" },
        { id: 1, value: "newBar" },
      ],
      [
        { id: 0, value: "foo" },
        { id: 1, value: "re-wrote the timeline" },
      ],
    ]);

    // set new state
    // should work for non-function setter too
    act(() => {
      setState([
        { id: 0, value: "faz" },
        { id: 1, value: "baz" },
        { id: 2, value: "hello" },
        { id: 3, value: "world" },
      ]);
    });

    // eighth render
    [state, setState, { history, stepNum, goTo }] = result.current;

    expect(stepNum).toEqual(1);
    expect(state).toEqual([
      { id: 0, value: "faz" },
      { id: 1, value: "baz" },
      { id: 2, value: "hello" },
      { id: 3, value: "world" },
    ]);

    // history should be re-written
    expect(history).toEqual([
      [
        { id: 0, value: "foo" },
        { id: 1, value: "bar" },
      ],
      [
        { id: 0, value: "faz" },
        { id: 1, value: "baz" },
        { id: 2, value: "hello" },
        { id: 3, value: "world" },
      ],
    ]);
  });

  test("can save and restore from a checkpoint", () => {
    const initialState = [
      { id: 0, value: "foo" },
      { id: 1, value: "bar" },
    ];

    const { result } = renderHook(() => useImmerState(initialState));

    // first render
    let [
      state,
      setState,
      { history, stepNum, saveCheckpoint, restoreCheckpoint },
    ] = result.current;
    expect(stepNum).toEqual(0);
    act(() => {
      setState((prev) => {
        prev[1].value = "newBar";
      });
    });
    act(() => {
      setState((prev) => {
        prev[0].value = "newFoo";
      });
    });
    // [, , { saveCheckpoint }] = result.current;
    [, , { saveCheckpoint }] = result.current;
    act(() => {
      saveCheckpoint();
    });
    act(() => {
      setState([
        { id: 0, value: "newNewFoo" },
        { id: 1, value: "newNewBar" },
        { id: 2, value: "faz" },
      ]);
    });
    act(() => {
      setState((prev) => {
        prev[3] = { id: 3, value: "baz" };
      });
    });
    // sixth render
    [
      state,
      setState,
      { history, stepNum, saveCheckpoint, restoreCheckpoint },
    ] = result.current;
    expect(stepNum).toEqual(4);
    expect(state).toEqual([
      { id: 0, value: "newNewFoo" },
      { id: 1, value: "newNewBar" },
      { id: 2, value: "faz" },
      { id: 3, value: "baz" },
    ]);
    expect(history).toEqual([
      [
        { id: 0, value: "foo" },
        { id: 1, value: "bar" },
      ],
      [
        { id: 0, value: "foo" },
        { id: 1, value: "newBar" },
      ],
      [
        { id: 0, value: "newFoo" },
        { id: 1, value: "newBar" },
      ],
      [
        { id: 0, value: "newNewFoo" },
        { id: 1, value: "newNewBar" },
        { id: 2, value: "faz" },
      ],
      [
        { id: 0, value: "newNewFoo" },
        { id: 1, value: "newNewBar" },
        { id: 2, value: "faz" },
        { id: 3, value: "baz" },
      ],
    ]);

    act(() => {
      restoreCheckpoint();
    });

    // seventh render
    [
      state,
      setState,
      { history, stepNum, saveCheckpoint, restoreCheckpoint },
    ] = result.current;
    expect(stepNum).toEqual(2);
    expect(state).toEqual([
      { id: 0, value: "newFoo" },
      { id: 1, value: "newBar" },
    ]);
    expect(history).toEqual([
      [
        { id: 0, value: "foo" },
        { id: 1, value: "bar" },
      ],
      [
        { id: 0, value: "foo" },
        { id: 1, value: "newBar" },
      ],
      [
        { id: 0, value: "newFoo" },
        { id: 1, value: "newBar" },
      ],
      [
        { id: 0, value: "newNewFoo" },
        { id: 1, value: "newNewBar" },
        { id: 2, value: "faz" },
      ],
      [
        { id: 0, value: "newNewFoo" },
        { id: 1, value: "newNewBar" },
        { id: 2, value: "faz" },
        { id: 3, value: "baz" },
      ],
    ]);

    // setState now should override the future history
    act(() => {
      setState([
        { id: 0, value: "clearedFoo" },
        { id: 1, value: "clearedBar" },
      ]);
    });
    [
      state,
      setState,
      { history, stepNum, saveCheckpoint, restoreCheckpoint },
    ] = result.current;
    expect(stepNum).toEqual(3);
    expect(state).toEqual([
      { id: 0, value: "clearedFoo" },
      { id: 1, value: "clearedBar" },
    ]);
    expect(history).toEqual([
      [
        { id: 0, value: "foo" },
        { id: 1, value: "bar" },
      ],
      [
        { id: 0, value: "foo" },
        { id: 1, value: "newBar" },
      ],
      [
        { id: 0, value: "newFoo" },
        { id: 1, value: "newBar" },
      ],
      [
        { id: 0, value: "clearedFoo" },
        { id: 1, value: "clearedBar" },
      ],
    ]);
  });

  test("can reset to original state", () => {
    const initialState = [
      { id: 0, value: "foo" },
      { id: 1, value: "bar" },
    ];

    const { result } = renderHook(() => useImmerState(initialState));

    // first render
    let [state, setState, { history, stepNum, reset }] = result.current;
    expect(stepNum).toEqual(0);
    expect(state).toEqual([
      { id: 0, value: "foo" },
      { id: 1, value: "bar" },
    ]);

    // history should just have initial state
    expect(history).toEqual([
      [
        { id: 0, value: "foo" },
        { id: 1, value: "bar" },
      ],
    ]);
    act(() => {
      setState((prev) => {
        prev[1].value = "newBar";
      });
    });
    [state, setState, { history, stepNum, reset }] = result.current;
    expect(stepNum).toEqual(1);
    expect(state).toEqual([
      { id: 0, value: "foo" },
      { id: 1, value: "newBar" },
    ]);

    // history should be extended
    expect(history).toEqual([
      [
        { id: 0, value: "foo" },
        { id: 1, value: "bar" },
      ],
      [
        { id: 0, value: "foo" },
        { id: 1, value: "newBar" },
      ],
    ]);
    act(() => {
      setState((prev) => {
        prev[0].value = "newFoo";
      });
    });
    [state, setState, { history, stepNum, reset }] = result.current;
    expect(stepNum).toEqual(2);
    expect(state).toEqual([
      { id: 0, value: "newFoo" },
      { id: 1, value: "newBar" },
    ]);

    // history should be extended
    expect(history).toEqual([
      [
        { id: 0, value: "foo" },
        { id: 1, value: "bar" },
      ],
      [
        { id: 0, value: "foo" },
        { id: 1, value: "newBar" },
      ],
      [
        { id: 0, value: "newFoo" },
        { id: 1, value: "newBar" },
      ],
    ]);
    act(() => {
      reset();
    });
    [state, setState, { history, stepNum, reset }] = result.current;
    expect(stepNum).toEqual(0);
    expect(state).toEqual([
      { id: 0, value: "foo" },
      { id: 1, value: "bar" },
    ]);

    // history should be extended
    expect(history).toEqual([
      [
        { id: 0, value: "foo" },
        { id: 1, value: "bar" },
      ],
      [
        { id: 0, value: "foo" },
        { id: 1, value: "newBar" },
      ],
      [
        { id: 0, value: "newFoo" },
        { id: 1, value: "newBar" },
      ],
    ]);
    act(() => {
      setState((prev) => {
        prev[0].value = "re-wrote the timeline";
      });
    });
    [state, , { history, stepNum }] = result.current;
    expect(stepNum).toEqual(1);
    expect(state).toEqual([
      { id: 0, value: "re-wrote the timeline" },
      { id: 1, value: "bar" },
    ]);

    // history should be extended
    expect(history).toEqual([
      [
        { id: 0, value: "foo" },
        { id: 1, value: "bar" },
      ],
      [
        { id: 0, value: "re-wrote the timeline" },
        { id: 1, value: "bar" },
      ],
    ]);
  });
});
