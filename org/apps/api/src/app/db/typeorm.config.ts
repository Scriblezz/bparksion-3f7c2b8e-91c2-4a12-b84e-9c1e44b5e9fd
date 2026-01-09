import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { join } from 'path';

const resolveDatabaseFile = () => {
  if (process.env.DATABASE_FILE && process.env.DATABASE_FILE.trim().length > 0) {
    return process.env.DATABASE_FILE.trim();
  }
  return join(process.cwd(), 'data.sqlite');
};

export const typeOrmConfig = (): TypeOrmModuleOptions => ({
  type: 'sqlite',
  database: resolveDatabaseFile(),
  autoLoadEntities: true,
  synchronize: true, // OK for take-home; note in README that prod would use migrations
  logging: false,
});
