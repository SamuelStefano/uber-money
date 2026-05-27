export const uid = (prefix = ''): string =>
  prefix + Math.random().toString(36).slice(2, 9).toUpperCase()

export const sleep = (min: number, max: number): Promise<void> =>
  new Promise((r) => setTimeout(r, min + Math.random() * (max - min)))
