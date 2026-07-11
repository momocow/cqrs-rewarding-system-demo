import { OnModuleInit, Type } from '@nestjs/common';
import { AggregateRoot, EventPublisher, IEvent } from '@nestjs/cqrs';

import { DataClass } from './dataclass';

export interface IDomainEvent extends IEvent {
  eventTime: Date;
}

export abstract class DomainEvent<E extends IDomainEvent = IDomainEvent>
  extends DataClass<E>
  implements IDomainEvent
{
  public readonly eventTime: Date = new Date();
}

export abstract class DomainObject<T> extends DataClass<T> {
  public abstract equals(another: unknown): boolean;
}

export interface IEntity {
  id: string;
}

export abstract class Entity<T extends IEntity = IEntity>
  extends DomainObject<T>
  implements IEntity
{
  declare public readonly id: string;

  public equals(another: unknown) {
    if (!(another instanceof Entity)) {
      return false;
    }

    return another.id === this.id;
  }
}

export abstract class ValueObject<T = unknown> extends DomainObject<T> {
  public equals(another: unknown): boolean {
    if (!(another instanceof ValueObject)) {
      return false;
    }

    const entries = Object.entries(this);
    const anotherMap = new Map(Object.entries(another));

    return (
      entries.length === anotherMap.size &&
      entries.every(([k]) => anotherMap.has(k)) &&
      entries.every(([k, v]) => anotherMap.get(k) === v)
    );
  }
}

export interface IAggregate<T extends IEntity> {
  root: T;
}

export class Aggregate<T extends Entity = Entity, E extends IEvent = IEvent>
  extends AggregateRoot<E>
  implements DomainObject<unknown>
{
  public constructor(protected root: T) {
    super();
  }

  public equals(another: unknown): boolean {
    return this.root.equals(another);
  }

  public get id(): string {
    return this.root.id;
  }

  public toJSON() {
    return { root: this.root.toJSON() };
  }
}

/**
 * It's an abstract class because Class can be used as a token in NestJS DI.
 * This class is merely used as an interface of the repository without concrete implementation.
 */
export abstract class Repository<T extends Aggregate> {
  public abstract findOneById(id: string): Promise<T>;
  public abstract save(agg: T): Promise<void>;
}

export abstract class RepositoryImpl<
  T extends Type<Aggregate>,
> implements OnModuleInit {
  declare protected AggregateClass: T;

  public constructor(
    private bareAggregateClass: T,
    protected readonly eventPublisher: EventPublisher,
  ) {}

  public onModuleInit() {
    this.AggregateClass = this.eventPublisher.mergeClassContext(
      this.bareAggregateClass,
    );
  }
}

/**
 * Backend-agnostic unit of work. The Sequelize impl runs `work` inside a
 * database transaction; the in-memory impl just invokes it.
 */
export abstract class UnitOfWork {
  public abstract run<T>(work: () => Promise<T>): Promise<T>;
}
