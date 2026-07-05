/**
 * Utility class for classes whose constructor arguments simply mimic their properties.
 * Inherit this class in order to simplify the declaration of constructors.
 *
 * For example,
 * ```ts
 * interface IExample {
 *   prop: string;
 * }
 *
 * class Example extends DataClass<IExample> implements IExample {
 *   declare prop: string;
 * }
 *
 * const example = new Example({ prop: 'test' });
 * assert(example.prop === 'test);
 * ```
 */
export class DataClass<T> {
  public constructor(init: Partial<T>) {
    Object.assign(this, init);
  }

  public toJSON(): T {
    return Object.fromEntries(Object.entries(this)) as T;
  }
}
