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
    }
  ]
};
