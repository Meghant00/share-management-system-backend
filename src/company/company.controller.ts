import { Controller, Post } from '@nestjs/common';
import { CompanyResult, CompanyService } from './company.service';

@Controller('company')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Post('fetch')
  async fetchBroker(): Promise<CompanyResult> {
    return this.companyService.fetchAndSaveCompanies();
  }
}
