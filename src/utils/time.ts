/**
 * time machine for testing purpose
 */
export class TimeMachine {
  public constructor(public offset: number = 0) {}

  now(): Date {
    return new Date(Date.now() + this.offset);
  }
}

export const TIME_MACHINE_OFFSET: number =
  process.env.NODE_ENV === 'production'
    ? 0
    : process.env.TIME_MACHINE_OFFSET
      ? parseInt(process.env.TIME_MACHINE_OFFSET, 10)
      : 0;

export const timeMachine = new TimeMachine(TIME_MACHINE_OFFSET);
