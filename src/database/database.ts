import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool, types } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

types.setTypeParser(1700, (val) => parseFloat(val));

types.setTypeParser(20, (val) => parseInt(val, 10));

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    'postgresql://localhost:5432/share_management_system',
});

export const db = drizzle(pool);
