import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import { AuthService } from './auth/auth.service';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth/auth.controller';
import { PttGateway } from './signaling/socket.gateway';
import { ModbusService } from './modbus/modbus.service';
import { NotificationsGateway } from './notifications/notifications.gateway';
import { DataService } from './data/data.service';
import { DataController } from './data/data.controller';
import * as fs from 'fs';
import * as path from 'path';

@Module({
  imports: [
    JwtModule.register({
      privateKey: fs.readFileSync(
        path.resolve(__dirname, '../keys/private.key'),
      ),
      publicKey: fs.readFileSync(path.resolve(__dirname, '../keys/public.pem')),
      global: true,
      signOptions: {
        algorithm: 'RS256',
        expiresIn: '60m',
      },
    }),
  ],
  controllers: [AppController, AuthController, DataController],
  providers: [
    AppService,
    PttGateway,
    PrismaService,
    AuthService,
    ModbusService,
    NotificationsGateway,
    DataService,
  ],
})
export class AppModule {}
