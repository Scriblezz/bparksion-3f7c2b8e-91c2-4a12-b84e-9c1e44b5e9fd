import { JwtUser } from './jwt.strategy';
import {
  hasRoleOrHigher,
  userHasRole,
  isSameOrganization,
  isResourceOwner,
  roleHierarchy,
} from './role.utils';

describe('role.utils', () => {
  const baseUser: JwtUser = { id: 7, email: 'admin@example.com', role: 'admin', orgId: 42 };

  it('compares roles by hierarchy', () => {
    expect(hasRoleOrHigher('owner', 'admin')).toBe(true);
    expect(hasRoleOrHigher('viewer', 'admin')).toBe(false);
    expect(hasRoleOrHigher('admin', 'admin')).toBe(true);
  });

  it('checks if user satisfies a required role', () => {
    expect(userHasRole(baseUser, 'viewer')).toBe(true);
    expect(userHasRole(undefined, 'viewer')).toBe(false);
    expect(userHasRole({ ...baseUser, role: 'viewer' }, 'owner')).toBe(false);
  });

  it('verifies organization ownership safely', () => {
    expect(isSameOrganization(baseUser, 42)).toBe(true);
    expect(isSameOrganization(baseUser, 99)).toBe(false);
    expect(isSameOrganization(undefined, 42)).toBe(false);
    expect(isSameOrganization(baseUser, undefined)).toBe(false);
  });

  it('detects resource ownership', () => {
    expect(isResourceOwner(baseUser, 7)).toBe(true);
    expect(isResourceOwner(baseUser, 99)).toBe(false);
    expect(isResourceOwner(undefined, 7)).toBe(false);
  });

  it('exposes the role hierarchy in ascending order', () => {
    expect(roleHierarchy).toEqual(['viewer', 'admin', 'owner']);
  });
});
