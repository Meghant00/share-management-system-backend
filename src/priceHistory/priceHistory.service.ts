import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema/priceHistory';
import {
  NepseAuthContext,
  NepseAuthService,
} from 'src/nepseAuth/nepseAuth.service';
import { BrowserContext, Page } from 'playwright';
import { PlayWrightService } from 'src/playWright/playWright.service';
import { sleep } from 'utils/sleep';
import { getDatesBetweenTwoDates } from 'utils/date';
import { and, eq } from 'drizzle-orm';

export interface FetchPriceHistoryByFromAndToDateParameters {
  fromDate: string;
  toDate?: string;
}

interface FetchPriceHistoryByFromAndToDateFromNepseParameters {
  fromDate: string;
  toDate?: string;
  page: Page;
  context: BrowserContext;
  authContext: NepseAuthContext;
}

interface FetchPriceHistoryFromNepseParameters {
  playwrightPage: Page;
  context: BrowserContext;
  authContext: NepseAuthContext;
  businessDate: number;
}

export interface SavePriceHistoryResponse {
  total: number;
  inserted: number;
  updated: number;
}

export interface FetchAndSavePriceHistoryError {
  message: string;
  success: boolean;
  errorCode?: number;
}

@Injectable()
export class PriceHistoryService {
  constructor(
    @Inject('DB') private db: NodePgDatabase<typeof schema>,
    private readonly nepseAuthService: NepseAuthService,
    private readonly playWrightService: PlayWrightService,
  ) {}

  public async fetchAndSavePriceHistoryByFromDateAndToDate({
    fromDate,
    toDate,
  }: FetchPriceHistoryByFromAndToDateParameters): Promise<
    SavePriceHistoryResponse | FetchAndSavePriceHistoryError
  > {
    try {
      console.log('Fetching price history...');

      const { browser, context, page } =
        await this.playWrightService.initializeBrowserContext();

      const authContext = await this.nepseAuthService.getCredentials(page);

      const priceHistory: any[] =
        await this.fetchPriceHistoryByFromAndToDateFromNepse({
          authContext,
          page,
          fromDate,
          toDate,
          context,
        });

      const saveResponse = await this.savePriceHistory(priceHistory);

      return saveResponse;
    } catch (error) {
      console.log(error);

      return {
        success: false,
        message: 'Error fetching price history',
      };
    }
  }

  private async fetchPriceHistoryByFromAndToDateFromNepse({
    fromDate,
    toDate,
    context,
    page,
    authContext,
  }: FetchPriceHistoryByFromAndToDateFromNepseParameters) {
    console.log('Parsing Dates...');

    const datesBetweenFromDateAndToDate: number[] = getDatesBetweenTwoDates({
      fromDate,
      toDate,
    });

    console.log('Dates parsed');

    console.log('Fetching Price History....');

    const priceHistory: any[] = [];

    for (const date of datesBetweenFromDateAndToDate) {
      const priceHistoryRes = await this.fetchPriceHistoryFromNepse({
        authContext: authContext,
        context: context,
        playwrightPage: page,
        businessDate: date,
      });

      priceHistory.push(...priceHistoryRes);

      await sleep(500);
    }

    console.log('Fetched Price History..');

    return priceHistory;
  }

  private async fetchPriceHistoryFromNepse({
    authContext,
    businessDate,
    context,
    playwrightPage,
  }: FetchPriceHistoryFromNepseParameters) {
    try {
      let usedAuthContext = authContext;

      const LIMIT = 500;

      const date = new Date(businessDate);
      const formattedBusinessDate = new Intl.DateTimeFormat('en-CA', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(date);

      const priceHistory: any[] = [];

      console.log(`Fetching Price History for ${formattedBusinessDate}`);

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

      priceHistory.push(...firstPageContent);

      if (firstPageContent.length < LIMIT) {
        console.log(
          `Fetched Price History for ${formattedBusinessDate}. Total ${priceHistory.length} data.`,
        );
        return priceHistory;
      }

      for (let i = 1; i < firstPagedata.totalPages; i++) {
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            console.log(`Fetching Page ${i}`);

            const priceHistoryRes = await context.request.post(
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

            const priceHistoryData = await priceHistoryRes.json();

            const content: any[] = priceHistoryData.content;

            priceHistory.push(...content);

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

      console.log(
        `Fetched Price History for ${formattedBusinessDate}. Total ${priceHistory.length} data.`,
      );

      return priceHistory;
    } catch (error) {
      console.log(error);
      return [];
    }
  }

  private async savePriceHistory(
    priceHistory: any[],
  ): Promise<SavePriceHistoryResponse> {
    console.log('saving todays price');

    const parsedDataForPriceHistory: schema.NewPriceHistory[] =
      priceHistory.map((company) => {
        return {
          businessDate: company.businessDate,
          securityId: company.securityId,
          openPrice: company.openPrice,
          highPrice: company.highPrice,
          closePrice: company.closePrice,
          averageTradePrice: company.averageTradedPrice,
          fiftyTwoWeekHigh: company.fiftyTwoWeekHigh,
          fiftyTwoWeekLow: company.fiftyTwoWeekLow,
          marketCapitalization: company.marketCapitalization,
          previousDayClosePrice: company.previousDayClosePrice,
          totalTradeQuantity: company.totalTradedQuantity,
          totalTrades: company.totalTrades,
          totalTradeValue: company.totalTradedValue,
        };
      });

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

    console.log('saved price history');

    return {
      total: parsedDataForPriceHistory.length,
      inserted: insertedDataInPriceHistory,
      updated: updatedDataInPriceHistory,
    };
  }
}
