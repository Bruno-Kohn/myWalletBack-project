import express from "express";
import cors from 'cors';

const app = express();
app.use(cors());

app.post("/", (req, res) => {
    res.send("testando post");
  });

app.get("/", (req, res) => {
  res.send("testando get");
});

app.listen(4000, () => {
  console.log("Server runing on port 4000!");
});
