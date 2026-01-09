import { Role } from '@org/data';
import { JwtUser } from './jwt.strategy';

const ROLE_ORDER: Role[] = ['viewer', 'admin', 'owner'];

const roleRank = (role: Role): number => {
  const idx = ROLE_ORDER.indexOf(role);
  return idx === -1 ? 0 : idx;
};

export const hasRoleOrHigher = (current: Role, required: Role): boolean => {
  return roleRank(current) >= roleRank(required);
};

export const userHasRole = (user: JwtUser | undefined, required: Role): boolean => {
  if (!user) return false;
  return hasRoleOrHigher(user.role, required);
};

export const isSameOrganization = (
  user: JwtUser | undefined,
  organizationId?: number | null
): boolean => {
  if (!user || organizationId == null) return false;
  return user.orgId === organizationId;
};

export const isResourceOwner = (
  user: JwtUser | undefined,
  ownerId?: number | null
): boolean => {
  if (!user || ownerId == null) return false;
  return user.id === Number(ownerId);
};

export const roleHierarchy = [...ROLE_ORDER];
