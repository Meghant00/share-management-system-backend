import { Module, Global } from '@nestjs/common';
import { db } from './database';
import * as schema from './schema';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

@Global()
@Module({
  providers: [
    {
      provide: 'DB',
      useValue: db as NodePgDatabase<typeof schema>,
    },
  ],
  exports: ['DB'],
})
export class DatabaseModule {}

