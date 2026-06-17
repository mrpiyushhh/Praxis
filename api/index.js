import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const app = require('../server/app.js');

export default app;