import app from '../src/app.js';
import supertest from 'supertest';
import connection from '../database/database.js';
import bcrypt from 'bcrypt';

describe('POST /register', () => {
  beforeAll(async () => {
    const hashPassword = bcrypt.hashSync('123456', 10);
    await connection.query(
      `INSERT INTO users (name, email, password) VALUES ('Test Test','testtest@driven.com', $1)`,
      [hashPassword]
    );
  });

  afterAll(async () => {
    await connection.query(`
      DELETE FROM users WHERE name = 'Test Test' OR name = 'Test Correct'`);
    connection.end();
  });

  it('returns 400 for invalid password confirmation', async () => {
    const body = {
      name: 'Test Test',
      email: 'testtest@driven.com',
      password: 'test123',
      passwordConfirmation: 'test1234',
    };

    const result = await supertest(app).post('/register').send(body);
    expect(result.status).toEqual(400);
  });

  it('returns 409 for email already registered', async () => {
    const body = {
      name: 'Test Test',
      email: 'testtest@driven.com',
      password: 'test123',
      passwordConfirmation: 'test123',
    };

    const result = await supertest(app).post('/register').send(body);
    expect(result.status).toEqual(409);
  });

  it('returns 201 when the registration is done correctly', async () => {
    const body = {
      name: 'Test Correct',
      email: 'testcorrect@driven.com',
      password: 'test321',
      passwordConfirmation: 'test321',
    };

    const result = await supertest(app).post('/register').send(body);
    expect(result.status).toEqual(201);
  });
});
