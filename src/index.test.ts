import { act, renderHook } from "@testing-library/react-hooks";
import useImmerState from "./";
import { MutationError } from "./utils";

describe("useImmerState", () => {
  test("can set state normally", () => {
    const { result } = renderHook(() => useImmerState("initial"));

    // first render
    let [state, setState] = result.current;

    expect(state).toEqual("initial");

    /* standard update */
    act(() => setState("foo"));
    expect(state).toEqual("initial"); // should be unchanged

    // second render
    [state, setState] = result.current;
    expect(state).toEqual("foo"); // should be updated state

    /* functional update */
    act(() => setState((prev) => `${prev}bar`));
    expect(state).toEqual("foo"); // should be unchanged

    // third render
    [state, setState] = result.current;
    expect(state).toEqual("foobar");
  });

  test("can set state immutably with functional updates", () => {
    const initialState = [
      { id: 0, value: "foo" },
      { id: 1, value: "bar" },
    ];

    const { result } = renderHook(() => useImmerState(initialState));

    // first render
    let [state, setState] = result.current;
    const stateAtFirstRender = state;

    /* manual immutable update */
    act(() => setState([...initialState, { id: 2, value: "faz" }]));
    expect(state).toEqual([
      { id: 0, value: "foo" },
      { id: 1, value: "bar" },
    ]); // should be unchanged

    // second render
    [state, setState] = result.current;
    const stateAtSecondRender = state;
    expect(state).toEqual([
      { id: 0, value: "foo" },
      { id: 1, value: "bar" },
      { id: 2, value: "faz" },
    ]); // should be unchanged

    /* functional update applied immutably with immer */
    act(() => {
      setState((prev) => {
        prev[1].value = "newBar";
      });
    });
    expect(state).toEqual([
      { id: 0, value: "foo" },
      { id: 1, value: "bar" },
      { id: 2, value: "faz" },
    ]); // should be unchanged

    // third render
    [state, setState] = result.current;
    const stateAtThirdRender = state;
    expect(state).toEqual([
      { id: 0, value: "foo" },
      { id: 1, value: "newBar" },
      { id: 2, value: "faz" },
    ]);

    // final assertions
    expect(stateAtFirstRender).toEqual([
      { id: 0, value: "foo" },
      { id: 1, value: "bar" },
    ]);
    expect(stateAtSecondRender).toEqual([
      { id: 0, value: "foo" },
      { id: 1, value: "bar" },
      { id: 2, value: "faz" },
    ]);
    expect(stateAtThirdRender).toEqual([
      { id: 0, value: "foo" },
      { id: 1, value: "newBar" },
      { id: 2, value: "faz" },
    ]);

    // whole history should line up
    const [, , { history }] = result.current;
    expect(history).toEqual([
      [
        { id: 0, value: "foo" },
        { id: 1, value: "bar" },
      ],
      [
        { id: 0, value: "foo" },
        { id: 1, value: "bar" },
        { id: 2, value: "faz" },
      ],
      [
        { id: 0, value: "foo" },
        { id: 1, value: "newBar" },
        { id: 2, value: "faz" },
      ],
    ]);
  });

  test("logs and throws if mutations are detected", () => {
    const initialState = [
      { id: 0, value: "foo" },
      { id: 1, value: "bar" },
    ];

    const { rerender } = renderHook(() => useImmerState(initialState));

    // first render
    initialState[0].value = "mutatedFoo";

    // silence the expected errors
    const mock = jest.spyOn(console, "error");
    mock.mockImplementation(() => null);
    expect(rerender).toThrow(MutationError);
    mock.mockRestore();
  });

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

  test("can save a checkpoint", () => {
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
});
