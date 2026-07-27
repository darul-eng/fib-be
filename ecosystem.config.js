module.exports = {
  apps: [
    {
      name: 'siaf-backend',
      script: 'dist/src/main.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 10,
      merge_logs: true,
    },
  ],
};
