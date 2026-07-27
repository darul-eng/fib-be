module.exports = {
  apps: [
    {
      name: 'siaf-backend',
      script: 'dist/main.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
      autorestart: true,
      max_restarts: 10,
      merge_logs: true,
    },
  ],
};
