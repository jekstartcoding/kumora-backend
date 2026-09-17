import 'dotenv/config';
import { createApp } from './app';
import { env } from './config/supabase';

const app = createApp();

app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`Kumora backend listening on http://localhost:${env.port}`);
});
