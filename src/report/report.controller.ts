import { Controller, Get, Param, Req } from '@nestjs/common';
import { ReportService } from './report.service';

@Controller('report')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Get('/get-broker-holdings/:company')
  public getTotalHoldingsOfBrokerByCompany(@Param() param) {
    const { company } = param;

    return this.reportService.getTotalHoldingsOfBrokerByCompany(company);
  }

  @Get('/get-broker-selling/:company')
  public getTotalSellingOfBrokerByCompany(@Param() param) {
    const { company } = param;

    return this.reportService.getTotalSellingOfBrokerByCompany(company);
  }
}
