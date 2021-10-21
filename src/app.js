import express from "express";
import cors from "cors";
import pg from "pg";
import bcrypt from "bcrypt";
import { v4 as uuid } from "uuid";

const app = express();
app.use(cors());

//-------------------- Connection --------------------

const { Pool } = pg;

const connection = new Pool({
  user: "postgres",
  password: "password",
  host: "localhost",
  port: 5432,
  database: "mywallet",
});

//-------------------- Register / Sign-up --------------------

app.post("/register", async (req, res) => {
  const { name, email, password, passwordConfirmation } = req.body;

  if (password !== passwordConfirmation) {
    return res.sendStatus(400);
  }

  const passwordHash = bcrypt.hashSync(password, 11);

  try {
    await connection.query(
      `INSERT INTO users
        (name, email, password) 
        VALUES ($1, $2, $3)`,
      [name, email, passwordHash]
    );
    res.sendStatus(201);
  } catch (error) {
    console.log(error);
  }
});

//-------------------- Login / Sign-in --------------------

app.post("/", async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await connection.query(
      `SELECT * FROM users
        WHERE email = $1`,
      [email]
    );

    const user = result.rows[0];

    if (user && bcrypt.compareSync(password, user.password)) {
      const token = uuid.v4();

      await connection.query(
        `INSERT INTO session 
          ("userId", token) 
          VALUES ($1, $2)`,
        [user.id, token]
      );
      res.send(token).status(201);
    } else {
      return res.sendStatus(401);
    }
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
