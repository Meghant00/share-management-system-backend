import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

import * as schema from '../database/schema/priceHistory';
import { BrowserContext, chromium, Page } from 'playwright';
import {
  NepseAuthContext,
  NepseAuthService,
} from 'src/nepseAuth/nepseAuth.service';
import { and, eq } from 'drizzle-orm';
import { sleep } from 'utils/sleep';

export interface SaveTodaysPriceInPriceHistoryResponse {
  total: number;
  inserted: number;
  updated: number;
}

export interface FetchAndSaveTodaysPriceError {
  message: string;
  success: boolean;
  errorCode?: number;
}

@Injectable()
export class TodaysPriceService {
  constructor(
    @Inject('DB') private db: NodePgDatabase<typeof schema>,
    private readonly nepseAuthService: NepseAuthService,
  ) {}

  public async fetchAndSaveTodaysPrice(): Promise<
    SaveTodaysPriceInPriceHistoryResponse | FetchAndSaveTodaysPriceError
  > {
    try {
      const browser = await chromium.launch({
        headless: true,
        args: ['--disable-blink-features=AutomationControlled'],
      });

      const context = await browser.newContext({
        ignoreHTTPSErrors: true,
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      });

      const page = await context.newPage();

      console.log('Fetching todays price...');

      const authContext = await this.nepseAuthService.getCredentials(page);

      const todaysPrice: any[] = await this.fetchTodaysPrice(
        context,
        page,
        authContext,
      );

      const saveResponse =
        await this.saveTodaysPriceInPriceHistory(todaysPrice);

      return saveResponse;
    } catch (error) {
      console.log(error);

      return {
        message: 'An error occurred while inserting',
        success: false,
      };
    }
  }

  private async fetchTodaysPrice(
    context: BrowserContext,
    playwrightPage: Page,
    authContext: NepseAuthContext,
  ) {
    try {
      let usedAuthContext = authContext;

      const LIMIT = 500;

      const date = new Date();
      const formattedBusinessDate = new Intl.DateTimeFormat('en-CA', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(date);

      const todaysPrice: any[] = [];

      const firstPageResponse = await context.request.post(
        `https://www.nepalstock.com/api/nots/nepse-data/today-price`,
        {
          headers: {
            Authorization: usedAuthContext.token,
            'Content-Type': 'application/json',
          },
          data: {
            id: usedAuthContext.id,
          },
          params: {
            page: 0,
            size: LIMIT,
            businessDate: formattedBusinessDate,
          },
        },
      );

      const firstPagedata = await firstPageResponse.json();

      const firstPageContent: any[] = firstPagedata.content;

      todaysPrice.push(...firstPageContent);

      if (firstPageContent.length < LIMIT) {
        return todaysPrice;
      }

      for (let i = 1; i < firstPagedata.totalPages; i++) {
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            console.log(`Fetching Page ${i}`);

            const todaysPriceRes = await context.request.post(
              `https://www.nepalstock.com/api/nots/nepse-data/today-price`,
              {
                headers: {
                  Authorization: usedAuthContext.token,
                  'Content-Type': 'application/json',
                },
                data: {
                  id: usedAuthContext.id,
                },
                params: {
                  page: i,
                  size: LIMIT,
                  businessDate: formattedBusinessDate,
                },
              },
            );

            const todaysPriceData = await todaysPriceRes.json();

            const content: any[] = todaysPriceData.content;

            todaysPrice.push(...content);

            console.log(`Fetched Page ${i}. Total companies ${content.length}`);

            await sleep(500);
            break;
          } catch (error: any) {
            if (
              error instanceof SyntaxError &&
              error.message.includes('Unexpected token')
            ) {
              console.log('Auth credentials expired. Refreshing... ');

              const newAuthContext =
                await this.nepseAuthService.refreshCredentials(playwrightPage);

              usedAuthContext = newAuthContext;

              continue;
            }

            console.log(error);

            break;
          }
        }
      }

      return todaysPrice;
    } catch (error) {
      console.log(error);
      return [];
    }
  }

  private async saveTodaysPriceInPriceHistory(
    todaysPrice: any[],
  ): Promise<SaveTodaysPriceInPriceHistoryResponse> {
    console.log('saving todays price');

    const parsedDataForPriceHistory: schema.NewPriceHistory[] = todaysPrice.map(
      (company) => {
        return {
          businessDate: company.businessDate,
          securityId: company.securityId,
          openPrice: company.openPrice,
          highPrice: company.highPrice,
          closePrice: company.closePrice,
          averageTradePrice: company.averageTradePrice,
          fiftyTwoWeekHigh: company.fiftyTwoWeekHigh,
          fiftyTwoWeekLow: company.fiftyTwoWeekLow,
          marketCapitalization: company.marketCapitalization,
          previousDayClosePrice: company.previousDayClosePrice,
          totalTradeQuantity: company.totalTradeQuantity,
          totalTrades: company.totalTrades,
          totalTradeValue: company.totalTradeValue,
        };
      },
    );

    let insertedDataInPriceHistory = 0;
    let updatedDataInPriceHistory = 0;

    for (const company of parsedDataForPriceHistory) {
      const doesCompanyExists = await this.db
        .select({
          securityId: schema.priceHistory.securityId,
          businessDate: schema.priceHistory.businessDate,
        })
        .from(schema.priceHistory)
        .where(
          and(
            eq(schema.priceHistory.securityId, company.securityId),
            eq(schema.priceHistory.businessDate, company.businessDate),
          ),
        );

      if (doesCompanyExists.length === 0) {
        await this.db
          .insert(schema.priceHistory)
          .values(company)
          .onConflictDoNothing();

        insertedDataInPriceHistory++;
      } else {
        await this.db
          .update(schema.priceHistory)
          .set(company)
          .where(
            and(
              eq(schema.priceHistory.securityId, company.securityId),
              eq(schema.priceHistory.businessDate, company.businessDate),
            ),
          );

        updatedDataInPriceHistory++;
      }
    }

    console.log('saved todays price');

    return {
      total: 0,
      inserted: insertedDataInPriceHistory,
      updated: updatedDataInPriceHistory,
    };
  }
}
