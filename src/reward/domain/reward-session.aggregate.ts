import { TransactionType } from '@/transaction/types';
import { Aggregate } from '@/utils/ddd';
import { sum } from '@/utils/reducer';

import { IReceipt, ITransaction, PointType, RewardSource } from '../types';
import { IOrganizationEntity, OrganizationEntity } from './organization.entity';
import {
  IRewardSessionEntity,
  RewardSessionEntity,
} from './reward-session.entity';
import {
  PointRewardedEvent,
  ReceiptRecognizedEvent,
  RewardSessionCreatedEvent,
  RewardSessionEvent,
  TransactionRecognizedEvent,
} from './reward-session.event';

export class RewardSessionAggregate extends Aggregate<
  RewardSessionEntity,
  RewardSessionEvent | RewardSessionCreatedEvent
> {
  // RewardEntity is the main entity
  declare protected organization?: OrganizationEntity;

  public constructor(
    rewardSession: IRewardSessionEntity,
    organization?: IOrganizationEntity,
  ) {
    super(new RewardSessionEntity(rewardSession));

    if (organization) {
      this.organization = new OrganizationEntity(organization);
    }
  }

  /**
   * Create a new (global) reward session. Does not require an organization.
   */
  public create() {
    this.apply(
      new RewardSessionCreatedEvent({
        sessionId: this.root.id,
        startTime: this.root.startTime,
        endTime: this.root.endTime,
      }),
    );
  }

  /**
   * @todo add transaction ID in order to dedupe,
   *       before dedupe -> rely on event bus with exactly-once guarantee
   *       after dedupe -> can switch to at-least-once guarantee
   *
   */
  public recognizeTransaction(transaction: ITransaction) {
    const signedAmount =
      transaction.type === TransactionType.Refund
        ? -transaction.amount
        : transaction.amount;
    // a refund can only claw back down to zero, never negative
    this.root.totalTransactionAmount = Math.max(
      0,
      this.root.totalTransactionAmount + signedAmount,
    );

    this.apply(
      new TransactionRecognizedEvent({
        sessionId: this.root.id,
        organizationId: this.organization!.id,
        transaction,
        totalTransactionAmount: this.root.totalTransactionAmount,
      }),
    );
  }

  /**
   * This action is idempotent if transaction recognition is deduplicated
   */
  public applyTransactionReward() {
    const ratio =
      this.root.totalTransactionAmount / this.organization!.creditLimit;
    const actualPoints = this.root.totalTransactionPointAmount;
    const expectedPoints = this.root.transactionRewardPolicies
      .filter((p) => p.threshold <= ratio)
      .map((p) => p.points)
      .reduce(sum, 0);
    const deltaPoints = expectedPoints - actualPoints;

    if (deltaPoints !== 0) {
      this.root.totalTransactionPointAmount += deltaPoints;

      this.apply(
        new PointRewardedEvent({
          sessionId: this.root.id,
          organizationId: this.organization!.id,
          pointAmount: deltaPoints,
          totalPointAmount: this.totalPointAmount,
          type: deltaPoints > 0 ? PointType.Rewards : PointType.Refund,
          source: RewardSource.Transaction,
        }),
      );
    }
  }

  /**
   * @todo add receipt ID in order to dedupe,
   *       before dedupe -> rely on event bus with exactly-once guarantee
   *       after dedupe -> can switch to at-least-once guarantee
   *
   */
  public recognizeReceipt(receipt: IReceipt) {
    this.root.totalReceiptCount += 1;

    this.apply(
      new ReceiptRecognizedEvent({
        sessionId: this.root.id,
        organizationId: this.organization!.id,
        receipt,
        totalReceiptCount: this.root.totalReceiptCount,
      }),
    );
  }

  /**
   * This action is idempotent if receipt recognition is deduplicated
   */
  public applyReceiptReward() {
    const count = this.root.totalReceiptCount;
    const actualPoints = this.root.totalReceiptPointAmount;
    const expectedPoints = this.root.receiptRewardPolicies
      .filter((p) => p.threshold <= count)
      .map((p) => p.points)
      .reduce(sum, 0);
    const deltaPoints = expectedPoints - actualPoints;

    if (deltaPoints !== 0) {
      this.root.totalReceiptPointAmount += deltaPoints;

      this.apply(
        new PointRewardedEvent({
          sessionId: this.root.id,
          organizationId: this.organization!.id,
          pointAmount: deltaPoints,
          totalPointAmount: this.totalPointAmount,
          type: deltaPoints > 0 ? PointType.Rewards : PointType.Refund,
          source: RewardSource.Receipt,
        }),
      );
    }
  }

  /**
   * Grand total of points awarded in this session across all sources.
   */
  private get totalPointAmount(): number {
    return (
      this.root.totalTransactionPointAmount + this.root.totalReceiptPointAmount
    );
  }

  public toJSON() {
    return {
      ...(super.toJSON() as { root: IRewardSessionEntity }),
      ...(this.organization
        ? { organization: this.organization.toJSON() }
        : {}),
    };
  }
}
