import { ReceiptAggregate } from './receipt.aggregate';
import { ReceiptCreatedEvent } from './receipt.event';

describe('ReceiptAggregate', () => {
  it('emits a single ReceiptCreatedEvent when created', () => {
    const aggregate = new ReceiptAggregate({
      id: 'receipt-1',
      organizationId: 'org-1',
      content: 'a coffee receipt',
    });

    aggregate.create();

    const events = aggregate.getUncommittedEvents();
    expect(events).toHaveLength(1);

    const [event] = events;
    expect(event).toBeInstanceOf(ReceiptCreatedEvent);
    expect(event).toMatchObject({
      receiptId: 'receipt-1',
      organizationId: 'org-1',
      content: 'a coffee receipt',
    });
  });
});
