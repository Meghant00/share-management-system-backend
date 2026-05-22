import { Controller, Get, Post } from '@nestjs/common';
import { CompanyResult, CompanyService } from './company.service';

@Controller('company')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Post('fetch')
  async fetchBroker(): Promise<CompanyResult> {
    return this.companyService.fetchAndSaveCompanies();
  }

  @Get('/')
  async getAllCompanies() {
    return this.companyService.getAllCompanies();
  }

  @Get('/active')
  async getActiveCompanies() {
    return this.companyService.getActiveCompanies();
  }
}
