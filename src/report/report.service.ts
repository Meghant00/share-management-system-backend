import {
  Inject,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { db } from 'src/database/database';
import * as schema from '../database/schema/floorsheet';
import * as companySchema from '../database/schema/company';
import { eq, sql } from 'drizzle-orm';

export interface HoldingResult {
  total: number;
  traders: HolderResult[];
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

  public async getTotalBuyingsOfBrokerByCompany(
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

    const result = await this.db.execute(query);

    const total = result.rowCount;

    const data = result.rows;

    const parsedBuyers: HolderResult[] = data.map(
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

    return { total: total || 0, traders: parsedBuyers };
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

    return { total: total || 0, traders: parsedHolders };
  }

  public async getCompanyReport(symbol: string) {
    if (!symbol) {
      return {
        error: true,
        message: 'Company is required.',
      };
    }

    const companyReportQuery = sql`WITH ranked_prices AS (
                                    SELECT security_id, total_trades, average_trade_price, total_trade_value, total_trade_quantity, close_price, business_date,
                                      ROW_NUMBER() OVER (
                                      PARTITION BY security_id 
                                      ORDER BY business_date DESC
                                      ) as row_num
                                    FROM price_history ph
                                    INNER JOIN company c ON c."companyId" = ph.security_id
                                    WHERE c.symbol = ${symbol}
                                    )

                                    SELECT 
                                      c.company_name, c.symbol, c."companyId", 
                                      SUM(total_trades) AS total_trades, 
                                      AVG(average_trade_price) AS average_trade_price, 
                                      SUM(total_trade_value) AS total_trade_value, 
                                      SUM(total_trade_quantity) AS total_trade_quantity,
                                      MAX(CASE WHEN row_num = 1 THEN close_price END) AS last_close_price,
                                      (MAX(CASE WHEN row_num = 1 THEN close_price END) - MAX(CASE WHEN row_num = 2 THEN close_price END)) AS price_difference,
                                      (((MAX(CASE WHEN row_num = 1 THEN close_price END) - MAX(CASE WHEN row_num = 2 THEN close_price END)) / MAX(CASE WHEN row_num = 2 THEN close_price END)) * 100) AS last_price_change_percentage,
                                      MAX(CASE WHEN row_num = 1 THEN business_date END) AS business_date
                                    FROM ranked_prices rc
                                    INNER JOIN company c
                                    ON c."companyId" = rc.security_id
                                    GROUP BY c."companyId", c.company_name, c.symbol, rc.security_id;`;

    const result = await db.execute(companyReportQuery);

    const data = result.rows[0];

    const company = {
      companyName: data.company_name,
      totalTrades: data.total_trades,
      averageTradePrice: data.average_trade_price,
      totalTradeValue: data.total_trade_value,
      totalTradeQuantity: data.total_trade_quantity,
      companyId: data.companyId,
      businessDate: data.businessDate,
      lastClosingPrice: data.last_close_price,
      priceChange: data.price_difference,
      priceChangePercent: data.last_price_change_percentage,
      symbol: data.symbol,
    };

    return {
      success: true,
      company,
    };
  }
}
