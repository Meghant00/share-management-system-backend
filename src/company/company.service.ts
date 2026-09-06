import { Inject, Injectable } from '@nestjs/common';
import * as schema from '../database/schema/company';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { BrowserContext, chromium, Page } from 'playwright';
import { eq, sql } from 'drizzle-orm';
import {
  NepseAuthService,
  NepseAuthContext,
} from 'src/nepseAuth/nepseAuth.service';

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
  totalSecurities: number;
  insertedSecurities: number;
}

@Injectable()
export class CompanyService {
  constructor(
    @Inject('DB') private db: NodePgDatabase<typeof schema>,
    private readonly nepseAuthService: NepseAuthService,
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
      const authContext = await this.nepseAuthService.getCredentials(page);

      const companiesData = await this.fetchCompanies(context, authContext);

      console.log('Fetched Companies:', companiesData.length);

      const companiesSaveData = await this.saveCompanies(companiesData);

      const securities = await this.fetchSecurities(context, authContext);

      console.log('Fetched Securities:', securities.length);

      const saveSecurities = await this.saveSecurities(securities);

      return {
        ...companiesSaveData,
        insertedSecurities: saveSecurities.insertedSecurities,
        totalSecurities: saveSecurities.totalSecurities,
      };
    } catch (error) {
      console.error('Error fetching broker:', error);
      throw error;
    }
  }

  private async fetchCompanies(
    context: BrowserContext,
    authContext: NepseAuthContext,
  ): Promise<any> {
    const res = await context.request.get(
      'https://nepalstock.com/api/nots/company/list',
      {
        headers: {
          Authorization: authContext.token,
          'Content-Type': 'application/json',
        },
      },
    );

    const companiesData = await res.json();

    return companiesData;
  }

  private async fetchSecurities(
    context: BrowserContext,
    authContext: NepseAuthContext,
  ): Promise<any> {
    const res = await context.request.get(
      'https://www.nepalstock.com/api/nots/security?nonDelisted=true',
      {
        headers: {
          Authorization: authContext.token,
          'Content-Type': 'application/json',
        },
      },
    );

    const securitiesData = await res.json();

    return securitiesData;
  }

  private async saveCompanies(companies: any[]) {
    const parsedCompanies: Company[] = companies.map((company) => {
      const tempCompany = {
        ...company,
        companyName: company.securityName,
        companyId: company.id,
      };

      delete tempCompany.id;

      return tempCompany;
    });

    let insertedCompanies = 0;

    for (const company of parsedCompanies) {
      const doesCompanyExists = await this.db
        .select({ code: schema.company.companyId })
        .from(schema.company)
        .where(eq(schema.company.companyId, company.companyId));

      if (doesCompanyExists.length === 0) {
        await this.db
          .insert(schema.company)
          .values(company)
          .onConflictDoNothing();
        insertedCompanies++;
      } else {
        const currentCompany = doesCompanyExists[0];

        await this.db
          .update(schema.company)
          .set(company)
          .where(eq(schema.company.companyId, Number(currentCompany.code)));
      }
    }

    return {
      totalCompanies: parsedCompanies.length,
      insertedCompanies: insertedCompanies,
    };
  }

  private async saveSecurities(securities: any[]) {
    const parsedSecurities: Company[] = securities.map((security) => {
      const tempSecurity: Company = {
        companyId: security.id,
        companyName: security.securityName,
        symbol: security.symbol,
        securityName: security.securityName,
        status: security.activeStatus,
        companyEmail: '',
        website: '',
        sectorName: '',
        regulatoryBody: '',
        instrumentType: '',
      };

      return tempSecurity;
    });

    let insertedSecurities = 0;

    for (const security of parsedSecurities) {
      const doesSecurityExists = await this.db
        .select({ code: schema.company.companyId })
        .from(schema.company)
        .where(eq(schema.company.companyId, security.companyId));

      if (doesSecurityExists.length === 0) {
        await this.db
          .insert(schema.company)
          .values(security)
          .onConflictDoNothing();
        insertedSecurities++;
      }
    }

    return {
      totalSecurities: parsedSecurities.length,
      insertedSecurities: insertedSecurities,
    };
  }

  public async getAllCompanies() {
    const result = await this.db
      .select({
        companyId: schema.company.companyId,
        companyName: schema.company.companyName,
        symbol: schema.company.symbol,
        securityName: schema.company.securityName,
        status: schema.company.status,
        companyEmail: schema.company.companyEmail,
        website: schema.company.website,
        sectorName: schema.company.sectorName,
        regulatoryBody: schema.company.regulatoryBody,
        instrumentType: schema.company.instrumentType,
      })
      .from(schema.company)
      .orderBy(schema.company.symbol);

    console.log(`Fetched ${result.length} companies`);

    return result;
  }

  public async getCompanyIdFromSymbol(symbol: string) {
    const company = await this.db
      .select({ companyId: schema.company.companyId })
      .from(schema.company)
      .where(eq(sql`LOWER(${schema.company.symbol})`, symbol.toLowerCase()));

    return company[0];
  }

  public async getActiveCompanies() {
    const result = await this.db
      .select({
        companyId: schema.company.companyId,
        companyName: schema.company.companyName,
        symbol: schema.company.symbol,
        securityName: schema.company.securityName,
        status: schema.company.status,
        companyEmail: schema.company.companyEmail,
        website: schema.company.website,
        sectorName: schema.company.sectorName,
        regulatoryBody: schema.company.regulatoryBody,
        instrumentType: schema.company.instrumentType,
      })
      .from(schema.company)
      .where(eq(schema.company.status, 'A'))
      .orderBy(schema.company.symbol);

    console.log(`Fetched ${result.length} companies`);

    return result;
  }
}
