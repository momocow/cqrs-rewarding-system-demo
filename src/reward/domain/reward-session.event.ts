import { DomainEvent, IDomainEvent } from '@/utils/ddd';

import { IReceipt, ITransaction, PointType, RewardSource } from '../types';

export interface IRewardSessionCreatedEvent extends IDomainEvent {
  sessionId: string;
  startTime: Date;
  endTime: Date;
}

/**
 * Session creation is global (not scoped to an organization), so this event
 * extends `DomainEvent` directly rather than the org-bearing
 * `RewardSessionEvent` base.
 */
export class RewardSessionCreatedEvent
  extends DomainEvent<IRewardSessionCreatedEvent>
  implements IRewardSessionCreatedEvent
{
  declare public readonly sessionId: string;
  declare public readonly startTime: Date;
  declare public readonly endTime: Date;
}

export interface IRewardSessionEvent extends IDomainEvent {
  sessionId: string;
  organizationId: string;
}

export abstract class RewardSessionEvent<
  E extends IRewardSessionEvent = IRewardSessionEvent,
>
  extends DomainEvent<E>
  implements IRewardSessionEvent
{
  declare public readonly sessionId: string;
  declare public readonly organizationId: string;
}

export interface IPointRewardedEvent extends IRewardSessionEvent {
  pointAmount: number;
  totalPointAmount: number;
  type: PointType;
  source: RewardSource;
}

export class PointRewardedEvent
  extends RewardSessionEvent<IPointRewardedEvent>
  implements IPointRewardedEvent
{
  declare public readonly pointAmount: number;
  declare public readonly totalPointAmount: number;
  declare public readonly type: PointType;
  declare public readonly source: RewardSource;
}

export interface ITransactionRecognizedEvent extends IRewardSessionEvent {
  transaction: ITransaction;
  totalTransactionAmount: number;
}

export class TransactionRecognizedEvent
  extends RewardSessionEvent<ITransactionRecognizedEvent>
  implements ITransactionRecognizedEvent
{
  declare public readonly transaction: ITransaction;
  declare public readonly totalTransactionAmount: number;
}

export interface IReceiptRecognizedEvent extends IRewardSessionEvent {
  receipt: IReceipt;
  totalReceiptCount: number;
}

export class ReceiptRecognizedEvent
  extends RewardSessionEvent<IReceiptRecognizedEvent>
  implements IReceiptRecognizedEvent
{
  declare public readonly receipt: IReceipt;
  declare public readonly totalReceiptCount: number;
}
