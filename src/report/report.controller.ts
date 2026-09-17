import { Controller, Get, Param, Query, Req } from '@nestjs/common';
import { ReportService } from './report.service';

@Controller('report')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Get('/get-broker-buyings/:company')
  public getTotalBuyingsOfBrokerByCompany(@Param() param, @Query() query) {
    const { company } = param;
    const { fromDate, toDate } = query;

    return this.reportService.getTotalBuyingsOfBrokerByCompany(
      company,
      fromDate,
      toDate,
    );
  }

  @Get('/get-broker-selling/:company')
  public getTotalSellingOfBrokerByCompany(@Param() param, @Query() query) {
    const { company } = param;

    const { fromDate, toDate } = query;

    return this.reportService.getTotalSellingOfBrokerByCompany(
      company,
      fromDate,
      toDate,
    );
  }

  @Get('/company/:symbol')
  public async getCompanyReport(@Param() param) {
    const { symbol } = param;

    return this.reportService.getCompanyReport(symbol);
  }
}
