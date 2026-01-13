import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { chromium, Page } from 'playwright';
import * as schema from '../database/schema/broker';
import { eq } from 'drizzle-orm';
import {
  NepseAuthContext,
  NepseAuthService,
} from 'src/nepseAuth/nepseAuth.service';

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
  ) {}

  async fetchAndSaveBrokers(): Promise<BrokerResult> {
    const browser = await chromium.launch({
      headless: true,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--no-sandbox',
      ],
    });
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
    });
    const page = await context.newPage();

    console.log('Fetching brokers...');

    try {
      const authContext = await this.nepseAuthService.getCredentials(page);

      console.log('Authenticated');

      console.log('Auth context:', authContext);

      const brokersData = await this.fetchBrokers(page, authContext);

      console.log('Brokers:', brokersData);

      const brokers = brokersData.content;

      const saveData = await this.saveBrokers(brokers);

      return saveData;
    } catch (error) {
      console.error('Error fetching broker:', error);
      throw error;
    }
  }

  private async fetchBrokers(
    page: Page,
    context: NepseAuthContext,
  ): Promise<any> {
    const brokersData: any = await page.evaluate(
      async ({ token }) => {
        const res = await fetch(
          'https://nepalstock.com.np/api/nots/member?&size=500',
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              Authorization: token,
            },
          },
        );

        const text = await res.text();
        try {
          return JSON.parse(text);
        } catch {
          return { error: 'Not JSON', raw: text };
        }
      },
      { token: context.token },
    );

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
