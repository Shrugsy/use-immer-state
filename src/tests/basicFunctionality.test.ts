import { act, renderHook } from '@testing-library/react-hooks';
import { expectType } from 'tsd';
import { Updates, useImmerState } from '../';

describe('basic functionality', () => {
  test('can set state normally', () => {
    const { result } = renderHook(() => useImmerState('initial'));

    // first render
    let [state, setState] = result.current;

    expectType<string>(state);
    expectType<(foo: Updates<string>) => void>(setState);

    expect(state).toEqual('initial');

    /* standard update */
    act(() => setState('foo'));
    expect(state).toEqual('initial'); // should be unchanged

    // second render
    [state, setState] = result.current;
    expect(state).toEqual('foo'); // should be updated state

    /* functional update */
    act(() => setState((prev) => `${prev}bar`));
    expect(state).toEqual('foo'); // should be unchanged

    // third render
    [state, setState] = result.current;
    expect(state).toEqual('foobar');
  });

  test('accepts no initial state argument', () => {
    const { result } = renderHook(() => useImmerState());

    const [state] = result.current;

    expectType<undefined>(state);
  });

  test('accepts no initial state argument, with user defined type', () => {
    const { result } = renderHook(() => useImmerState<string>());

    let [state, setState, { history }] = result.current;

    // [ASSERT] - should accept string | undefined
    expectType<string | undefined>(state);
    expectType<readonly (string | undefined)[]>(history);
    // [ASSERT] - state should be undefined, and in history array
    expect(state).toBeUndefined();
    expect(history).toEqual([undefined]);

    // [ACTION] - call setState with a string
    act(() => {
      setState('foo');
    });

    // [ASSERT] - state should update to the given string, and be appended on history
    [state, setState, { history }] = result.current;
    expect(state).toEqual('foo');
    expect(history).toEqual([undefined, 'foo']);
  });

  test('can accept a lazy initializer for initial state', () => {
    const { result } = renderHook(() => useImmerState(() => 'initial'));

    // first render
    let [state, setState] = result.current;

    expectType<string>(state);
    expectType<(foo: Updates<string>) => void>(setState);

    expect(state).toEqual('initial');

    /* standard update */
    act(() => setState('foo'));
    expect(state).toEqual('initial'); // should be unchanged

    // second render
    [state, setState] = result.current;
    expect(state).toEqual('foo'); // should be updated state

    /* functional update */
    act(() => setState((prev) => `${prev}bar`));
    expect(state).toEqual('foo'); // should be unchanged

    // third render
    [state, setState] = result.current;
    expect(state).toEqual('foobar');
  });

  test('can set state immutably with functional updates', () => {
    const initialState = [
      { id: 0, value: 'foo' },
      { id: 1, value: 'bar' },
    ];

    const { result } = renderHook(() => useImmerState(initialState));

    // first render
    let [state, setState] = result.current;

    expectType<typeof initialState>(state);
    expectType<(foo: Updates<typeof initialState>) => void>(setState);

    const stateAtFirstRender = state;

    /* manual immutable update */
    act(() => setState([...initialState, { id: 2, value: 'faz' }]));
    expect(state).toEqual([
      { id: 0, value: 'foo' },
      { id: 1, value: 'bar' },
    ]); // should be unchanged

    // second render
    [state, setState] = result.current;
    const stateAtSecondRender = state;
    expect(state).toEqual([
      { id: 0, value: 'foo' },
      { id: 1, value: 'bar' },
      { id: 2, value: 'faz' },
    ]); // should be unchanged

    /* functional update applied immutably with immer */
    act(() => {
      setState((prev) => {
        prev[1]!.value = 'newBar';
      });
    });
    expect(state).toEqual([
      { id: 0, value: 'foo' },
      { id: 1, value: 'bar' },
      { id: 2, value: 'faz' },
    ]); // should be unchanged

    // third render
    [state, setState] = result.current;
    const stateAtThirdRender = state;
    expect(state).toEqual([
      { id: 0, value: 'foo' },
      { id: 1, value: 'newBar' },
      { id: 2, value: 'faz' },
    ]);

    // final assertions
    expect(stateAtFirstRender).toEqual([
      { id: 0, value: 'foo' },
      { id: 1, value: 'bar' },
    ]);
    expect(stateAtSecondRender).toEqual([
      { id: 0, value: 'foo' },
      { id: 1, value: 'bar' },
      { id: 2, value: 'faz' },
    ]);
    expect(stateAtThirdRender).toEqual([
      { id: 0, value: 'foo' },
      { id: 1, value: 'newBar' },
      { id: 2, value: 'faz' },
    ]);

    // whole history should line up
    const [, , { history }] = result.current;
    expect(history).toEqual([
      [
        { id: 0, value: 'foo' },
        { id: 1, value: 'bar' },
      ],
      [
        { id: 0, value: 'foo' },
        { id: 1, value: 'bar' },
        { id: 2, value: 'faz' },
      ],
      [
        { id: 0, value: 'foo' },
        { id: 1, value: 'newBar' },
        { id: 2, value: 'faz' },
      ],
    ]);
  });

  test('handles setting same state', () => {
    // [ACTION] - render hook with a wrapper to monitor num renders
    let numRenders = 0;
    function useRenderCountingWrapper() {
      const result = useImmerState({ foo: 'fooVal' });
      numRenders++;
      return result;
    }
    const { result } = renderHook(() => useRenderCountingWrapper());

    // first render
    // [ASSERT] - should have correct initial values, with one render
    let [state, setState, { history }] = result.current;
    const stateFirstRender = state;
    expect(state).toEqual({ foo: 'fooVal' });
    expect(history).toEqual([{ foo: 'fooVal' }]);
    expect(numRenders).toEqual(1);

    // [ACTION] - set state to equal the same value
    act(() => {
      setState(state);
    });

    // [ASSERT] - should not re-render, and should not change values
    // should not have contributed to history
    [state, setState, { history }] = result.current;
    // should be referentially equal
    expect(state).toBe(stateFirstRender);
    expect(numRenders).toEqual(1);
    expect(state).toEqual({ foo: 'fooVal' });
    expect(history).toEqual([{ foo: 'fooVal' }]);

    // [ACTION] - set state to a new value
    act(() => {
      setState((prev) => ({
        ...prev,
      }));
    });

    // [ASSERT] - should have re-rendered, and extended history
    [state, setState, { history }] = result.current;
    // should not be referentially equal
    const stateSecondRender = state;
    expect(state).not.toBe(stateFirstRender);
    expect(numRenders).toEqual(2);
    expect(state).toEqual({ foo: 'fooVal' });
    expect(history).toEqual([{ foo: 'fooVal' }, { foo: 'fooVal' }]);

    // [ACTION] - attempt to set new state using functional update without changing anything
    act(() => {
      setState((prev) => {
        return prev;
      });
    });

    // [ASSERT] - should not change values
    // should not have contributed to history
    // WILL re-render once
    [state, setState, { history }] = result.current;
    // should be referentially equal
    expect(state).toBe(stateSecondRender);
    expect(numRenders).toEqual(3);
    expect(state).toEqual({ foo: 'fooVal' });
    expect(history).toEqual([{ foo: 'fooVal' }, { foo: 'fooVal' }]);

    // [ACTION] - attempt to set new state using functional update without changing anything
    act(() => {
      setState((prev) => {
        return prev;
      });
    });

    // [ASSERT] - should not change values
    // should not have contributed to history
    // should NOT re-render since the last attempt didn't change state either
    [state, setState, { history }] = result.current;
    // should be referentially equal
    expect(state).toBe(stateSecondRender);
    expect(numRenders).toEqual(3);
    expect(state).toEqual({ foo: 'fooVal' });
    expect(history).toEqual([{ foo: 'fooVal' }, { foo: 'fooVal' }]);

    // [ACTION] - change state
    act(() => {
      setState((prev) => {
        prev.foo = 'newFooVal';
      });
    });

    // [ASSERT] - should change values, history & re-render
    [state, setState, { history }] = result.current;
    // should be referentially equal
    expect(state).not.toBe(stateSecondRender);
    expect(numRenders).toEqual(4);
    expect(state).toEqual({ foo: 'newFooVal' });
    expect(history).toEqual([
      { foo: 'fooVal' },
      { foo: 'fooVal' },
      { foo: 'newFooVal' },
    ]);
  });
});
