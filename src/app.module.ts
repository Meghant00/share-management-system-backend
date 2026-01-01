import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FloorsheetController } from './floorsheet/floorsheet.controller';
import { FloorsheetService } from './floorsheet/floorsheet.service';
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [AppController, FloorsheetController],
  providers: [AppService, FloorsheetService],
})
export class AppModule {}
