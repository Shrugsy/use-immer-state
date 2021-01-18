/* eslint-disable @typescript-eslint/no-explicit-any */

function isImmutable(value: unknown): boolean {
  return (
    typeof value !== "object" || value === null || typeof value === "undefined"
  );
}

interface TrackedProperty {
  value: any;
  children: Record<string, any>;
}

function detectMutations(
  trackedProperty: TrackedProperty,
  obj: any,
  sameParentRef = false,
  path: string[] = []
): { wasMutated: boolean; path?: string[] } {
  const prevObj = trackedProperty ? trackedProperty.value : undefined;

  const sameRef = prevObj === obj;

  if (sameParentRef && !sameRef && !Number.isNaN(obj)) {
    return { wasMutated: true, path };
  }

  if (isImmutable(prevObj) || isImmutable(obj)) {
    return { wasMutated: false };
  }

  // Gather all keys from prev (tracked) and after objs
  const keysToDetect: Record<string, boolean> = {};
  Object.keys(trackedProperty.children).forEach((key) => {
    keysToDetect[key] = true;
  });
  Object.keys(obj).forEach((key) => {
    keysToDetect[key] = true;
  });

  const keys = Object.keys(keysToDetect);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const childPath = path.concat(key);

    const result = detectMutations(
      trackedProperty.children[key],
      obj[key],
      sameRef,
      childPath
    );

    if (result.wasMutated) {
      return result;
    }
  }
  return { wasMutated: false };
}

function trackProperties(obj: Record<string, any>, path: string[] = []) {
  const tracked: Partial<TrackedProperty> = { value: obj };

  if (!isImmutable(obj)) {
    tracked.children = {};

    for (const key in obj) {
      const childPath = path.concat(key);

      tracked.children[key] = trackProperties(obj[key], childPath);
    }
  }
  return tracked as TrackedProperty;
}

export function trackForMutations(obj: any) {
  const trackedProperties = trackProperties(obj);
  return {
    detectMutations() {
      return detectMutations(trackedProperties, obj);
    },
  };
}

export function getValueAtPath(obj: any, path: string[] = []) {
  try {
    return path.reduce((prev, curr) => {
      if (!isImmutable(prev) && curr in prev) {
        return prev[curr];
      }
      return prev;
    }, obj);
  } catch (err) {
    return "(Unable to retrieve value from path)";
  }
}
