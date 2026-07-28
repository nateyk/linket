export type FirstParam<T extends (...args: never) => unknown> =
  Parameters<T>[0];

export type SecondParam<T extends (...args: never) => unknown> =
  Parameters<T>[1];

export type ThirdParam<T extends (...args: never) => unknown> =
  Parameters<T>[2];
