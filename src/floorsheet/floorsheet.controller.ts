import {
  Body,
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Get,
  Sse,
} from '@nestjs/common';
import {
  FloorsheetResult,
  FloorsheetService,
  ProgressUpdate,
  SaveFloorsheetCsvResult,
} from './floorsheet.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { Observable } from 'rxjs';

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

  @Sse('progress')
  sendProgress(): Observable<ProgressUpdate> {
    return this.floorsheetService.getProgressStream();
  }
}
