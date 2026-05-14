import { Body, Controller, Post, Req } from '@nestjs/common';
import { PriceHistoryService } from './priceHistory.service';

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
}
