// Wartezeiten der Mock-Services. Tests setzen scale auf 0.
export const timing = { scale: 1 };

export function delay(ms: number): Promise<void> {
  if (!timing.scale) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms * timing.scale));
}
