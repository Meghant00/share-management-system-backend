import { pgTable, bigint, varchar, text, integer } from 'drizzle-orm/pg-core';

export const broker = pgTable('broker', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  name: text().notNull(),
  code: integer('code').notNull().unique(),
  tmslink: varchar('tmslink', { length: 255 }).notNull(),
});
