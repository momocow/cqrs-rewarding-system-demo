import { Injectable } from '@nestjs/common';

import { PointType, RewardSource } from '../types';

export interface IStoredOrganization {
  id: string;
  name: string;
  creditLimit: number;
}

export interface IStoredSession {
  id: string;
  organizationId: string;
  startTime: Date;
  endTime: Date;
  totalTransactionAmount: number;
  totalReceiptCount: number;
}

export interface IStoredPoint {
  id: string;
  type: PointType;
  source: RewardSource;
  amount: number;
  organizationId: string;
  rewardSessionId: string;
}

/**
 * Shared in-memory backing store for the reward context, injected into both the
 * session repository and the query repository so they see the same data.
 */
@Injectable()
export class RewardInMemoryStore {
  public readonly organizations = new Map<string, IStoredOrganization>();
  public readonly sessions = new Map<string, IStoredSession>();
  public readonly points: IStoredPoint[] = [];
}
