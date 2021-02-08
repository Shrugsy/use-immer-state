export function isStepValid(step: number, historyLength: number): boolean {
  if (typeof step !== 'number') {
    console.error(
      `Please only pass a number to this function! Received '${step}', type: ${typeof step}.`
    );
    return false;
  }
  if (step < 0) {
    console.error(`Step index ${step} below bounds!`);
    return false;
  }
  if (step >= historyLength) {
    console.error(
      `Step index ${step} above bounds! History length is ${historyLength}`
    );
    return false;
  }
  return true;
}
