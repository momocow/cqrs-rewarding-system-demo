import { TransactionType } from '@/transaction/types';

export enum PointType {
  Rewards = 'rewards',
  Refund = 'refund',
}

/**
 * Source of a reward point, used to account transaction and receipt rewards
 * independently within a session.
 */
export enum RewardSource {
  Transaction = 'transaction',
  Receipt = 'receipt',
}

export interface ITransaction {
  id: string;
  amount: number;
  clearedTime: Date;
  type: TransactionType;
}

export interface IReceipt {
  id: string;
  content: string;
}
