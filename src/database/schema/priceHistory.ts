import { date } from 'drizzle-orm/pg-core';
import { decimal } from 'drizzle-orm/pg-core';
import { foreignKey } from 'drizzle-orm/pg-core';
import { integer } from 'drizzle-orm/pg-core';
import { bigint } from 'drizzle-orm/pg-core';
import { pgTable } from 'drizzle-orm/pg-core';
import { company } from './company';

export const priceHistory = pgTable(
  'priceHistory',
  {
    id: bigint('id', { mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    businessDate: date('business_date').notNull(),
    securityId: integer('security_id').notNull(),
    openPrice: decimal('open_price', {
      scale: 18,
      precision: 2,
    }).notNull(),
    highPrice: decimal('high_price', {
      scale: 18,
      precision: 2,
    }).notNull(),
    closePrice: decimal('close_price', {
      scale: 18,
      precision: 2,
    }).notNull(),
    totalTradeQuantity: decimal('total_trade_quantity', {
      scale: 18,
      precision: 2,
    }),
    totalTradeValue: decimal('total_trade_value', {
      scale: 18,
      precision: 2,
    }),
    previousDayClosePrice: decimal('previous_day_close_price', {
      scale: 18,
      precision: 2,
    }),
    fiftyTwoWeekHigh: decimal('fifty_two_week_high', {
      scale: 18,
      precision: 2,
    }),
    fiftyTwoWeekLow: decimal('fifty_two_week_low', {
      scale: 18,
      precision: 2,
    }),
    totalTrades: decimal('total_trades', {
      scale: 18,
      precision: 2,
    }),
    averageTradePrice: decimal('average_trade_price', {
      scale: 18,
      precision: 2,
    }),
    marketCapitalization: decimal('market_capitalization', {
      scale: 18,
      precision: 2,
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
