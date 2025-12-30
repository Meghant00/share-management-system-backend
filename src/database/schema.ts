import { pgTable, bigint, varchar, decimal, date, time, timestamp, text } from 'drizzle-orm/pg-core';

export const floorsheet = pgTable('floorsheet', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  contractId: bigint('contract_id', { mode: 'number' }).notNull(),
  stockSymbol: varchar('stock_symbol', { length: 50 }).notNull(),
  contractQuantity: bigint('contract_quantity', { mode: 'number' }).notNull(),
  contractRate: decimal('contract_rate', { precision: 18, scale: 2 }).notNull(),
  contractAmount: decimal('contract_amount', { precision: 18, scale: 2 }).notNull(),
  buyerMemberId: varchar('buyer_member_id', { length: 50 }).notNull(),
  sellerMemberId: varchar('seller_member_id', { length: 50 }).notNull(),
  buyerBrokerName: text('buyer_broker_name'),
  sellerBrokerName: text('seller_broker_name'),
  businessDate: date('business_date').notNull(),
  tradeTime: time('trade_time'),
  securityName: varchar('security_name', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

