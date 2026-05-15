import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { PriceHistoryService } from './priceHistory.service';
import { PriceHistoryPeriod } from './priceHistory.interface';

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
  public fetchPriceHistoryOfCompanyBySymbol(@Param() param, @Query() query) {
    const symbol = param.symbol;

    let fromDate = query.fromDate;
    let toDate = query.toDate;

    const period: PriceHistoryPeriod = query.period;

    if ((fromDate && !toDate) || (!fromDate && toDate)) {
      return {
        message: 'From date and To date are required.',
      };
    }

    if (!fromDate && !toDate) {
    }

    return {
      symbol,
      fromDate,
      toDate,
      period,
    };
  }
}
