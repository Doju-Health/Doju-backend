import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { UserRole } from 'src/users/enums/user.enum';
import { EmailService } from 'src/email/email.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';
import { Agent } from './entities/agent.entity';

@Injectable()
export class AgentsService {
  private readonly logger = new Logger(AgentsService.name);

  constructor(
    @InjectRepository(Agent)
    private readonly agentRepo: Repository<Agent>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly emailService: EmailService,
  ) {}


  create(createAgentDto: CreateAgentDto) {
    return this.createAgent(createAgentDto);
  }

  private async createAgent(
    createAgentDto: CreateAgentDto,
  ): Promise<Agent> {
    const existing = await this.agentRepo.findOne({
      where: [
        { email: createAgentDto.email },
        { phone: createAgentDto.phone },
        { nin: createAgentDto.nin },
      ],
    });

    if (existing) {
      throw new ConflictException('Agent with this email, phone, or NIN already exists');
    }

    const agent = this.agentRepo.create({
      ...createAgentDto,
      status: 'pending',
    });
    const savedAgent = await this.agentRepo.save(agent);
    void this.notifyAdminsAboutNewAgent(savedAgent).catch((error) => {
      this.logger.error(
        'Failed to send agent application review notification',
        error instanceof Error ? error.stack : String(error),
      );
    });
    return savedAgent;
  }

  private async notifyAdminsAboutNewAgent(agent: Agent): Promise<void> {
    const admins = await this.userRepo.find({
      where: [
        { role: UserRole.ADMIN, isActive: true, emailVerified: true },
        { role: UserRole.SUPER_ADMIN, isActive: true, emailVerified: true },
      ],
      select: ['id', 'fullName', 'email'],
    });
    const fields = [
      ['Name', agent.fullName], ['Email', agent.email], ['Phone', agent.phone],
      ['State', agent.state], ['Occupation', agent.occupation],
      ['Coverage areas', agent.coverageAreas], ['Social media handles', JSON.stringify(agent.socialMediaHandles)],
      ['Promotion plan', agent.promotionPlan], ['Promotion notes', agent.promotionNotes],
      ['NIN', agent.nin], ['Motivation', agent.motivation],
      ['Identity document', agent.identityDocument],
    ].map(([label, value]) => ({ label, value }));

    await Promise.all(admins.filter((admin) => admin.email).map((admin) =>
      this.emailService.sendApplicationReviewNotificationEmail({
        adminEmail: admin.email,
        adminName: admin.fullName,
        applicantName: agent.fullName,
        applicantEmail: agent.email,
        applicationType: 'Agent',
        fields,
        reviewUrl: process.env.ADMIN_DASHBOARD_URL || 'https://dojuhealth.com/admin',
      }),
    ));
  }

  findAll() {
    return this.agentRepo.find();
  }

  findOne(id: number) {
    return this.agentRepo.findOne({ where: { id } });
  }

  update(id: number, updateAgentDto: UpdateAgentDto) {
    return this.agentRepo.update(id, updateAgentDto);
  }

  remove(id: number) {
    return this.agentRepo.delete(id);
  }
}
