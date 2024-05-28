import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as net from 'net';
import * as ModbusRTU from 'jsmodbus';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { AlertStatus } from '@prisma/client';

@Injectable()
export class ModbusService implements OnModuleInit, OnModuleDestroy {
  private devices: Map<
    string,
    { machineId: string; socket: net.Socket; interval: NodeJS.Timeout }
  > = new Map();
  private intervalId: NodeJS.Timeout;
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifier: NotificationsGateway,
  ) {}

  async onModuleInit() {
    await this.updateListeners();
    this.intervalId = setInterval(() => this.updateListeners(), 60000);
  }
  async onModuleDestroy() {
    clearInterval(this.intervalId);
    this.devices.forEach(({ socket }) => socket.end());
  }

  private async updateListeners() {
    const devices = await this.prisma.machine.findMany();
    const currentDevices = new Set(
      devices.map((device) => ({
        dockIp: device.dockIp,
        machineId: device.id,
      })),
    );
    const currentIps = new Set(devices.map((device) => device.dockIp));

    for (const device of currentDevices) {
      if (!this.devices.has(device.dockIp)) {
        this.setupListener(device.dockIp, device.machineId);
      }
    }

    for (const [dockIp] of this.devices) {
      if (!currentIps.has(dockIp)) {
        this.removeListener(dockIp);
      }
    }
  }

  private setupListener(ip: string, machineId: string) {
    const socket = new net.Socket();
    const client = new ModbusRTU.client.TCP(socket, 1);

    socket.connect({ host: ip, port: 502 }, () => {
      console.log(`Connect to Moxa device at ${ip}`);

      const interval = setInterval(async () => {
        try {
          const response = await client.readDiscreteInputs(1, 1);
          const state = response.response.body.valuesAsArray[0];
          if (state === 1) {
            const alerts = (
              await this.prisma.machine.findUnique({
                where: {
                  id: machineId,
                },
                include: {
                  alerts: true,
                },
              })
            ).alerts.find(
              (alert) => alert.currentStatus !== AlertStatus.SOLVED,
            );

            if (!alerts) {
              console.log('Alert created');
              await this.prisma.alert.create({
                data: {
                  name: 'Issue',
                  machineId: machineId,
                  currentStatus: AlertStatus.PENDING,
                },
              });
              this.notifier.sendUpdateNotification();
            }
          }
        } catch (err) {
          console.error(`Error reading DI1 from ${ip}: `, err);
        }
      }, 1000);

      this.devices.set(ip, { machineId, socket, interval });
    });

    socket.on('error', (err) => {
      console.error(`Connection error woth ${ip}: `, err);
    });
  }

  private removeListener(ip: string) {
    const { socket, interval } = this.devices.get(ip);
    clearInterval(interval);
    socket.end();
    this.devices.delete(ip);
    console.log(`Removed listener for ${ip}`);
  }
}
