import { pgTable, bigint, varchar, decimal, date, time, timestamp, text, integer } from 'drizzle-orm/pg-core';

export const floorsheet = pgTable('floorsheet', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  name: text().notNull(),
  code: integer('code').notNull(),
  tmslink: varchar('tmslink', { length: 255}).notNull(),
});

