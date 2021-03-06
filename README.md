# use-immer-state

[![version](https://img.shields.io/npm/v/@shrugsy/use-immer-state)](https://www.npmjs.com/package/@shrugsy/use-immer-state)
[![build](https://github.com/Shrugsy/use-immer-state/workflows/build/badge.svg)](https://github.com/Shrugsy/use-immer-state/actions)
[![codecov](https://img.shields.io/codecov/c/github/shrugsy/use-immer-state)](https://codecov.io/gh/shrugsy/use-immer-state)
[![size](https://img.shields.io/bundlephobia/minzip/@shrugsy/use-immer-state)](https://bundlephobia.com/result?p=@shrugsy/use-immer-state)

A React hook that provides a supercharged version of the `useState` hook. Allows for writing easy immutable updates. Heavily inspired by [@reduxjs/redux-toolkit](https://github.com/reduxjs/redux-toolkit)'s usage of `immer`.

[codesandbox demo](https://codesandbox.io/s/shrugsyuse-immer-state-example-tjptk?file=/src/App.tsx)

## Table of Contents

1. [Installation](#installation)
1. [Features](#features)
1. [Usage](#usage)
1. [Mutation Detection](#mutation-detection)
1. [Re-exports](#re-exports)
1. [Typescript Exports](#typescript-exports)

## Installation

```
npm i @shrugsy/use-immer-state
```

Within your React app:

```ts
import { useImmerState } from "@shrugsy/use-immer-state";
```

**[⬆ back to top](#table-of-contents)**

## Features

- Includes all functionality from `useState`.
- When using the 'functional update' setter callback, updates can be written 'mutably', and the setter internally uses `immer` to produce the next immutable state.
- Throws an error if a state mutation is detected between mutations to help fix bad habits (except in production mode).
- Provides inbuilt time-travel history including 'checkpoints', 'goTo', 'goBack', 'goForward' and 'reset' functionality.
- Full typescript support.

> Note: If you're looking to be able to write 'mutable' draft updates for more complex state, I recommend either:
>
> - Check out [use-local-slice](https://www.npmjs.com/package/use-local-slice).
> - Use [`createReducer`](https://redux-toolkit.js.org/api/createReducer) from [`@reduxjs/toolkit`](https://www.npmjs.com/package/@reduxjs/toolkit) in combination with the inbuilt `useReducer` hook.

**[⬆ back to top](#table-of-contents)**

## Usage

### Basic Usage

At it's core, it can be used identically to the inbuilt `useState` hook.

e.g.

```ts
import { useImmerState } from "@shrugsy/use-immer-state";

const [user, setUser] = useImmerState({ id: 1, name: "john smith" });

function handleUpdateUser(newName) {
  // nothing special here, this is how you might do it with `useState` currently
  setState({ ...user, name: "Jane Doe" });
}
```

When using a callback to perform functional updates, behaviour is as follows:

- New state is computed using the previous state (same as `useState`)
- The updates within the callback can be written `mutably`, but internally produce the next immutable update, without mutating the state

e.g.

```ts
const [user, setUser] = useImmerState({ id: 1, name: "john smith" });

function handleUpdateUser(newName) {
  // the functional update notation allows writing the update mutably, and will internally produce an immutable update without mutating the actual state
  setState((prev) => {
    prev.name = "Jane Doe";
  });
}
```

The benefits shine more for nested updates that would be messy to write manually.
e.g.

```ts
// given some initial state like so:
const initialState = [
  {
    todo: "Learn typescript",
    done: true,
  },
  {
    todo: "Try use-immer-state",
    done: false,
  },
  {
    todo: "Pat myself on the back",
    done: false,
  },
];
```

```ts
const [todos, setTodos] = useImmerState(initialState);

function handleToggleTodo(index, isDone) {
  setTodos((prevTodos) => {
    if (prevTodos[index]) prevTodos[index].done = isDone;
  });
```

Note: To achieve a similar effect with plain `useState`,
the update would look more like this:

```ts
const [todos, setTodos] = useState(initialState);

function handleToggleTodo(index, isDone) {
  setTodos((prevTodos) => {
    return prevTodos.map((todo, idx) => {
      if (idx !== index) return todo;
      return { ...todo, done: isDone };
    });
  });
}
```

Note that the deeper the nested updates become, the larger the advantage will be to use this notation.

**[⬆ back to top](#table-of-contents)**

### Advanced Usage

The tuple returned by `useImmerState` includes an optional third value; `extraAPI` like so:

```ts
const [state, setState, extraAPI] = useImmerState(initialState);
```

> _Note that you can name the value anything you like, or de-structure the values out directly._

- `state` is the current state, similar to what you would receive from `useState`.  

- `setState` is the function to use when updating state, similar to what you would receive from `useState`.  
Key differences:
  - When providing a callback updater, updates can be written `mutably`, and are applied `immutable` behind the scenes
  - It accepts an optional second boolean argument to dictate whether that state update should contribute to the state 'history' object (defaults true).

- `extraAPI` is an object that contains the following values:

> _Note: For the purposes of the table below, `S` refers to the type of `initialState`._

| Name              | Type                   | Description                                                                            |
| ----------------- | ---------------------- | -------------------------------------------------------------------------------------- |
| history           | ReadOnlyArray\<S\>     | `(default [initialState])` An array of the state history                               |
| stepNum           | number                 | `(default 0)` The current step (index) within the state history                        |
| isFirstStep       | boolean                | Whether the current step is the first step (i.e. if stepNum === 0)                     |
| isLastStep        | boolean                | Whether the current step is the last step (i.e. if stepNum === history.length - 1)     |
| goTo              | (step: number) => void | Change the current state to a particular step (index) within the state history         |
| goBack            | () => void             | Go to the previous step (index) within the state history                               |
| goForward         | () => void             | Go to the next step (index) within the state history                                   |
| saveCheckpoint    | () => void             | Saves the current step (index) within the state history to a 'checkpoint' that can be restored later   |
| restoreCheckpoint | () => void             | Restores the state to the saved 'checkpoint' if it is still valid                      |
| checkpoint        | number                 | `(default 0)` The step (index) within the state history for the saved checkpoint       |
| isCheckpointValid | boolean                | `(default true)` Indicates whether the saved checkpoint is valid and accessible to restore. A checkpoint will be invalidated if the history gets overwritten such that it overwrites the saved checkpoint. History is overwritten when writing new state while at a step number besides the latest. |
| reset             | () => void             | Resets state, history and checkpoint back to the initial state.                        |

Please try the [codesandbox demo](https://codesandbox.io/s/shrugsyuse-immer-state-example-tjptk?file=/src/App.tsx) to see an example of the API in action.

**[⬆ back to top](#table-of-contents)**

## Mutation detection

This library expects that mutating logic is only written using the functional update notation within a `setState` call. Any attempts to mutate the state outside of this are not supported.

If an uncontrolled mutation is detected, a `MutationError` will be thrown (a custom error type exported by this library), and the path detected will be logged to the console to highlight the detected mutation and assist with detecting the cause.

See this [codesandbox example](https://llyz9.csb.app/) to view how the mutation is detected and shown in the console.

![Mutation log output](/assets/mutation_log_output.png?raw=true "Optional Title")

Note:

> This feature is disabled in production mode.

> By default, immer freezes the state recursively after it has been used. This means that attempted mutations will not have an effect, but will not reliably be detected and throw an error for every setup/browser when the attempt is made.  
>  What this means is that the mutation may only be detected in between the first and second state.  
>  This library re-exports `setAutoFreeze` from `immer` which can help narrow down invalid mutation attempts, as calling `setAutoFreeze(false)` will prevent immer freezing the state, and allow the mutation detection from this library to reliably detect uncontrolled mutations occurring to a serializable state value.

**[⬆ back to top](#table-of-contents)**

## Re-exports
The following items are re-exported from other libraries for ease of use:

- [setAutoFreeze](https://immerjs.github.io/immer/freezing/) - Enables / disables automatic freezing of the trees produces. By default enabled.

- [current](https://immerjs.github.io/immer/current/) - Given a draft object (doesn't have to be a tree root), takes a snapshot of the current state of the draft

- [original](https://immerjs.github.io/immer/original/) - Given a draft object (doesn't have to be a tree root), returns the original object at the same path in the original state tree, if present

- castDraft - Converts any immutable type to its mutable counterpart. This is just a cast and doesn't actually do anything

- Draft - Exposed TypeScript type to convert an immutable type to a mutable type

See the following links for more information on the immer API:
https://immerjs.github.io/immer/api/

**[⬆ back to top](#table-of-contents)**

## Typescript exports
The following type definitions are used by this library internally and are exported for typescript users to use as required.

```ts
/** Initial state provided to the hook */
export declare type InitialState<S> = S | (() => S);
```
```ts
/** New state, or a state updater callback provided to a `setState` call */
export declare type Updates<S> = S | ((draftState: Draft<S>) => Draft<S> | void | undefined);
```
```ts
/** Function used to update the state */
export declare type SetState<S> = (updates: Updates<S>, includeInHistory?: boolean) => void;
```
```ts
/** Extra API used for time travel features */
export declare type ExtraAPI<S> = {
    history: readonly S[];
    stepNum: number;
    isFirstStep: boolean;
    isLastStep: boolean;
    goTo: (step: number) => void;
    goBack: () => void;
    goForward: () => void;
    saveCheckpoint: () => void;
    restoreCheckpoint: () => void;
    checkpoint: number;
    isCheckpointValid: boolean;
    reset: () => void;
};
```
```ts
/** Return value of the hook */
export declare type UseImmerStateReturn<S> = readonly [S, SetState<S>, ExtraAPI<S>];
```
```ts
/**
 * Hook similar to useState, but uses immer internally to ensure immutable updates.
 * Allows using the setter function to be written 'mutably',
 * while letting immer take care of applying the immutable updates.
 *
 * Provides time travel support including `history`, `checkpoints`, `goTo`,
 * and `reset` functionality.
 *
 * If not in production mode, checks for mutations between renders and will
 * throw an error if detected.
 *
 * https://github.com/Shrugsy/use-immer-state#readme
 * @param initialState - initial state, or lazy function to return initial state
 * @returns [state, setState, extraAPI]:
 * - state - the current state
 * - setState- A function to update the state
 * - extraAPI - An object containing details and methods related to inbuilt time travel features
 */
export declare function useImmerState<S = undefined>(): UseImmerStateReturn<S | undefined>;
export declare function useImmerState<S>(initialState: InitialState<S>): UseImmerStateReturn<S>;
```
