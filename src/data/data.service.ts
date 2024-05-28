import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AlertStatus } from '@prisma/client';
import { NotificationsGateway } from '../notifications/notifications.gateway';

@Injectable()
export class DataService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifier: NotificationsGateway,
  ) {}

  async getAlerts(user: any) {
    const alerts = await this.prisma.alert.findMany({
      where: {
        currentStatus: AlertStatus.PENDING,
        machine: {
          company: {
            workers: {
              some: {
                id: user.sub,
              },
            },
          },
        },
      },
      include: {
        machine: true,
      },
    });

    return {
      alerts: alerts.map((alert) => ({
        machineName: alert.machine.name,
        machineId: alert.machineId,
        alertId: alert.id,
        alertIssueDate: alert.createdAt,
      })),
    };
  }

  async finishAlert(user: any, alertId: string) {
    await this.prisma.alert.update({
      where: {
        id: alertId,
        currentStatus: AlertStatus.TAKEN,
      },
      data: {
        currentStatus: AlertStatus.SOLVED,
      },
    });

    this.notifier.sendUpdateNotification();

    return {
      message: 'Status updated!',
    };
  }

  async claimAlert(
    user: any,
    alertId: string,
    machineId: string,
    avgTime: number,
  ) {
    await this.prisma.alert.update({
      where: {
        id: alertId,
        currentStatus: AlertStatus.PENDING,
      },
      data: {
        avgMaintenanceTime: avgTime,
        currentStatus: AlertStatus.TAKEN,
        responsibleUserId: user.sub,
      },
    });

    return {
      message: 'Status updated!',
    };
  }
}
