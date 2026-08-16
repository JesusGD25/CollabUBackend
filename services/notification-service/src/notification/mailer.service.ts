import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private transporter: nodemailer.Transporter | null = null;
  private readonly fromAddress: string;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT');
    const user = this.configService.get<string>('SMTP_USER');
    const password = this.configService.get<string>('SMTP_PASSWORD');
    this.fromAddress = this.configService.get<string>('SMTP_FROM') || user || 'noreply@collab-u.local';

    if (!host || !user || !password) {
      this.logger.warn(
        'SMTP no configurado (faltan SMTP_HOST/SMTP_USER/SMTP_PASSWORD) — los emails no se enviarán, solo se registrarán en el log',
      );
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port: Number(port) || 587,
      secure: Number(port) === 465,
      auth: { user, pass: password },
    });
  }

  /** Envía un correo. No lanza excepción si falla — retorna false y loguea el error. */
  async send(options: SendMailOptions): Promise<boolean> {
    if (!this.transporter) {
      this.logger.warn(`SMTP no configurado — email a ${options.to} ("${options.subject}") no enviado`);
      return false;
    }

    try {
      await this.transporter.sendMail({
        from: `"Collab-U" <${this.fromAddress}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });
      this.logger.log(`Email enviado a ${options.to}: "${options.subject}"`);
      return true;
    } catch (error: any) {
      this.logger.error(`Error enviando email a ${options.to}: ${error.message}`, error.stack);
      return false;
    }
  }
}
