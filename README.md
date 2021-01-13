# use-immer-state

[![version](https://img.shields.io/npm/v/@shrugsy/use-immer-state)](https://www.npmjs.com/package/@shrugsy/use-immer-state)
![example workflow name](https://github.com/Shrugsy/use-immer-state/workflows/build/badge.svg)
[![codecov](https://img.shields.io/codecov/c/github/shrugsy/use-immer-state)](https://codecov.io/gh/shrugsy/use-immer-state)

A React hook that provides a supercharged version of the `useState` hook. Allows for writing easy immutable updates. Heavily inspired by [@reduxjs/redux-toolkit](https://github.com/reduxjs/redux-toolkit)'s usage of `immer`.

_codesandbox demo TODO:_

## Installation

```
npm i useimmerstate
```

## Features

- Provides same functionality as `useState`.
- When using the 'functional update' setter callback, updates can be written 'mutably', and the setter internally uses `immer` to produce the next immutable state.
- Throws an error if a state mutation is detected between mutations to help fix bad habits (except in production mode).

## Usage

### Basic Usage

TODO:

```

```
