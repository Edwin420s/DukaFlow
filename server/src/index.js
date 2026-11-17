import { app } from './app.js';
import { env } from './config/env.js';
import { connectDatabase } from './config/database.js';

await connectDatabase();
app.listen(env.PORT, () => {
  console.log(`DukaFlow Retail API running on port ${env.PORT} [${env.NODE_ENV}]`);
});
