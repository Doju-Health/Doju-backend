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

  /**
   * Send seller KYC approved email
   */
  async sendSellerKycApprovedEmail(
    email: string,
    fullName?: string,
  ): Promise<void> {
    const html = nunjucks.render('seller-kyc-approved.njk', {
      fullName: fullName || 'there',
      email,
    });

    await this.resend.emails.send({
      from: this.getFromAddress(),
      to: email,
      subject: 'Your seller KYC has been approved',
      html,
    });
  }

  /**
   * Send seller KYC rejected email
   */
  async sendSellerKycRejectedEmail(
    email: string,
    fullName: string | undefined,
    reason: string,
  ): Promise<void> {
    const html = nunjucks.render('seller-kyc-rejected.njk', {
      fullName: fullName || 'there',
      email,
      reason,
    });

    await this.resend.emails.send({
      from: this.getFromAddress(),
      to: email,
      subject: 'Your seller KYC has been rejected',
      html,
    });
  }

  /**
   * Send seller notification that a product has been purchased
   */
  async sendProductPurchasedEmail(params: {
    sellerEmail: string;
    sellerName?: string;
    buyerName: string;
    buyerLocation: string;
    productName: string;
    quantity: number;
    unitPrice: string;
    totalPaid: string;
    purchaseTime: string;
    expectedDeliveryDate: string;
    deliveryAddress?: string;
    deliveryFee?: string;
    orderDetailsUrl: string;
  }): Promise<void> {
    const html = nunjucks.render('seller-product-purchased.njk', {
      sellerName: params.sellerName || 'there',
      buyerName: params.buyerName,
      buyerLocation: params.buyerLocation,
      productName: params.productName,
      quantity: params.quantity,
      unitPrice: params.unitPrice,
      totalPaid: params.totalPaid,
      purchaseTime: params.purchaseTime,
      expectedDeliveryDate: params.expectedDeliveryDate,
      deliveryAddress: params.deliveryAddress,
      deliveryFee: params.deliveryFee,
      orderDetailsUrl: params.orderDetailsUrl,
    });

    await this.resend.emails.send({
      from: this.getFromAddress(),
      to: params.sellerEmail,
      subject: 'Your Product Has Been Purchased',
      html,
    });
  }

  private getFromAddress(): string {
    return process.env.RESEND_FROM_EMAIL || this.defaultFrom;
  }
}
