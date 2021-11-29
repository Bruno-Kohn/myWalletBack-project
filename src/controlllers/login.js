import Joi from 'joi';
import bcrypt from 'bcrypt';
import { v4 as uuid } from 'uuid';
import connection from '../../database/database.js';

app.post('/', async (req, res) => {
  const schema = Joi.object({
    email: Joi.string()
      .email({ minDomainSegments: 2, tlds: { allow: ['com', 'net'] } })
      .required(),
    password: Joi.string().min(5).required(),
  });

  try {
    const value = await schema.validateAsync(req.body);
    const { email, password } = req.body;
    const result = await connection.query(
      `SELECT * FROM users
        WHERE email = $1`,
      [email]
    );
    const user = result.rows[0];

    const loginUser = await connection.query(
      `
        SELECT * FROM users
        JOIN sessions 
        ON users.id = sessions."userId"
        WHERE email = $1
    `,
      [email]
    );

    if (loginUser.rows.length) {
      await connection.query(
        `
          DELETE FROM sessions WHERE id = $1
        `,
        [loginUser.rows[0].id]
      );
    }

    if (user && bcrypt.compareSync(password, user.password)) {
      const token = uuid();

      await connection.query(
        `
          INSERT INTO sessions 
          ("userId", token) 
          VALUES ($1, $2)
        `,
        [user.id, token]
      );
      return res.send({ token, name: user.name }).status(200);
    }
    return res.sendStatus(401);
  } catch (error) {
    console.log(error);
    return res.sendStatus(500);
  }
});
