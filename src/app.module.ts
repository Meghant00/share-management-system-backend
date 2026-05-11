import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FloorsheetController } from './floorsheet/floorsheet.controller';
import { FloorsheetService } from './floorsheet/floorsheet.service';
import { DatabaseModule } from './database/database.module';
import { BrokerService } from './broker/broker.service';
import { BrokerController } from './broker/broker.controller';
import { CompanyController } from './company/company.controller';
import { CompanyService } from './company/company.service';
import { NepseAuthService } from './nepseAuth/nepseAuth.service';
import { ReportController } from './report/report.controller';
import { ReportService } from './report/report.service';
import { TodaysPriceController } from './todaysPrice/todaysPrice.controller';
import { TodaysPriceService } from './todaysPrice/todaysPrice.service';
import { PlayWrightService } from './playWright/playWright.service';
import { PriceHistoryService } from './priceHistory/priceHistory.service';
import { PriceHistoryController } from './priceHistory/priceHistory.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [
    AppController,
    FloorsheetController,
    BrokerController,
    CompanyController,
    ReportController,
    TodaysPriceController,
    PriceHistoryController,
  ],
  providers: [
    AppService,
    FloorsheetService,
    BrokerService,
    CompanyService,
    NepseAuthService,
    ReportService,
    TodaysPriceService,
    PlayWrightService,
    PriceHistoryService,
  ],
})
export class AppModule {}
