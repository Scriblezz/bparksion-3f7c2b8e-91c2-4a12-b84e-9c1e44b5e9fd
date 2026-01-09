import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard, JwtUser, Roles, RolesGuard } from '@org/auth';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TasksService } from './tasks.service';

@Controller('tasks')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Get()
  @Roles('viewer')
  findAll(@Req() req: Request & { user: JwtUser }) {
    return this.tasks.findScoped(req.user);
  }

  @Post()
  @Roles('admin', 'owner')
  create(@Req() req: Request & { user: JwtUser }, @Body() dto: CreateTaskDto) {
    return this.tasks.create(req.user, dto);
  }

  @Put(':id')
  @Roles('admin', 'owner')
  update(
    @Req() req: Request & { user: JwtUser },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTaskDto
  ) {
    return this.tasks.update(req.user, id, dto);
  }

  @Delete(':id')
  @Roles('admin', 'owner')
  remove(@Req() req: Request & { user: JwtUser }, @Param('id', ParseIntPipe) id: number) {
    return this.tasks.remove(req.user, id);
  }
}
