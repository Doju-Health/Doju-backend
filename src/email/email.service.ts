import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';
import * as nunjucks from 'nunjucks';
import * as path from 'path';

@Injectable()
export class EmailService {
  private resend: Resend;
  private readonly defaultFrom = 'DOJU <noreply@dojuhealth.com>';

  constructor() {
    // Initialize Resend client
    this.resend = new Resend(process.env.RESEND_API_KEY);

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

    await this.resend.emails.send({
      from: this.getFromAddress(),
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

    await this.resend.emails.send({
      from: this.getFromAddress(),
      to: email,
      subject: 'Reset Your Password - DOJU',
      html,
    });
  }

  /**
   * Send generic email
   */
  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    await this.resend.emails.send({
      from: this.getFromAddress(),
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

    await this.resend.emails.send({
      from: this.getFromAddress(),
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

    await this.resend.emails.send({
      from: this.getFromAddress(),
      to: email,
      subject: "You're on the DOJU waitlist",
      html,
    });
  }

  private getFromAddress(): string {
    return process.env.RESEND_FROM_EMAIL || this.defaultFrom;
  }
}
