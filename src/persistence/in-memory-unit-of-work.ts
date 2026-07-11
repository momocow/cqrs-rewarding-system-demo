import { Injectable } from '@nestjs/common';

import { UnitOfWork } from '@/utils/ddd';

@Injectable()
export class InMemoryUnitOfWork extends UnitOfWork {
  public run<T>(work: () => Promise<T>): Promise<T> {
    return work();
  }
}
