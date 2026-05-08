import { Controller, Post } from '@nestjs/common';
import { TodaysPriceService } from './todaysPrice.service';

@Controller('todays-price')
export class TodaysPriceController {
  constructor(private readonly todaysPriceService: TodaysPriceService) {}
  @Post('fetch-todays-price')
  public fetchTodaysPrice() {
    return this.todaysPriceService.fetchAndSaveTodaysPrice();
  }
}
