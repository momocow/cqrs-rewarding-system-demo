import { Repository } from '@/utils/ddd';

import { TransactionAggregate } from './transaction.aggregate';
import { ITransactionEntity } from './transaction.entity';

/**
 * It's an abstract class because Class can be used as a token in NestJS DI.
 * This class is merely used as an interface of the repository without concrete implementation.
 */
export abstract class TransactionRepository extends Repository<TransactionAggregate> {
  public abstract build(transaction: ITransactionEntity): TransactionAggregate;
}
