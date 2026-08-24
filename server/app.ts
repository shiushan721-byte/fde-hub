import dotenv from 'dotenv';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import path from 'node:path';
import { prisma } from './lib/prisma';
import { fail } from './lib/http';
import { attachUser, requireAdmin } from './middleware/auth';
import { authRouter } from './routes/auth';
import { publicRouter } from './routes/public';
import { adminRouter } from './routes/admin';
import { consultationRouter } from './routes/consultations';
import { expertApplicationRouter } from './routes/expertApplications';
import { meRouter } from './routes/me';
import { customOrderRouter } from './routes/customOrders';
import { seedDatabase, ensureExpertApplicationSeed } from './db/seed';
import { startCustomOrderJobScheduler } from './services/customOrderJobs';


dotenv.config();

const app = express();
const port = Number(process.env.API_PORT || 8787);

app.use(
  cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());
app.use(attachUser);
app.use('/uploads', express.static(path.resolve(process.cwd(), 'server/uploads')));

app.get('/api/health', async (_req, res) => {
  const agents = await prisma.agent.count();
  res.json({ ok: true, data: { agents, time: new Date().toISOString() } });
});

app.use('/api/auth', authRouter);
app.use('/api/me', meRouter);
app.use('/api/custom-orders', customOrderRouter);
app.use('/api/public', publicRouter);
app.use('/api/consultations', consultationRouter);
app.use('/api/expert-applications', expertApplicationRouter);
app.use('/api/admin', requireAdmin, adminRouter);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  return fail(res, err.message || '服务器错误', 500, 'INTERNAL');
});

async function start() {
  await seedDatabase(false);
  await ensureExpertApplicationSeed();
  startCustomOrderJobScheduler(
    Number(process.env.CUSTOM_ORDER_JOB_INTERVAL_MS || 5 * 60 * 1000)
  );
  app.listen(port, () => {
    console.log(`FDE Hub API listening on http://127.0.0.1:${port}`);
  });
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
