import {
  Body,
  Controller,
  Delete,
  Get,
  type MessageEvent,
  Param,
  Post,
  Sse,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { map, Observable } from 'rxjs';

import { CreateRewardSessionCommand } from './usecase/create-reward-session.command';
import { DeleteRewardSessionCommand } from './usecase/delete-reward-session.command';
import {
  GetRewardDemoDataQuery,
  IRewardDemoData,
} from './usecase/get-reward-demo-data.query';
import { RewardEventsEmitter } from './usecase/reward-events.emitter';

/**
 * Request body for creating a reward session. `startTime`/`endTime` are received
 * as ISO strings over the wire and converted to `Date` before dispatching.
 */
export class CreateRewardSessionDto {
  declare public readonly startTime: string;
  declare public readonly endTime: string;
}

@Controller('reward-sessions')
export class RewardController {
  public constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly rewardEventsEmitter: RewardEventsEmitter,
  ) {}

  @Post()
  public async create(@Body() dto: CreateRewardSessionDto): Promise<void> {
    await this.commandBus.execute(
      new CreateRewardSessionCommand({
        startTime: new Date(dto.startTime),
        endTime: new Date(dto.endTime),
      }),
    );
  }

  @Get()
  public async demoData(): Promise<IRewardDemoData> {
    return this.queryBus.execute(new GetRewardDemoDataQuery());
  }

  @Delete(':id')
  public async remove(@Param('id') id: string): Promise<void> {
    await this.commandBus.execute(
      new DeleteRewardSessionCommand({ sessionId: id }),
    );
  }

  @Sse('events')
  public events(): Observable<MessageEvent> {
    return this.rewardEventsEmitter.pointRewarded$.pipe(
      map((data) => ({ data })),
    );
  }
}
