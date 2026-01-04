import { Inject, Injectable } from '@nestjs/common';
import * as schema from '../database/schema/company';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  FloorsheetAuthContext,
  FloorsheetService,
} from 'src/floorsheet/floorsheet.service';
import { BrowserContext, chromium, Page } from 'playwright';
import { eq } from 'drizzle-orm';

interface Company {
  companyId: number;
  companyName: string;
  symbol: string;
  securityName: string;
  status: string;
  companyEmail: string;
  website: string;
  sectorName: string;
  regulatoryBody: string;
  instrumentType: string;
}

export interface CompanyResult {
  totalCompanies: number;
  insertedCompanies: number;
}

@Injectable()
export class CompanyService {
  constructor(
    @Inject('DB') private db: NodePgDatabase<typeof schema>,
    private readonly floorsheetService: FloorsheetService,
  ) {}

  async fetchAndSaveCompanies(): Promise<CompanyResult> {
    const browser = await chromium.launch({
      headless: true,
      args: ['--disable-blink-features=AutomationControlled'],
    });

    // 1. Tell Playwright context to ignore SSL errors
    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });

    const page = await context.newPage();

    try {
      const authContext =
        await this.floorsheetService.initializeAndAuthenticate(page);

      const companiesData = await this.fetchCompanies(context, authContext);

      console.log('Fetched Companies:', companiesData.length);

      const saveData = await this.saveCompanies(companiesData);

      return saveData;
    } catch (error) {
      console.error('Error fetching broker:', error);
      throw error;
    }
  }

  private async fetchCompanies(
    context: BrowserContext,
    authContext: FloorsheetAuthContext,
  ): Promise<any> {
    const res = await context.request.get(
      'https://nepalstock.com/api/nots/company/list',
      {
        headers: {
          Authorization: authContext.authToken,
          'Content-Type': 'application/json',
        },
      },
    );

    const companiesData = await res.json();

    return companiesData;
  }

  private async saveCompanies(companies: any[]) {
    const parsedCompanies: Company[] = companies.map((company) => {
      const tempCompany = {
        ...company,
        companyId: company.id,
      };

      delete tempCompany.id;

      return tempCompany;
    });

    let insertedCompanies = 0;

    for (const company of parsedCompanies) {
      const doesBrokerExists = await this.db
        .select({ code: schema.company.companyId })
        .from(schema.company)
        .where(eq(schema.company.companyId, company.companyId));

      if (doesBrokerExists.length === 0) {
        await this.db
          .insert(schema.company)
          .values(company)
          .onConflictDoNothing();
        insertedCompanies++;
      }
    }

    return {
      totalCompanies: parsedCompanies.length,
      insertedCompanies: insertedCompanies,
    };
  }
}
