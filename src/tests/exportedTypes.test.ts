import { expectType } from 'tsd';
import { InitialState, Updates } from '../';

// note: this file doesn't actually run tests with jest, just kept in this format for neatness
// purpose is just for type checking with tsc
describe('exported types', () => {
  test('InitialState accepts generic or lazy initializer that returns the generic', () => {
    // e.g.
    // string should be assignable to initial state<string>
    expectType<InitialState<string>>('foo');
    // lazy initializer that returns string should be assignable to initial state<string>
    expectType<InitialState<string>>(() => 'foo');

    expectType<InitialState<number>>(100);
    expectType<InitialState<number>>(() => 100);

    type Todo = {
      id: number;
      message: string;
      completed: boolean;
    };

    const todo = { id: 0, message: 'foo', completed: false };

    expectType<InitialState<Todo[]>>([todo]);
    expectType<InitialState<Todo[]>>(() => [todo]);
  });

  test('Updates accepts string', () => {
    expectType<Updates<string>>('foo');
    expectType<Updates<string>>((foo: string) => `${foo}bar`);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    expectType<Updates<string>>((foo: string) => undefined);
    expectType<Updates<string>>(() => undefined);

    type Todo = {
      id: number;
      message: string;
      completed: boolean;
    };

    const todo = { id: 0, message: 'foo', completed: false };
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    expectType<Updates<Todo>>((draftTodo: Todo) => todo);
    expectType<Updates<Todo>>((draftTodo: Todo) => ({
      ...draftTodo,
      message: 'foo',
    }));
    // @ts-expect-error 'message' property is wrong type
    expectType<Updates<Todo>>((draftTodo: Todo) => ({
      ...draftTodo,
      message: 100,
    }));
    expectType<Updates<Todo>>(() => todo);
    expectType<Updates<Todo>>(() => undefined);
  });
});
