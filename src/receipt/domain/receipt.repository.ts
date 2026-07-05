import { Repository } from '@/utils/ddd';

import { ReceiptAggregate } from './receipt.aggregate';
import { IReceiptEntity } from './receipt.entity';

/**
 * It's an abstract class because Class can be used as a token in NestJS DI.
 * This class is merely used as an interface of the repository without concrete implementation.
 */
export abstract class ReceiptRepository extends Repository<ReceiptAggregate> {
  public abstract build(receipt: IReceiptEntity): ReceiptAggregate;
}
