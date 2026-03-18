module.exports = {
  apps: [
    {
      name: 'blogmaster-pro',
      script: 'npx',
      args: 'wrangler pages dev dist --ip 0.0.0.0 --port 3000',
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
        TELEGRAM_BOT_TOKEN: 'test-token',
        GEMINI_API_KEY: '',
        ADMIN_ID: '123456789'
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork'
    }
  ]
}
