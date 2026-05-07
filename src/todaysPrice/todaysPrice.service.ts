import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

@Injectable()
export class TodaysPriceService {
  constructor(@Inject('DB') private db: NodePgDatabase) {}
}
