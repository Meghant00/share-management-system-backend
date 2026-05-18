import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { PriceHistoryService } from './priceHistory.service';
import {
  PRICE_HISTORY_PERIODS,
  PriceHistoryPeriod,
} from './priceHistory.interface';
import { getFromDateAndToDateFromPriceHistoryPeriod } from 'utils/priceHistory';

@Controller('price-history')
export class PriceHistoryController {
  constructor(private readonly priceHistoryService: PriceHistoryService) {}

  @Post('/fetch-and-save-price-history')
  public fetchAndSavePriceHistoryByFromDateAndToDate(@Body() body) {
    const { fromDate, toDate } = body;

    if (!fromDate) {
      return { success: false, message: 'From date is required' };
    }

    if (toDate && new Date(toDate).getTime() > Date.now()) {
      return {
        success: false,
        message: 'To date should be less than current time',
      };
    }

    return this.priceHistoryService.fetchAndSavePriceHistoryByFromDateAndToDate(
      {
        fromDate: fromDate,
        toDate: toDate,
      },
    );
  }

  @Get(':symbol')
  public async fetchPriceHistoryOfCompanyBySymbol(
    @Param() param,
    @Query() query,
  ) {
    const symbol = param.symbol;

    let fromDate = query.fromDate;
    let toDate = query.toDate;

    const period: PriceHistoryPeriod = query.period;

    if ((fromDate && !toDate) || (!fromDate && toDate)) {
      return {
        message: 'From date and To date are required.',
        error: true,
      };
    }

    if (!fromDate && !toDate) {
      if (!period) {
        return {
          message: 'Period or From Date and To Date is required.',
          error: true,
        };
      }

      if (!PRICE_HISTORY_PERIODS.includes(period)) {
        return {
          message: 'Invalid period. Please enter a valid period.',
          error: true,
        };
      }

      const { fromDate: periodFromDate, toDate: periodToDate } =
        getFromDateAndToDateFromPriceHistoryPeriod(period);

      fromDate = periodFromDate;
      toDate = periodToDate;
    } else {
      fromDate = new Date(query.fromDate);
      toDate = new Date(query.toDate);
    }

    const priceHistoryResponse =
      await this.priceHistoryService.getPriceHistoryOfCompanyByFromDateAndToDate(
        {
          fromDate,
          toDate,
          symbol,
        },
      );

    return priceHistoryResponse;
  }
}
