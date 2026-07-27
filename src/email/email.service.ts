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

  /**
   * Send admin notification that a seller submitted a new product for review
   */
  async sendProductReviewNotificationEmail(params: {
    adminEmail: string;
    adminName?: string;
    productName: string;
    productPrice: string;
    productDescription: string;
    productCategory?: string;
    productStock?: number;
    productSize?: string;
    sellerName: string;
    sellerEmail: string;
    sellerCompanyName?: string;
    productCreatedAt: string;
    adminDashboardUrl: string;
  }): Promise<void> {
    const html = nunjucks.render('admin-product-review.njk', {
      adminName: params.adminName || 'there',
      productName: params.productName,
      productPrice: params.productPrice,
      productDescription: params.productDescription,
      productCategory: params.productCategory || 'N/A',
      productStock:
        params.productStock !== undefined ? params.productStock : 'N/A',
      productSize: params.productSize || 'N/A',
      sellerName: params.sellerName,
      sellerEmail: params.sellerEmail,
      sellerCompanyName: params.sellerCompanyName || 'N/A',
      productCreatedAt: params.productCreatedAt,
      adminDashboardUrl: params.adminDashboardUrl,
    });

    await this.resend.emails.send({
      from: this.getFromAddress(),
      to: params.adminEmail,
      subject: `New product awaiting review: ${params.productName}`,
      html,
    });
  }

  /**
   * Send seller notification that a newly created product is pending review
   */
  async sendProductPendingReviewEmail(params: {
    sellerEmail: string;
    sellerName?: string;
    productName: string;
    productPrice: string;
    productDescription: string;
    productCategory?: string;
    productStock?: number;
    productSize?: string;
    adminDashboardUrl?: string;
  }): Promise<void> {
    const html = nunjucks.render('seller-product-pending-review.njk', {
      sellerName: params.sellerName || 'there',
      productName: params.productName,
      productPrice: params.productPrice,
      productDescription: params.productDescription,
      productCategory: params.productCategory || 'N/A',
      productStock:
        params.productStock !== undefined ? params.productStock : 'N/A',
      productSize: params.productSize || 'N/A',
      adminDashboardUrl: params.adminDashboardUrl,
    });

    await this.resend.emails.send({
      from: this.getFromAddress(),
      to: params.sellerEmail,
      subject: `Your product is pending review: ${params.productName}`,
      html,
    });
  }

  /**
   * Send seller notification that a product has been approved
   */
  async sendProductApprovedEmail(params: {
    sellerEmail: string;
    sellerName?: string;
    productName: string;
    productPrice: string;
    productDescription: string;
    productCategory?: string;
    adminDashboardUrl?: string;
  }): Promise<void> {
    const html = nunjucks.render('seller-product-approved.njk', {
      sellerName: params.sellerName || 'there',
      productName: params.productName,
      productPrice: params.productPrice,
      productDescription: params.productDescription,
      productCategory: params.productCategory || 'N/A',
      adminDashboardUrl: params.adminDashboardUrl,
    });

    await this.resend.emails.send({
      from: this.getFromAddress(),
      to: params.sellerEmail,
      subject: `Your product has been approved: ${params.productName}`,
      html,
    });
  }

  /**
   * Send seller notification that a product has been rejected
   */
  async sendProductRejectedEmail(params: {
    sellerEmail: string;
    sellerName?: string;
    productName: string;
    productPrice: string;
    productDescription: string;
    productCategory?: string;
    rejectionReason: string;
    adminDashboardUrl?: string;
  }): Promise<void> {
    const html = nunjucks.render('seller-product-rejected.njk', {
      sellerName: params.sellerName || 'there',
      productName: params.productName,
      productPrice: params.productPrice,
      productDescription: params.productDescription,
      productCategory: params.productCategory || 'N/A',
      rejectionReason: params.rejectionReason,
      adminDashboardUrl: params.adminDashboardUrl,
    });

    await this.resend.emails.send({
      from: this.getFromAddress(),
      to: params.sellerEmail,
      subject: `Your product was rejected: ${params.productName}`,
      html,
    });
  }

  /**
   * Send admin notification that a seller KYC review is pending
   */
  async sendSellerKycPendingReviewEmail(params: {
    adminEmail: string;
    adminName?: string;
    sellerName: string;
    sellerEmail: string;
    companyName?: string;
    businessAddress?: string;
    businessCity?: string;
    businessState?: string;
    dashboardUrl: string;
  }): Promise<void> {
    const html = nunjucks.render('seller-kyc-pending-review.njk', {
      adminName: params.adminName || 'there',
      sellerName: params.sellerName,
      sellerEmail: params.sellerEmail,
      companyName: params.companyName || 'N/A',
      businessAddress: params.businessAddress || 'N/A',
      businessCity: params.businessCity || 'N/A',
      businessState: params.businessState || 'N/A',
      dashboardUrl: params.dashboardUrl,
    });

    await this.resend.emails.send({
      from: this.getFromAddress(),
      to: params.adminEmail,
      subject: `Seller KYC pending review: ${params.sellerName}`,
      html,
    });
  }

  private getFromAddress(): string {
    return process.env.RESEND_FROM_EMAIL || this.defaultFrom;
  }
}
