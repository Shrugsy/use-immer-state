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
});
