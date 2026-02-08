import { bootstrapApplication } from './app';
import { env } from './config/env';
import { closeMongo } from './config/mongo';

async function start(): Promise<void> {
  const { app } = await bootstrapApplication(env);
  const server = app.listen(env.appPort);

  const shutdown = async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });

    await closeMongo();
  };

  process.on('SIGINT', () => {
    shutdown().catch((error) => {
      console.error(error);
      process.exit(1);
    });
  });

  process.on('SIGTERM', () => {
    shutdown().catch((error) => {
      console.error(error);
      process.exit(1);
    });
  });
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
