process.env.STORAGE_DRIVER = 'memory';

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';

import { AppModule } from '../src/app.module';
import { IRewardDemoReadModel } from '../src/reward/domain/reward-query.repository';

const ORG_A = '11111111-1111-1111-1111-111111111111';

describe('Memory mode (e2e, no database)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('serves seeded reward demo data', async () => {
    const res = await request(app.getHttpServer())
      .get('/reward-sessions')
      .expect(200);

    const body = res.body as IRewardDemoReadModel;
    expect(body.organizations.length).toBe(2);
    expect(body.sessions.length).toBeGreaterThan(0);
  });

  it('accepts a transaction without a database', async () => {
    await request(app.getHttpServer())
      .post('/transactions')
      .send({
        organizationId: ORG_A,
        cardId: 'card-1',
        amount: 100,
        type: 'spend',
        merchant: 'Acme',
      })
      .expect(201);
  });
});
