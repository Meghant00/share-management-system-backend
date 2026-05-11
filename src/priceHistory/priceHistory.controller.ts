import { Body, Controller, Post, Req } from '@nestjs/common';
import { PriceHistoryService } from './priceHistory.service';

@Controller('price-history')
export class PriceHistoryController {
  constructor(private readonly priceHistoryService: PriceHistoryService) {}

  @Post('/fetch-and-save-price-history')
  public fetchAndSavePriceHistoryByFromDateAndToDate(@Body() body) {
    const { fromDate, toDate } = body;

    return this.priceHistoryService.fetchAndSavePriceHistoryByFromDateAndToDate(
      {
        fromDate: fromDate,
        toDate: toDate,
      },
    );
  }
}
