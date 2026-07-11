export interface IRewardQueryOrganization {
  id: string;
  name: string;
  creditLimit: number;
}

export interface IRewardQuerySession {
  id: string;
  organizationId: string;
  startTime: Date;
  endTime: Date;
  totalTransactionAmount: number;
  totalReceiptCount: number;
  totalTransactionPointAmount: number;
  totalReceiptPointAmount: number;
}

export interface IRewardDemoReadModel {
  organizations: IRewardQueryOrganization[];
  sessions: IRewardQuerySession[];
}

/**
 * Read-side port for the demo page. Returns organizations and reward sessions
 * with persisted totals and point subtotals — WITHOUT reward policies, which
 * are domain defaults enriched by the query handler.
 *
 * Abstract class so it can be a NestJS DI token.
 */
export abstract class RewardQueryRepository {
  public abstract getDemoData(): Promise<IRewardDemoReadModel>;
}
