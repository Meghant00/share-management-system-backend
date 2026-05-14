import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

import * as schema from '../database/schema/priceHistory';
import { NepseAuthService } from 'src/nepseAuth/nepseAuth.service';
import { PriceHistoryService } from 'src/priceHistory/priceHistory.service';

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
    private readonly priceHistoryService: PriceHistoryService,
  ) {}

  public async fetchAndSaveTodaysPrice(): Promise<
    SaveTodaysPriceInPriceHistoryResponse | FetchAndSaveTodaysPriceError
  > {
    try {
      const todaysDate = new Date().toISOString();

      const saveResponse =
        await this.priceHistoryService.fetchAndSavePriceHistoryByFromDateAndToDate(
          {
            fromDate: todaysDate,
          },
        );

      return saveResponse;
    } catch (error) {
      console.log(error);

      return {
        message: 'An error occurred while inserting',
        success: false,
      };
    }
  }
}
