import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task, User } from '@org/data';
import { OrgAuthModule } from '@org/auth';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [TypeOrmModule.forFeature([Task, User]), OrgAuthModule, AuditLogModule],
  controllers: [TasksController],
  providers: [TasksService],
})
export class TasksModule {}
