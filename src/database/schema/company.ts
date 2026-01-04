import { pgTable, integer, varchar } from 'drizzle-orm/pg-core';

export const company = pgTable('company', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  companyId: integer('companyId'),
  companyName: varchar('company_name', { length: 255 }).notNull(),
  symbol: varchar('symbol', { length: 20 }).notNull(),
  securityName: varchar('security_name', { length: 255 }).notNull(),
  status: varchar('status', { length: 1 }).notNull(),
  companyEmail: varchar('company_email', { length: 255 }),
  website: varchar('website', { length: 255 }),
  sectorName: varchar('sector_name', { length: 150 }),
  regulatoryBody: varchar('regulatory_body', { length: 150 }),
  instrumentType: varchar('instrument_type', { length: 50 }),
});
