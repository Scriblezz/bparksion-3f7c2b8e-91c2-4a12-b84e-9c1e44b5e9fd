import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { join } from 'path';

export const typeOrmConfig = (): TypeOrmModuleOptions => ({
  type: 'sqlite',
  database: join(process.cwd(), 'data.sqlite'),
  autoLoadEntities: true,
  synchronize: true, // OK for take-home; note in README that prod would use migrations
  logging: false,
});
