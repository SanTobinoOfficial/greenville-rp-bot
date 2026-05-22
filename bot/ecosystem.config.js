// PM2 Ecosystem Config — AURORA Greenville RP Bot
// Użycie: pm2 start ecosystem.config.js
// Instalacja PM2: npm install -g pm2

module.exports = {
  apps: [
    {
      name:         'aurora-bot',
      script:       'src/index.js',
      cwd:          __dirname,
      watch:        false,
      max_memory_restart: '512M',

      // Automatyczny restart przy awarii
      autorestart:  true,
      restart_delay: 3000,
      max_restarts: 10,

      // Zmienne środowiskowe (ładowane z .env przez dotenv w kodzie)
      env: {
        NODE_ENV: 'production',
      },
      env_development: {
        NODE_ENV: 'development',
      },

      // Logi
      log_file:  'logs/combined.log',
      out_file:  'logs/out.log',
      error_file:'logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
    },
  ],
};
