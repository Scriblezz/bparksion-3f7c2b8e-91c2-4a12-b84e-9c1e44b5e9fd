import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Organization, Role, User } from '@org/data';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const existingUsers = await this.userRepo.count();
    if (existingUsers > 0) {
      this.logger.debug('Skipping seed because users already exist.');
      return;
    }

    const password = process.env.SEED_USER_PASSWORD ?? 'Passw0rd!';
    const passwordHash = await bcrypt.hash(password, 10);

    const organization = this.orgRepo.create({ name: 'Seed Organization' });
    await this.orgRepo.save(organization);

    const seeds: Array<{ email: string; role: Role }> = [
      { email: 'owner@example.com', role: 'owner' },
      { email: 'admin@example.com', role: 'admin' },
      { email: 'viewer@example.com', role: 'viewer' },
    ];

    await Promise.all(
      seeds.map((seed) =>
        this.userRepo.save(
          this.userRepo.create({
            email: seed.email,
            passwordHash,
            role: seed.role,
            organization,
          })
        )
      )
    );

    this.logger.log(
      `Seeded ${seeds.length} users for organization "${organization.name}". Default password: ${password}`
    );
  }
}
