import { config } from '../src/config/env.js';
import { openDatabase } from '../src/db/connection.js';
import { seedDemoData } from '../src/db/seed.js';
import { createApp } from '../src/app.js';
import { logger } from '../src/utils/logger.js';

const db = openDatabase(config.dbFile);

if (config.seedDemo && seedDemoData(db)) {
  logger.info('Data contoh dimasukkan (SEED_DEMO=true).');
}

const app = createApp({ db });

export default app;
