export type ActionResult<T = void> =
  | { success: true } & (T extends void ? {} : { data: T })
  | { success: false; error: string };
