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

@Module({
  imports: [DatabaseModule],
  controllers: [
    AppController,
    FloorsheetController,
    BrokerController,
    CompanyController,
  ],
  providers: [AppService, FloorsheetService, BrokerService, CompanyService],
})
export class AppModule {}
