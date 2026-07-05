import { IQuery } from '@nestjs/cqrs';

import { IRewardPolicy } from '../domain/reward-policy.value-object';

export interface IRewardDemoOrganization {
  id: string;
  name: string;
  creditLimit: number;
}

export interface IRewardDemoSession {
  id: string;
  startTime: Date;
  endTime: Date;
  totalTransactionAmount: number;
  totalReceiptCount: number;
  totalTransactionPointAmount: number;
  totalReceiptPointAmount: number;
  transactionRewardPolicies: IRewardPolicy[];
  receiptRewardPolicies: IRewardPolicy[];
}

export interface IRewardDemoData {
  organizations: IRewardDemoOrganization[];
  sessions: IRewardDemoSession[];
}

/**
 * Read-side query for the demo page: returns every organization and reward
 * session (with the reward policies) so the client can render progress bars.
 */
export class GetRewardDemoDataQuery implements IQuery {}
