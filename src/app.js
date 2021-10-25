import express from "express";
import cors from "cors";
import bcrypt from "bcrypt";
import { v4 as uuid } from "uuid";
import Joi from "joi";
import dayjs from "dayjs";
import connection from "../database/database.js";

const app = express();
app.use(cors());
app.use(express.json());

//-------------------- Register / Sign-up --------------------

app.post("/register", async (req, res) => {
  const schema = Joi.object({
    name: Joi.string().min(3).max(30).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(5).required(),
    passwordConfirmation: Joi.string().min(5).required(),
  });

  const value = schema.validate(req.body);
  const { name, email, password, passwordConfirmation } = req.body;

  if (password !== passwordConfirmation) {
    return res.sendStatus(400);
  }

  const result = await connection.query(`  
  SELECT * FROM users WHERE email = $1 
  `, [email]);

  if(result.rows.length > 0) {
    return res.sendStatus(409);
  }

  try {
    const passwordHash = bcrypt.hashSync(password, 11);
    await connection.query(
      `INSERT INTO users
        (name, email, password) 
        VALUES ($1, $2, $3)`,
      [name, email, passwordHash]
    );
    res.sendStatus(201);
  } catch (error) {
    res.sendStatus(500);
    console.log(error);
  }
});

//-------------------- Login / Sign-in --------------------

app.post("/", async (req, res) => {
  const schema = Joi.object({
    email: Joi.string()
      .email({ minDomainSegments: 2, tlds: { allow: ["com", "net"] } })
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
      res.send({ token, name: user.name }).status(200);
    } else {
      return res.sendStatus(401);
    }
  } catch (error) {
    console.log(error);
    return res.sendStatus(500);
  }
});

//-------------------- Get Records --------------------

app.get("/records", async (req, res) => {
  const authorization = req.headers.authorization;
  const token = authorization?.replace("Bearer ", "");

  if (!token) return res.sendStatus(401);

  try {
    const result = await connection.query(
      `
      SELECT transactions.*, sessions.token 
      FROM transactions 
      JOIN sessions 
      ON transactions."userId" = sessions."userId" 
      WHERE token = $1;
      `,
      [token]
    );
    res.send(result.rows).status(200);
  } catch (error) {
    console.log(error);
    return res.sendStatus(500);
  }
});

//-------------------- Post Income --------------------

app.post("/income", async (req, res) => {
  const authorization = req.headers.authorization;
  const token = authorization?.replace("Bearer ", "");

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

    const userId = user.rows[0].userId;
    const date = dayjs().format("YYYY/MM/DD");

    await connection.query(
      `INSERT INTO transactions      
        ("userId", value, description, date) 
        VALUES ($1, $2, $3, $4)`,
      [userId, incomeValue, incomeDescription, date]
    );
    res.sendStatus(201);
  } catch (error) {
    console.log(error);
    return res.sendStatus(500);
  }
});

//-------------------- Post Expense --------------------

app.post("/expense", async (req, res) => {
  const authorization = req.headers.authorization;
  const token = authorization?.replace("Bearer ", "");

  if (!token) return res.sendStatus(401);

  const schema = Joi.object({
    expenseValue: Joi.number().positive().greater(0).required(),
    expenseDescription: Joi.string().min(3).required(),
  });

  const value = schema.validate(req.body);
  const { expenseValue, expenseDescription } = req.body;

  try {
    const user = await connection.query(
      `
    SELECT * FROM sessions
    WHERE token = $1`,
      [token]
    );

    const userId = user.rows[0].userId;
    const date = dayjs().format("YYYY/MM/DD");

    await connection.query(
      `INSERT INTO transactions      
        ("userId", value, description, date) 
        VALUES ($1, $2, $3, $4)`,
      [userId, -expenseValue, expenseDescription, date]
    );
    res.sendStatus(201);
  } catch (error) {
    console.log(error);
    return res.sendStatus(500);
  }
});

export default app;
