import { useEffect, useRef } from "react";
import { getValueAtPath, trackForMutations } from "./trackForMutations";

export class MutationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MutationError";
    this.message = message;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, MutationError);
    }
  }
}

export function useTrackMutations<T>(obj: T, objectName?: string) {
  const mutationTracker = useRef(trackForMutations(obj));

  useEffect(() => {
    const result = mutationTracker.current.detectMutations();
    if (result.wasMutated) {
      const msgObjName = objectName || "provided";
      const valueAtPath = getValueAtPath(obj, result.path);

      const message = `A state mutation was detected in the ${msgObjName} object at path: ${(
        result.path || []
      ).join(".")}. Value: ${valueAtPath}`;
      throw new MutationError(message);
    }

    mutationTracker.current = trackForMutations(obj);
  });
}
