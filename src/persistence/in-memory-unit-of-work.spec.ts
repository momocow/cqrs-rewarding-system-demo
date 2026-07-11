import { InMemoryUnitOfWork } from './in-memory-unit-of-work';

describe('InMemoryUnitOfWork', () => {
  it('runs the work callback and returns its result', async () => {
    const uow = new InMemoryUnitOfWork();
    const work = jest.fn(() => Promise.resolve('done'));

    const result = await uow.run(work);

    expect(work).toHaveBeenCalledTimes(1);
    expect(result).toBe('done');
  });
});
