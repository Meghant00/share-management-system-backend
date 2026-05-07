import { Controller, Post } from '@nestjs/common';

@Controller('todaysPrice')
export class TodaysPriceController {
  @Post('fetch-todays-price')
  public fetchTodaysPrice() {}
}
