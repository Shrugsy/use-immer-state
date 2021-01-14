import { renderHook } from "@testing-library/react-hooks";
import useImmerState from "../";
import { MutationError } from "../utils";

describe("mutation logger", () => {
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
});
