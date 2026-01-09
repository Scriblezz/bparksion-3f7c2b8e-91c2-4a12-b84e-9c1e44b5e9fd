import axios, { AxiosError } from 'axios';

interface AuthSession {
  token: string;
  user: {
    id: number;
    email: string;
    role: 'owner' | 'admin' | 'viewer';
  };
}

const credentials = {
  owner: { email: 'owner@example.com', password: 'Passw0rd!' },
  admin: { email: 'admin@example.com', password: 'Passw0rd!' },
  viewer: { email: 'viewer@example.com', password: 'Passw0rd!' },
};

const authHeaders = (token: string) => ({
  headers: { Authorization: `Bearer ${token}` },
});

async function loginUser(email: string, password: string): Promise<AuthSession> {
  const loginRes = await axios.post('/api/auth/login', { email, password });
  expect(loginRes.status).toBe(201);

  const token = loginRes.data.access_token;
  expect(typeof token).toBe('string');

  const profile = await axios.get('/api/auth/me', authHeaders(token));
  return { token, user: profile.data };
}

async function createTask(
  token: string,
  payload: { title: string; ownerId?: number; description?: string }
) {
  const res = await axios.post('/api/tasks', payload, authHeaders(token));
  return res.data;
}

describe('API authentication & authorization', () => {
  let owner: AuthSession;
  let admin: AuthSession;
  let viewer: AuthSession;

  beforeAll(async () => {
    owner = await loginUser(credentials.owner.email, credentials.owner.password);
    admin = await loginUser(credentials.admin.email, credentials.admin.password);
    viewer = await loginUser(credentials.viewer.email, credentials.viewer.password);
  });

  it('login returns token', () => {
    expect(owner.token).toEqual(expect.any(String));
    expect(owner.user.email).toBe(credentials.owner.email);
  });

  it('viewer cannot POST /tasks', async () => {
    try {
      await axios.post(
        '/api/tasks',
        { title: 'Viewer attempt' },
        authHeaders(viewer.token)
      );
      fail('Viewer should not be able to create tasks');
    } catch (error) {
      const status = (error as AxiosError).response?.status;
      expect(status).toBe(403);
    }
  });

  it('viewer only sees their own tasks', async () => {
    const viewerTaskTitle = `Viewer Task ${Date.now()}`;
    const ownerTaskTitle = `Owner Task ${Date.now()}`;

    await createTask(owner.token, {
      title: viewerTaskTitle,
      ownerId: viewer.user.id,
      description: 'Owned by viewer',
    });
    await createTask(owner.token, {
      title: ownerTaskTitle,
      description: 'Owned by owner',
    });

    const res = await axios.get('/api/tasks', authHeaders(viewer.token));

    expect(res.status).toBe(200);
    expect(res.data.length).toBeGreaterThan(0);
    expect(res.data.every((task: { owner: { id: number } }) => task.owner.id === viewer.user.id)).toBe(
      true
    );
    expect(res.data.map((task: { title: string }) => task.title)).toContain(viewerTaskTitle);
  });

  it.each([
    ['owner', () => owner],
    ['admin', () => admin],
  ])('%s can GET /audit-log', async (_label, sessionAccessor) => {
    const res = await axios.get('/api/audit-log', authHeaders(sessionAccessor().token));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data)).toBe(true);
  });
});
