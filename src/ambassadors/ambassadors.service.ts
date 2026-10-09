import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { UserRole } from 'src/users/enums/user.enum';
import { EmailService } from 'src/email/email.service';
import { CreateAmbassadorDto } from './dto/create-ambassador.dto';
import { UpdateAmbassadorDto } from './dto/update-ambassador.dto';
import { Ambassador } from './entities/ambassador.entity';

@Injectable()
export class AmbassadorsService {
  private readonly logger = new Logger(AmbassadorsService.name);

  constructor(
    @InjectRepository(Ambassador)
    private readonly ambassadorRepo: Repository<Ambassador>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly emailService: EmailService,
  ) {}

  create(createAmbassadorDto: CreateAmbassadorDto) {
    return this.createStudentAmbassador(createAmbassadorDto);
  }

  private async createStudentAmbassador(
    createAmbassadorDto: CreateAmbassadorDto,
  ): Promise<Ambassador> {
    const existing = await this.ambassadorRepo.findOne({
      where: [
        { email: createAmbassadorDto.email },
        { studentMatricNo: createAmbassadorDto.studentMatricNo },
      ],
    });

    if (existing) {
      throw new ConflictException(
        'An ambassador with this email or student matric number already exists',
      );
    }

    const ambassador = await this.ambassadorRepo.save(
      this.ambassadorRepo.create({
        ...createAmbassadorDto,
        status: 'pending',
      }),
    );
    void this.notifyAdminsAboutNewAmbassador(ambassador).catch((error) => {
      this.logger.error(
        'Failed to send ambassador application review notification',
        error instanceof Error ? error.stack : String(error),
      );
    });
    return ambassador;
  }

  private async notifyAdminsAboutNewAmbassador(
    ambassador: Ambassador,
  ): Promise<void> {
    const admins = await this.userRepo.find({
      where: [
        { role: UserRole.ADMIN, isActive: true, emailVerified: true },
        { role: UserRole.SUPER_ADMIN, isActive: true, emailVerified: true },
      ],
      select: ['id', 'fullName', 'email'],
    });
    const fields = [
      ['Name', ambassador.fullName], ['Email', ambassador.email],
      ['Phone', ambassador.phone], ['State', ambassador.state],
      ['Institution', ambassador.institution],
      ['Course / Department', ambassador.courseDepartment],
      ['Level', ambassador.level],
      ['Social media handles', JSON.stringify(ambassador.socialMediaHandles)],
      ['Promotion plan', ambassador.promotionPlan],
      ['Promotion notes', ambassador.promotionNotes],
      ['Student matric number', ambassador.studentMatricNo],
      ['Student ID card', ambassador.idCardUrl],
    ].map(([label, value]) => ({ label, value }));

    await Promise.all(admins.filter((admin) => admin.email).map((admin) =>
      this.emailService.sendApplicationReviewNotificationEmail({
        adminEmail: admin.email,
        adminName: admin.fullName,
        applicantName: ambassador.fullName,
        applicantEmail: ambassador.email,
        applicationType: 'Student ambassador',
        fields,
        reviewUrl: process.env.ADMIN_DASHBOARD_URL || 'https://dojuhealth.com/admin',
      }),
    ));
  }

  findAll() {
    return this.ambassadorRepo.find();
  }

  findOne(id: string) {
    return this.ambassadorRepo.findOne({ where: { id } });
  }

  update(id: string, updateAmbassadorDto: UpdateAmbassadorDto) {
    return this.ambassadorRepo.update(id, updateAmbassadorDto);
  }

  remove(id: string) {
    return this.ambassadorRepo.delete(id);
  }
}
