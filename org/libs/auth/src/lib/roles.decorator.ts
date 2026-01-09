import { SetMetadata } from '@nestjs/common';
import { Role } from '@org/data';

export const ROLES_KEY = 'org.roles';

export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
