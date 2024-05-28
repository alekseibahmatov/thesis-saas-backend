import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { DataService } from './data.service';
import { AuthGuard } from '../auth/guards/jwt.guard';
import { User } from '../auth/decorators/user.decorator';

@Controller('alerts')
export class DataController {
  constructor(private readonly dataService: DataService) {}

  @Get()
  @UseGuards(AuthGuard)
  async getAlerts(@User() user: any) {
    return this.dataService.getAlerts(user);
  }

  @Post()
  @UseGuards(AuthGuard)
  async claimAlert(
    @User() user: any,
    @Body('alertId') alertId: string,
    @Body('machineId') machineId: string,
    @Body('avgTime') avgTime: number,
  ) {
    return this.dataService.claimAlert(user, alertId, machineId, avgTime);
  }

  @Post('finish')
  @UseGuards(AuthGuard)
  async finishAlert(@User() user: any, @Body('alertId') alertId: string) {
    return this.dataService.finishAlert(user, alertId);
  }
}
