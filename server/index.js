const app = require('./app');
const connectDB = require('./db');
const mattermostListener = require('./services/mattermostListener');

const PORT = process.env.PORT || 5001;

async function startServer() {
  try {
    await connectDB();
    console.log('Database connected successfully.');
    
    // Initialize active Mattermost listeners on boot
    await mattermostListener.init();
  } catch (err) {
    console.error('Database connection failed during startup:', err);
  }

  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

startServer();