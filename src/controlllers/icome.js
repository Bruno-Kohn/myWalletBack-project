import Joi from 'joi';
import dayjs from 'dayjs';
import connection from '../../database/database.js';

app.post('/income', async (req, res) => {
  const { authorization } = req.headers.authorization;
  const token = authorization?.replace('Bearer ', '');

  if (!token) return res.sendStatus(401);

  const schema = Joi.object({
    incomeValue: Joi.number().positive().greater(0).required(),
    incomeDescription: Joi.string().min(3).required(),
  });

  const value = schema.validate(req.body);
  const { incomeValue, incomeDescription } = req.body;

  try {
    const user = await connection.query(
      `
    SELECT * FROM sessions
    WHERE token = $1`,
      [token]
    );

    const { userId } = user.rows[0].userId;
    const date = dayjs().format('YYYY/MM/DD');

    await connection.query(
      `INSERT INTO transactions      
        ("userId", value, description, date) 
        VALUES ($1, $2, $3, $4)`,
      [userId, incomeValue, incomeDescription, date]
    );
    return res.sendStatus(201);
  } catch (error) {
    console.log(error);
    return res.sendStatus(500);
  }
});
