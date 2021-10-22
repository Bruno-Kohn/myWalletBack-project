import express from "express";
import cors from "cors";
import pg from "pg";
import bcrypt from "bcrypt";
import { v4 as uuid } from "uuid";
import Joi from "joi";

const app = express();
app.use(cors());
app.use(express.json());

//-------------------- Connection --------------------

const { Pool } = pg;

const connection = new Pool({
  user: "postgres",
  password: "123456",
  host: "localhost",
  port: 5432,
  database: "mywallet",
});

//-------------------- Register / Sign-up --------------------

app.post("/register", async (req, res) => {
  const schema = Joi.object({
    name: Joi.string().min(3).max(30).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(5).required(),
    passwordConfirmation: Joi.string().min(5).required(),
  });

  const value = schema.validate(req.body);
  console.log(value);
  const { name, email, password, passwordConfirmation } = req.body;

  if (password !== passwordConfirmation) {
    return res.sendStatus(400);
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
    const { email, password } = value;
    const result = await connection.query(
      `SELECT * FROM users
        WHERE email = $1`,
      [email]
    );

    const user = result.rows[0];

    if (user && bcrypt.compareSync(password, user.password)) {
      const token = uuid();

      await connection.query(
        `INSERT INTO sessions 
          ("userId", token) 
          VALUES ($1, $2)`,
        [user.id, token]
      );
      res.send({token, name: user.name}).status(201);
    } else {
      return res.sendStatus(401);
    }
  } catch (error) {
    console.log(error);
    return res.sendStatus(500);
  }
});

//-------------------- Post Records --------------------

app.get("/records", async (req, res) => {
  const authorization = req.headers.authorization;
  const token = authorization?.replace("Bearer ", "");

  if (!token) return res.sendStatus(401);

  try {
    const result = await connection.query(
      `
    SELECT * FROM sessions
    JOIN users
    ON sessions."userId" = users.id
    WHERE sessions.token = $1
      `,
      [token]
    );

    const userToken = result.rows[0];
    res.send(userToken).status(201);
  } catch (error) {
    console.log(error);
    return res.sendStatus(500);
  }
});

//-------------------- Test --------------------

app.get("/", (req, res) => {
  res.send("testando get");
});

//-------------------- Server --------------------

app.listen(4000, () => {
  console.log("Server runing on port 4000!");
});
