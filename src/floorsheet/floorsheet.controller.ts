import { Controller, Post } from '@nestjs/common';
import {
  FloorsheetResult,
  FloorsheetService,
} from './floorsheet.service';

@Controller('floorsheet')
export class FloorsheetController {
  constructor(private readonly floorsheetService: FloorsheetService) {}

  @Post('fetch')
  async fetchFloorsheet(): Promise<FloorsheetResult> {
    return this.floorsheetService.fetchAndSaveFloorsheet();
  }
}



