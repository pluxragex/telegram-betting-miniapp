export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    miniAppUrl: process.env.TELEGRAM_MINI_APP_URL || '',
    channelNewsId: process.env.TELEGRAM_CHANNEL_NEWS_ID || '',
  },
  database: {
    path: process.env.DATABASE_PATH || 'database.sqlite',
  },
  nodeEnv: process.env.NODE_ENV || 'development',
});

