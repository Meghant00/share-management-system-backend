import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { db } from 'src/database/database';
import * as schema from '../database/schema/floorsheet';
import { sql } from 'drizzle-orm';

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
  constructor(@Inject('DB') private db: NodePgDatabase<typeof schema>) {}

  public async getTotalHoldingsOfBrokerByCompany(
    stockSymbol: string,
  ): Promise<HoldingResult> {
    const query = sql`SELECT DISTINCT(f.buyer_member_id) AS buyer, ROUND(SUM(f.contract_quantity), 4) total_quantity,
                        ROUND(AVG(f.contract_rate), 4) average_rate, ROUND(AVG(f.contract_amount), 4) average_amount
                        FROM floorsheet f
                        INNER JOIN company c
                        ON f.stock_symbol = c.symbol
                        GROUP BY f.buyer_member_id, f.stock_symbol
                        HAVING f.stock_symbol = UPPER(${stockSymbol})
                        ORDER BY total_quantity DESC`;

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
  ): Promise<HoldingResult> {
    const query = sql`SELECT DISTINCT(f.seller_member_id) AS seller, ROUND(SUM(f.contract_quantity), 4) total_quantity,
                        ROUND(AVG(f.contract_rate), 4) average_rate, ROUND(AVG(f.contract_amount), 4) average_amount
                        FROM floorsheet f
                        INNER JOIN company c
                        ON f.stock_symbol = c.symbol
                        GROUP BY f.seller_member_id, f.stock_symbol
                        HAVING f.stock_symbol = UPPER(${stockSymbol})
                        ORDER BY total_quantity DESC`;

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
}
