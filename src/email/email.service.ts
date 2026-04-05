import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import * as nunjucks from 'nunjucks';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Initialize email transporter
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true' || false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    // Configure nunjucks
    nunjucks.configure(path.join(__dirname, '../../templates'), {
      autoescape: true,
      noCache: true,
    });
  }

  /**
   * Send verification email with OTP
   */
  async sendVerificationEmail(
    email: string,
    otp: string,
    fullName: string,
  ): Promise<void> {
    const html = nunjucks.render('email-verification.njk', {
      fullName,
      otp,
      expiryTime: '10 minutes',
    });

    await this.transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@doju.com',
      to: email,
      subject: 'Verify Your Email - DOJU',
      html,
    });
  }

  /**
   * Send reset password email
   */
  async sendResetPasswordEmail(
    email: string,
    otp: string,
    fullName: string,
  ): Promise<void> {

    const html = nunjucks.render('password-reset.njk', {
      fullName,
      otp,
      expiryTime: '1 hour',
    });

    await this.transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@doju.com',
      to: email,
      subject: 'Reset Your Password - DOJU',
      html,
    });
  }

  /**
   * Send generic email
   */
  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    await this.transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@doju.com',
      to,
      subject,
      html,
    });
  }

  /**
   * Send welcome onboarding email after verification
   */
  async sendWelcomeOnboardEmail(
    email: string,
    fullName?: string,
    role?: string,
  ): Promise<void> {
    const html = nunjucks.render('welcome-onboard.njk', {
      fullName: fullName || 'there',
      email,
      role,
    });

    await this.transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@doju.com',
      to: email,
      subject: 'Welcome to DOJU',
      html,
    });
  }

  /**
   * Send waitlist welcome email
   */
  async sendWaitlistWelcomeEmail(email: string): Promise<void> {
    const html = nunjucks.render('waitlist-welcome.njk', {
      email,
    });

    await this.transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@doju.com',
      to: email,
      subject: "You're on the DOJU waitlist",
      html,
    });
  }
}
