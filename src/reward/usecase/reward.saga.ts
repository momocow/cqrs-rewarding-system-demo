import { Injectable } from '@nestjs/common';
import { ofType, Saga } from '@nestjs/cqrs';
import { map, Observable } from 'rxjs';

import { ReceiptCreatedEvent } from '@/receipt/domain/receipt.event';
import { TransactionCreatedEvent } from '@/transaction/domain/transaction.event';

import {
  ReceiptRecognizedEvent,
  TransactionRecognizedEvent,
} from '../domain/reward-session.event';
import { ApplyReceiptRewardCommand } from './apply-receipt-reward.command';
import { ApplyTransactionRewardCommand } from './apply-transaction-reward.command';
import { RecognizeReceiptCommand } from './recognize-receipt.command';
import { RecognizeTransactionCommand } from './recognize-transaction.command';

@Injectable()
export class RewardSaga {
  @Saga()
  public recognizeTransactionSaga(
    event$: Observable<any>,
  ): Observable<RecognizeTransactionCommand> {
    return event$.pipe(
      ofType(TransactionCreatedEvent),
      map(
        (event) =>
          new RecognizeTransactionCommand({
            organizationId: event.organizationId,
            transaction: {
              amount: event.amount,
              clearedTime: event.clearedTime,
              id: event.transactionId,
              type: event.type,
            },
          }),
      ),
    );
  }

  @Saga()
  public applyRewardSaga(
    event$: Observable<any>,
  ): Observable<ApplyTransactionRewardCommand> {
    return event$.pipe(
      ofType(TransactionRecognizedEvent),
      map(
        (event) =>
          new ApplyTransactionRewardCommand({
            organizationId: event.organizationId,
            transaction: event.transaction,
          }),
      ),
    );
  }

  @Saga()
  public recognizeReceiptSaga(
    event$: Observable<any>,
  ): Observable<RecognizeReceiptCommand> {
    return event$.pipe(
      ofType(ReceiptCreatedEvent),
      map(
        (event) =>
          new RecognizeReceiptCommand({
            organizationId: event.organizationId,
            receipt: {
              id: event.receiptId,
              content: event.content,
            },
            time: event.eventTime,
          }),
      ),
    );
  }

  @Saga()
  public applyReceiptRewardSaga(
    event$: Observable<any>,
  ): Observable<ApplyReceiptRewardCommand> {
    return event$.pipe(
      ofType(ReceiptRecognizedEvent),
      map(
        (event) =>
          new ApplyReceiptRewardCommand({
            organizationId: event.organizationId,
            time: event.eventTime,
          }),
      ),
    );
  }
}
