import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { BrowserContext, chromium, Page } from 'playwright';
import * as schema from '../database/schema/broker';
import { eq } from 'drizzle-orm';
import {
  NepseAuthContext,
  NepseAuthService,
} from 'src/nepseAuth/nepseAuth.service';
import { PlayWrightService } from 'src/playWright/playWright.service';

export interface BrokerResult {
  totalBrokers: number;
}

interface Broker {
  name: string;
  code: number;
  tmslink: string;
}

export interface BrokerResult {
  totalBrokers: number;
  insertedBrokers: number;
}

@Injectable()
export class BrokerService {
  constructor(
    @Inject('DB') private db: NodePgDatabase<typeof schema>,
    private readonly nepseAuthService: NepseAuthService,
    private readonly playWrightService: PlayWrightService,
  ) {}

  async fetchAndSaveBrokers(): Promise<BrokerResult> {
    const { browser, context, page } =
      await this.playWrightService.initializeBrowserContext();

    console.log('Fetching brokers...');

    try {
      const authContext = await this.nepseAuthService.getCredentials(page);

      console.log('Authenticated');

      const brokersData = await this.fetchBrokers(context, authContext);

      const brokers = brokersData.content;

      console.log('Brokers:', brokers.length);

      const saveData = await this.saveBrokers(brokers);

      return saveData;
    } catch (error) {
      console.error('Error fetching broker:', error);
      throw error;
    }
  }

  private async fetchBrokers(
    context: BrowserContext,
    authContext: NepseAuthContext,
  ): Promise<any> {
    const brokersDataRes = await context.request.get(
      `https://nepalstock.com.np/api/nots/member?&size=500`,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: authContext.token,
        },
      },
    );

    const brokersData = await brokersDataRes.json();

    return brokersData;
  }

  private async saveBrokers(brokers: any[]): Promise<BrokerResult> {
    const parsedBrokers: Broker[] = brokers.map((broker) => ({
      name: broker.memberName,
      code: broker.memberCode,
      tmslink: broker.memberTMSLinkMapping?.tmsLink || '',
    }));

    let insertedBrokers = 0;

    for (const broker of parsedBrokers) {
      const doesBrokerExists = await this.db
        .select({ code: schema.broker.code })
        .from(schema.broker)
        .where(eq(schema.broker.code, broker.code));

      if (doesBrokerExists.length === 0) {
        await this.db
          .insert(schema.broker)
          .values(broker)
          .onConflictDoNothing();
        insertedBrokers++;
      }
    }

    return {
      totalBrokers: parsedBrokers.length,
      insertedBrokers: insertedBrokers,
    };
  }

  public async getAllBrokers() {
    const result = await this.db
      .select({
        id: schema.broker.id,
        name: schema.broker.name,
        code: schema.broker.code,
        tmslink: schema.broker.tmslink,
      })
      .from(schema.broker);

    console.log(`Selected ${result.length} brokers`);

    return result;
  }
}
