import {
  Inject,
  Injectable,
  InternalServerErrorException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { db } from 'src/database/database';
import * as schema from '../database/schema/floorsheet';
import * as companySchema from '../database/schema/company';
import { eq, sql } from 'drizzle-orm';

export interface HoldingResult {
  total: number;
  holders: HolderResult[];
}

interface HolderResult {
  buyer?: number;
  seller?: number;
  totalQuantity: number;
  averageRate: number;
  averageAmount: number;
  sn: number;
}

@Injectable()
export class ReportService {
  constructor(
    @Inject('DB') private db: NodePgDatabase<typeof schema>,
    @Inject('DB') private companyDb: NodePgDatabase<typeof companySchema>,
  ) {}

  public async getTotalHoldingsOfBrokerByCompany(
    stockSymbol: string,
    fromDate?: string,
    toDate?: string,
  ): Promise<HoldingResult> {
    const fromDateTimestamp = new Date(fromDate || 0).getTime();
    const toDateTimeStamp = toDate ? new Date(toDate).getTime() : Date.now();

    if (toDateTimeStamp < fromDateTimestamp) {
      console.log('From should be less than to date.');
      throw new UnprocessableEntityException(
        'From should be less than to date.',
      );
    }

    const query = sql`SELECT 
                          f.buyer_member_id AS buyer,
                          ROUND(SUM(f.contract_quantity), 4) AS total_quantity,
                          ROUND(AVG(f.contract_rate), 4) AS average_rate,
                          ROUND(AVG(f.contract_amount), 4) AS average_amount
                      FROM floorsheet f
                      INNER JOIN company c
                          ON f.stock_symbol = c.symbol
                      WHERE 
                          f.stock_symbol = UPPER(${stockSymbol})
                          AND f.business_date >= TO_TIMESTAMP(${fromDateTimestamp} / 1000.00)::date AND f.business_date < TO_TIMESTAMP(${toDateTimeStamp} / 1000.00)::date
                      GROUP BY 
                          f.buyer_member_id, 
                          f.stock_symbol
                      ORDER BY 
                          total_quantity DESC;`;

    const result = await db.execute(query);

    const total = result.rowCount;

    const data = result.rows;

    const parsedHolders: HolderResult[] = data.map(
      (holder: any, index: number) => {
        return {
          buyer: holder.buyer,
          totalQuantity: Number(holder.total_quantity),
          averageRate: Number(holder.average_rate),
          averageAmount: Number(holder.average_amount),
          sn: index + 1,
        };
      },
    );

    return { total: total || 0, holders: parsedHolders };
  }

  public async getTotalSellingOfBrokerByCompany(
    stockSymbol: string,
    fromDate?: string,
    toDate?: string,
  ): Promise<HoldingResult> {
    const fromDateTimestamp = new Date(fromDate || 0).getTime();
    const toDateTimeStamp = toDate ? new Date(toDate).getTime() : Date.now();

    if (toDateTimeStamp < fromDateTimestamp) {
      console.log('From should be less than to date.');
      throw new UnprocessableEntityException(
        'From should be less than to date.',
      );
    }

    const query = sql`SELECT 
                          f.seller_member_id AS seller,
                          ROUND(SUM(f.contract_quantity), 4) AS total_quantity,
                          ROUND(AVG(f.contract_rate), 4) AS average_rate,
                          ROUND(AVG(f.contract_amount), 4) AS average_amount
                      FROM floorsheet f
                      INNER JOIN company c
                          ON f.stock_symbol = c.symbol
                      WHERE 
                          f.stock_symbol = UPPER(${stockSymbol})
                          AND f.business_date >= TO_TIMESTAMP(${fromDateTimestamp} / 1000.00)::date AND f.business_date < TO_TIMESTAMP(${toDateTimeStamp} / 1000.00)::date
                      GROUP BY 
                          f.seller_member_id, 
                          f.stock_symbol
                      ORDER BY 
                          total_quantity DESC;`;

    const result = await db.execute(query);

    const total = result.rowCount;

    const data = result.rows;

    const parsedHolders: HolderResult[] = data.map(
      (holder: any, index: number) => {
        return {
          seller: holder.seller,
          totalQuantity: Number(holder.total_quantity),
          averageRate: Number(holder.average_rate),
          averageAmount: Number(holder.average_amount),
          sn: index + 1,
        };
      },
    );

    return { total: total || 0, holders: parsedHolders };
  }

  public async getCompanyReport(symbol: string) {
    if (!symbol) {
      return {
        error: true,
        message: 'Company is required.',
      };
    }

    const result = await this.companyDb
      .select({
        companyName: companySchema.company.companyName,
        symbol: companySchema.company.symbol,
        securityName: companySchema.company.securityName,
      })
      .from(companySchema.company)
      .where(
        eq(sql`upper(${companySchema.company.symbol})`, symbol.toUpperCase()),
      );

    const company = result[0];

    return {
      success: true,
      company,
    };
  }
}
