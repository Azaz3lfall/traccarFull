module.exports = {
  apps: [
    {
      name: 'traccar-custom',
      script: 'nginx',
      args: '-c /opt/new/nginx.conf -g "daemon off;"',
      cwd: '/opt/new',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true
    },
    {
      name: 'gestao-backend',
      script: 'src/addons/gestao_backend/server.js',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        GESTAO_PORT: 3666,
        NODE_ENV: process.env.NODE_ENV || 'production',
        DATABASE_URL: process.env.DATABASE_URL,
        TRACCAR_API_URL: process.env.TRACCAR_API_URL,
        JWT_SECRET: process.env.JWT_SECRET,
        SESSION_SECRET: process.env.SESSION_SECRET,
        FRONTEND_URL: process.env.FRONTEND_URL
      }
    }
  ]
};
