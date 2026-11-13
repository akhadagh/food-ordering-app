/**
 * Registration, sign-in, sessions, the profile and password management.
 */
import { api, browser, signup, signin, ADMIN, uniqueEmail, bearer } from '../helpers/api.js';
import { resetDatabase } from '../helpers/db.js';

beforeEach(async () => {
  await resetDatabase();
});

describe('registration', () => {
  it('creates a customer and never returns the password hash', async () => {
    const res = await api()
      .post('/api/auth/signup')
      .send({
        name: 'Ama Serwaa',
        email: 'ama@example.test',
        password: 'Password123',
        phone: '0241234567',
      });

    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({
      name: 'Ama Serwaa',
      email: 'ama@example.test',
      role: 'customer',
      is_active: true,
    });
    expect(res.body.user.password_hash).toBeUndefined();
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(res.body.token).toBeTruthy();
  });

  it('issues httpOnly session cookies', async () => {
    const res = await api()
      .post('/api/auth/signup')
      .send({ name: 'Kofi', email: 'kofi@example.test', password: 'Password123' });

    const cookies = res.headers['set-cookie'] || [];
    const access = cookies.find((c) => c.startsWith('afia_access='));
    const refresh = cookies.find((c) => c.startsWith('afia_refresh='));

    expect(access).toBeTruthy();
    expect(refresh).toBeTruthy();
    expect(access).toMatch(/HttpOnly/i);
    expect(refresh).toMatch(/HttpOnly/i);
    expect(access).toMatch(/SameSite=Lax/i);
  });

  it('ignores a role supplied by the client', async () => {
    const res = await api()
      .post('/api/auth/signup')
      .send({
        name: 'Escalator',
        email: 'escalator@example.test',
        password: 'Password123',
        role: 'admin',
      });

    // The strict schema refuses the body outright...
    expect(res.status).toBe(400);

    // ...and even if it did not, the account would not be an administrator.
    const agent = browser();
    const signupRes = await agent
      .post('/api/auth/signup')
      .send({
        name: 'Escalator',
        email: 'escalator2@example.test',
        password: 'Password123',
        is_admin: true,
        role: 'admin',
      });
    expect(signupRes.status).toBe(400);
  });

  it('refuses a duplicate address', async () => {
    const body = { name: 'Ama', email: 'ama@example.test', password: 'Password123' };
    await api().post('/api/auth/signup').send(body).expect(201);

    const res = await api().post('/api/auth/signup').send(body);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('conflict');
  });

  it('treats the address as case-insensitive', async () => {
    await api()
      .post('/api/auth/signup')
      .send({ name: 'Ama', email: 'ama@example.test', password: 'Password123' })
      .expect(201);

    const res = await api()
      .post('/api/auth/signup')
      .send({ name: 'Ama', email: 'AMA@EXAMPLE.TEST', password: 'Password123' });
    expect(res.status).toBe(409);
  });

  it('refuses a weak password', async () => {
    const res = await api()
      .post('/api/auth/signup')
      .send({ name: 'Weak', email: 'weak@example.test', password: 'short' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('validation_failed');
  });

  it('refuses a password with no number', async () => {
    const res = await api()
      .post('/api/auth/signup')
      .send({ name: 'Weak', email: 'weak@example.test', password: 'onlyletters' });

    expect(res.status).toBe(400);
  });

  it('refuses a phone number that is not Ghanaian', async () => {
    const res = await api()
      .post('/api/auth/signup')
      .send({
        name: 'Wrong',
        email: 'wrong@example.test',
        password: 'Password123',
        phone: '5551234',
      });

    expect(res.status).toBe(400);
  });

  it('accepts both Ghanaian phone formats', async () => {
    await api()
      .post('/api/auth/signup')
      .send({
        name: 'One',
        email: 'one@example.test',
        password: 'Password123',
        phone: '0241234567',
      })
      .expect(201);

    await api()
      .post('/api/auth/signup')
      .send({
        name: 'Two',
        email: 'two@example.test',
        password: 'Password123',
        phone: '+233241234567',
      })
      .expect(201);
  });
});

describe('sign-in', () => {
  it('returns the customer and a session for good credentials', async () => {
    await api()
      .post('/api/auth/signup')
      .send({ name: 'Ama', email: 'ama@example.test', password: 'Password123' })
      .expect(201);

    const res = await api()
      .post('/api/auth/login')
      .send({ email: 'ama@example.test', password: 'Password123' });

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('ama@example.test');
    expect(res.body.token).toBeTruthy();
  });

  it('refuses a wrong password', async () => {
    await api()
      .post('/api/auth/signup')
      .send({ name: 'Ama', email: 'ama@example.test', password: 'Password123' })
      .expect(201);

    const res = await api()
      .post('/api/auth/login')
      .send({ email: 'ama@example.test', password: 'WrongPassword1' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('unauthorized');
  });

  it('answers an unknown address exactly like a wrong password', async () => {
    const unknown = await api()
      .post('/api/auth/login')
      .send({ email: 'nobody@example.test', password: 'Password123' });

    await api()
      .post('/api/auth/signup')
      .send({ name: 'Ama', email: 'ama@example.test', password: 'Password123' })
      .expect(201);
    const wrong = await api()
      .post('/api/auth/login')
      .send({ email: 'ama@example.test', password: 'WrongPassword1' });

    expect(unknown.status).toBe(wrong.status);
    expect(unknown.body.error.message).toBe(wrong.body.error.message);
  });

  it('locks the account after too many failures', async () => {
    await api()
      .post('/api/auth/signup')
      .send({ name: 'Ama', email: 'ama@example.test', password: 'Password123' })
      .expect(201);

    for (let i = 0; i < 3; i += 1) {
      await api()
        .post('/api/auth/login')
        .send({ email: 'ama@example.test', password: 'WrongPassword1' })
        .expect(401);
    }

    const locked = await api()
      .post('/api/auth/login')
      .send({ email: 'ama@example.test', password: 'Password123' });

    expect(locked.status).toBe(429);
    expect(locked.body.error.code).toBe('too_many_requests');
  });

  it('clears the failure count after a successful sign-in', async () => {
    await api()
      .post('/api/auth/signup')
      .send({ name: 'Ama', email: 'ama@example.test', password: 'Password123' })
      .expect(201);

    await api()
      .post('/api/auth/login')
      .send({ email: 'ama@example.test', password: 'WrongPassword1' })
      .expect(401);

    await api()
      .post('/api/auth/login')
      .send({ email: 'ama@example.test', password: 'Password123' })
      .expect(200);

    const res = await api()
      .post('/api/auth/login')
      .send({ email: 'ama@example.test', password: 'WrongPassword1' });
    expect(res.status).toBe(401);
  });

  it('signs the administrator in', async () => {
    const res = await api()
      .post('/api/auth/login')
      .send({ email: ADMIN.email, password: ADMIN.password });

    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('admin');
  });
});

describe('sessions', () => {
  it('signs a customer out and clears the cookies', async () => {
    const agent = browser();
    await signup(agent);

    const res = await agent.post('/api/auth/logout');
    expect(res.status).toBe(200);

    const cookies = res.headers['set-cookie'] || [];
    expect(cookies.some((c) => /^afia_access=;/.test(c))).toBe(true);
  });

  it('issues a new access token from the refresh cookie', async () => {
    const agent = browser();
    const { res: signupRes } = await signup(agent);
    expect(signupRes.status).toBe(201);

    const refreshed = await agent.post('/api/auth/refresh');
    expect(refreshed.status).toBe(200);
    expect(refreshed.body.token).toBeTruthy();
    expect(refreshed.body.user.email).toBe(signupRes.body.user.email);
  });

  it('refuses a refresh without a session', async () => {
    const res = await api().post('/api/auth/refresh');
    expect(res.status).toBe(401);
  });

  it('refuses an access token that was signed with the wrong secret', async () => {
    const res = await api()
      .get('/api/auth/profile')
      .set(bearer('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInR5cCI6ImFjY2VzcyJ9.nope'));

    expect(res.status).toBe(401);
  });
});

describe('the profile', () => {
  it('needs a session', async () => {
    const res = await api().get('/api/auth/profile');
    expect(res.status).toBe(401);
  });

  it('returns the signed-in customer', async () => {
    const { agent, token, user } = await signup(browser());

    const res = await agent.get('/api/auth/profile').set(bearer(token));
    expect(res.status).toBe(200);
    expect(res.body.email).toBe(user.email);
    expect(res.body.password_hash).toBeUndefined();
  });

  it('updates the name, the phone number and the address', async () => {
    const { agent, token } = await signup(browser());

    const res = await agent
      .put('/api/auth/profile')
      .set(bearer(token))
      .send({ name: 'New Name', phone: '0551234567', address: '1 Oxford Street, Accra' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('New Name');
    expect(res.body.phone).toBe('0551234567');
    expect(res.body.address).toBe('1 Oxford Street, Accra');
  });

  it('refuses an unknown field', async () => {
    const { agent, token } = await signup(browser());

    const res = await agent
      .put('/api/auth/profile')
      .set(bearer(token))
      .send({ name: 'New Name', role: 'admin' });

    expect(res.status).toBe(400);
  });

  it('refuses an invalid phone number', async () => {
    const { agent, token } = await signup(browser());

    const res = await agent
      .put('/api/auth/profile')
      .set(bearer(token))
      .send({ name: 'New Name', phone: '12345' });

    expect(res.status).toBe(400);
  });
});

describe('passwords', () => {
  it('changes the password and invalidates the old one', async () => {
    const agent = browser();
    await signup(agent, { password: 'OldPassword1' });

    const wrong = await agent
      .put('/api/auth/password')
      .send({ currentPassword: 'NotThePassword1', newPassword: 'NewPassword2' });
    expect(wrong.status).toBe(400);

    const ok = await agent
      .put('/api/auth/password')
      .send({ currentPassword: 'OldPassword1', newPassword: 'NewPassword2' });
    expect(ok.status).toBe(200);

    await api()
      .post('/api/auth/login')
      .send({ email: (await agent.get('/api/auth/profile')).body.email, password: 'OldPassword1' })
      .expect(401);

    await api()
      .post('/api/auth/login')
      .send({ email: (await agent.get('/api/auth/profile')).body.email, password: 'NewPassword2' })
      .expect(200);
  });

  it('resets a forgotten password with a token', async () => {
    const agent = browser();
    const { body } = await signup(agent);

    const forgot = await api()
      .post('/api/auth/password/forgot')
      .send({ email: body.email });
    expect(forgot.status).toBe(200);
    expect(forgot.body.resetToken).toBeTruthy();

    const reset = await api()
      .post('/api/auth/password/reset')
      .send({ token: forgot.body.resetToken, newPassword: 'ResetPassword1' });
    expect(reset.status).toBe(200);

    await api()
      .post('/api/auth/login')
      .send({ email: body.email, password: 'ResetPassword1' })
      .expect(200);
  });

  it('never reveals whether an address is registered', async () => {
    const res = await api()
      .post('/api/auth/password/forgot')
      .send({ email: uniqueEmail('nobody') });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/If that email is registered/);
    expect(res.body.resetToken).toBeNull();
  });

  it('refuses to reuse a reset token', async () => {
    const agent = browser();
    const { body } = await signup(agent);

    const forgot = await api().post('/api/auth/password/forgot').send({ email: body.email });
    await api()
      .post('/api/auth/password/reset')
      .send({ token: forgot.body.resetToken, newPassword: 'ResetPassword1' })
      .expect(200);

    const again = await api()
      .post('/api/auth/password/reset')
      .send({ token: forgot.body.resetToken, newPassword: 'AnotherOne1' });
    expect(again.status).toBe(400);
  });
});
