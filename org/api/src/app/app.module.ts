import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization, User } from '@org/data';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { typeOrmConfig } from './db/typeorm.config';
import { SeedService } from './seed/seed.service';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forRoot(typeOrmConfig()),
    TypeOrmModule.forFeature([Organization, User]),
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService, SeedService],
})
export class AppModule {}
