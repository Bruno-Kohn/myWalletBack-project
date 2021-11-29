import connection from '../../database/database.js';

app.get('/records', async (req, res) => {
  const { authorization } = req.headers.authorization;
  const token = authorization?.replace('Bearer ', '');

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
    return res.send(result.rows).status(200);
  } catch (error) {
    console.log(error);
    return res.sendStatus(500);
  }
});
