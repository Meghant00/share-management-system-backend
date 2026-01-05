import { foreignKey } from 'drizzle-orm/pg-core';
import { integer } from 'drizzle-orm/pg-core';
import {
  pgTable,
  bigint,
  varchar,
  decimal,
  date,
  timestamp,
} from 'drizzle-orm/pg-core';
import { company } from './company';
import { broker } from './broker';

export const floorsheet = pgTable(
  'floorsheet',
  {
    id: bigint('id', { mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    contractId: bigint('contract_id', { mode: 'number' }).notNull(),
    stockSymbol: varchar('stock_symbol', { length: 50 }).notNull(),
    contractQuantity: bigint('contract_quantity', { mode: 'number' }).notNull(),
    contractRate: decimal('contract_rate', {
      precision: 18,
      scale: 2,
    }).notNull(),
    contractAmount: decimal('contract_amount', {
      precision: 18,
      scale: 2,
    }).notNull(),
    buyerMemberId: integer('buyer_member_id').notNull(),
    sellerMemberId: integer('seller_member_id').notNull(),
    businessDate: date('business_date').notNull(),
    tradeTime: timestamp('trade_time', { withTimezone: true }),
  },
  (table) => ({
    stockSymbolFk: foreignKey({
      name: 'floorsheet_stock_symbol_fk',
      columns: [table.stockSymbol],
      foreignColumns: [company.symbol],
    }),
    buyerMemberIdFk: foreignKey({
      name: 'floorsheet_buyer_member_id_fk',
      columns: [table.buyerMemberId],
      foreignColumns: [broker.code],
    }),
    sellerMemberIdFk: foreignKey({
      name: 'floorsheet_seller_member_id_fk',
      columns: [table.sellerMemberId],
      foreignColumns: [broker.code],
    }),
  }),
);
