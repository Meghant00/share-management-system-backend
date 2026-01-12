import {
  Body,
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Get,
} from '@nestjs/common';
import {
  FloorsheetResult,
  FloorsheetService,
  SaveFloorsheetCsvResult,
} from './floorsheet.service';
import { FileInterceptor } from '@nestjs/platform-express';

interface FloorsheetSaveCSVDao {
  csvFile: FormData;
  text: string;
}

@Controller('floorsheet')
export class FloorsheetController {
  constructor(private readonly floorsheetService: FloorsheetService) {}

  @Post('fetch')
  async fetchFloorsheet(): Promise<FloorsheetResult> {
    return this.floorsheetService.fetchAndSaveFloorsheet();
  }

  @Post('save-from-csv')
  @UseInterceptors(FileInterceptor('xlsxFile'))
  async saveFloorsheetFromCsv(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<SaveFloorsheetCsvResult> {
    return this.floorsheetService.saveFloorSheetFromCsv(file);
  }

  @Get('traded-companies')
  async getListOfTradedCompanies() {
    return this.floorsheetService.getUniqueCompaniesInFloorsheet();
  }
}
