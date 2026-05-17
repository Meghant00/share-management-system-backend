import { date } from 'drizzle-orm/pg-core';
import { decimal } from 'drizzle-orm/pg-core';
import { foreignKey } from 'drizzle-orm/pg-core';
import { integer } from 'drizzle-orm/pg-core';
import { bigint } from 'drizzle-orm/pg-core';
import { pgTable } from 'drizzle-orm/pg-core';
import { company } from './company';

export const priceHistory = pgTable(
  'price_history',
  {
    id: bigint('id', { mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    businessDate: date('business_date').notNull(),
    securityId: integer('security_id').notNull(),
    openPrice: decimal('open_price', {
      scale: 2,
      precision: 18,
      mode: 'number',
    }).notNull(),
    highPrice: decimal('high_price', {
      scale: 2,
      precision: 18,
      mode: 'number',
    }).notNull(),
    closePrice: decimal('close_price', {
      scale: 2,
      precision: 18,
      mode: 'number',
    }),
    totalTradeQuantity: decimal('total_trade_quantity', {
      scale: 2,
      precision: 18,
      mode: 'number',
    }),
    totalTradeValue: decimal('total_trade_value', {
      scale: 2,
      precision: 18,
      mode: 'number',
    }),
    previousDayClosePrice: decimal('previous_day_close_price', {
      scale: 2,
      precision: 18,
      mode: 'number',
    }),
    fiftyTwoWeekHigh: decimal('fifty_two_week_high', {
      scale: 2,
      precision: 18,
      mode: 'number',
    }),
    fiftyTwoWeekLow: decimal('fifty_two_week_low', {
      scale: 2,
      precision: 18,
      mode: 'number',
    }),
    totalTrades: decimal('total_trades', {
      scale: 2,
      precision: 18,
      mode: 'number',
    }),
    averageTradePrice: decimal('average_trade_price', {
      scale: 2,
      precision: 18,
      mode: 'number',
    }),
    marketCapitalization: decimal('market_capitalization', {
      scale: 2,
      precision: 18,
      mode: 'number',
    }),
  },
  (table) => ({
    securityIdFK: foreignKey({
      name: 'price_history_security_id_fk',
      columns: [table.securityId],
      foreignColumns: [company.companyId],
    }),
  }),
);

export type NewPriceHistory = typeof priceHistory.$inferInsert;
