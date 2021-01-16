# use-immer-state

[![version](https://img.shields.io/npm/v/@shrugsy/use-immer-state)](https://www.npmjs.com/package/@shrugsy/use-immer-state)
![example workflow name](https://github.com/Shrugsy/use-immer-state/workflows/build/badge.svg)
[![codecov](https://img.shields.io/codecov/c/github/shrugsy/use-immer-state)](https://codecov.io/gh/shrugsy/use-immer-state)

A React hook that provides a supercharged version of the `useState` hook. Allows for writing easy immutable updates. Heavily inspired by [@reduxjs/redux-toolkit](https://github.com/reduxjs/redux-toolkit)'s usage of `immer`.

[codesandbox demo](https://codesandbox.io/s/shrugsyuse-immer-state-example-tjptk?file=/src/App.tsx)

## Installation

```
npm i @shrugsy/use-immer-state
```

## Features

- Provides same functionality as `useState`.
- When using the 'functional update' setter callback, updates can be written 'mutably', and the setter internally uses `immer` to produce the next immutable state.
- Throws an error if a state mutation is detected between mutations to help fix bad habits (except in production mode).
- Provides inbuilt time-travel history including 'checkpoints', 'goTo', and 'reset' functionality.
- Full typescript support

> Note: If you're looking to be able to write 'mutable' draft updates for more complex state, I recommend checking out [use-local-slice](https://www.npmjs.com/package/use-local-slice)

## Usage

### Basic Usage

At it's core, it can be used identically to the inbuilt `useState` hook.

e.g.

```ts
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
    prevTodos[index].done = isDone;
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

### Advanced Usage

The tuple returned by `useImmerState` includes an optional third value; `extraAPI` like so:

```ts
const [state, setState, extraAPI] = useImmerState(initialState);
```

> _Note that you can name the value anything you like, or de-structure the values out directly._

`extraAPI` is an object that contains the following values:

> _Note: For the purposes of the table below, `S` refers to the type of `initialState`._

| Name              | Type                   | Description                                                                                                                                                                                                                                                                                         |
| ----------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| history           | S[]                    | `(default [initialState])` An array of the state history                                                                                                                                                                                                                                            |
| stepNum           | number                 | `(default 0)` The current index within the state history                                                                                                                                                                                                                                            |
| goTo              | (step: number) => void | Change the current state to a particular index within the state history                                                                                                                                                                                                                             |
| saveCheckpoint    | () => void             | Saves the current index within the state history to a 'checkpoint' that can be restored later                                                                                                                                                                                                       |
| restoreCheckpoint | () => void             | Restores the state to the saved 'checkpoint' if it is still valid.                                                                                                                                                                                                                                  |
| checkpoint        | number                 | `(default 0)` The index within the state history for the saved checkpoint                                                                                                                                                                                                                           |
| isCheckpointValid | boolean                | `(default true)` Indicates whether the saved checkpoint is valid and accessible to restore. A checkpoint will be invalidated if the history gets overwritten such that it overwrites the saved checkpoint. History is overwritten when writing new state while at a step number besides the latest. |
| reset             | () => void             | Resets state, history and checkpoint back to the initial state.                                                                                                                                                                                                                                     |

Please try the [codesandbox demo](https://codesandbox.io/s/shrugsyuse-immer-state-example-tjptk?file=/src/App.tsx) to see an example of the API in action.
