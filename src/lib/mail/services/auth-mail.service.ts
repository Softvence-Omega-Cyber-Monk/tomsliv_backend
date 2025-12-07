import { ENVEnum } from '@/common/enum/env.enum';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OtpType } from '@prisma';
import * as he from 'he';
import * as nodemailer from 'nodemailer';
import { MailService } from '../mail.service';
import { otpTemplate } from '../templates/otp.template';
import { passwordResetConfirmationTemplate } from '../templates/reset-password-confirm.template';
import { resetPasswordLinkTemplate } from '../templates/reset-password-link.template';

interface EmailOptions {
  subject?: string;
  message?: string;
}

@Injectable()
export class AuthMailService {
  private readonly frontendUrl: string;
  constructor(
    private readonly mailService: MailService,
    private readonly config: ConfigService,
  ) {
    this.frontendUrl = this.config.getOrThrow<string>(ENVEnum.FRONTEND_URL);
  }

  private async sendEmail(
    to: string,
    subject: string,
    html: string,
    text: string,
  ): Promise<nodemailer.SentMessageInfo> {
    return this.mailService.sendMail({ to, subject, html, text });
  }

  private sanitize(input: string) {
    return he.encode(input);
  }

  async sendVerificationCodeEmail(
    to: string,
    code: string,
    options: EmailOptions = {},
  ): Promise<nodemailer.SentMessageInfo> {
    const message = this.sanitize(options.message || 'Verify your account');
    const safeCode = this.sanitize(code);
    const subject = options.subject || 'Verification Code';

    return this.sendEmail(
      to,
      subject,
      otpTemplate({
        title: '🔑 Verify Your Account',
        message,
        code: safeCode,
        footer:
          'If you didn’t request this code, you can safely ignore this email.',
      }),
      `${message}\nYour verification code: ${code}`,
    );
  }

  async sendResetPasswordCodeEmail(
    to: string,
    code: string,
    options: EmailOptions = {},
  ): Promise<nodemailer.SentMessageInfo> {
    const message = this.sanitize(options.message || 'Password Reset Request');
    const safeCode = this.sanitize(code);
    const subject = options.subject || 'Password Reset Code';

    const resetLink = `${this.frontendUrl}/reset-password?code=${code}&type=${OtpType.RESET}&email=${to}`;

    return this.sendEmail(
      to,
      subject,
      resetPasswordLinkTemplate({
        title: '🔒 Password Reset Request',
        message,
        code: safeCode,
        footer:
          'If you didn’t request a password reset, you can safely ignore this email.',
        link: resetLink,
      }),
      `${message}\nReset your password using this link: ${resetLink}`,
    );
  }

  async sendPasswordResetConfirmationEmail(
    to: string,
    options: EmailOptions = {},
  ): Promise<nodemailer.SentMessageInfo> {
    const message = this.sanitize(
      options.message || 'Password Reset Confirmation',
    );
    const subject = options.subject || 'Password Reset Confirmation';

    return this.sendEmail(
      to,
      subject,
      passwordResetConfirmationTemplate(message),
      message,
    );
  }
  async sendWelcomeGuestEmail(
    to: string,
    code: string,
    options: EmailOptions = {},
  ): Promise<nodemailer.SentMessageInfo> {
    const message = this.sanitize(
      options.message || 'Welcome to TomsLiv! Your account has been created.',
    );
    const safeCode = this.sanitize(code);
    const subject = options.subject || 'Welcome to TomsLiv';

    const resetLink = `${this.frontendUrl}/reset-password?code=${code}&type=${OtpType.RESET}&email=${to}`;

    return this.sendEmail(
      to,
      subject,
      resetPasswordLinkTemplate({
        title: '🎉 Welcome to TomsLiv!',
        message,
        code: safeCode,
        footer:
          'To access your account and track your application, please set your password using the link above.',
        link: resetLink,
      }),
      `${message}\nSet your password using this link: ${resetLink}`,
    );
  }
}
