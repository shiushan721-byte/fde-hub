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
import { dmRouter } from './routes/dm';
import { seedDatabase, ensureExpertApplicationSeed } from './db/seed';
import { ensureExpertNos } from './lib/expertNo';
import { startCustomOrderJobScheduler } from './services/customOrderJobs';
import { customServicesRouter } from './routes/customServices';
import { walletRouter } from './routes/wallet';
import { handleRobots, handleSeoPage, handleSitemap } from './seo';


dotenv.config();
dotenv.config({ path: '.env.local', override: false });

const app = express();
const port = Number(process.env.API_PORT || 8787);

app.use(
  cors({
    origin: [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:5173',
      'http://127.0.0.1:5173'
    ],
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
app.use('/api/dm', dmRouter);
app.use('/api/custom-services', customServicesRouter);
app.use('/api/wallet', walletRouter);
app.use('/api/public', publicRouter);
app.use('/api/consultations', consultationRouter);
app.use('/api/expert-applications', expertApplicationRouter);
app.use('/api/admin', requireAdmin, adminRouter);

// Public pages are rendered on the server so crawlers and link previews receive
// the page's real title, description, content and structured data without JS.
const asyncRoute =
  (handler: (req: express.Request, res: express.Response) => Promise<unknown>) =>
  (req: express.Request, res: express.Response, next: express.NextFunction) => {
    void handler(req, res).catch(next);
  };
app.get('/robots.txt', handleRobots);
app.get('/sitemap.xml', asyncRoute(handleSitemap));
app.get('/', asyncRoute(handleSeoPage));
app.get('/agents', asyncRoute(handleSeoPage));
app.get('/experts', asyncRoute(handleSeoPage));
app.get('/inspirations', asyncRoute(handleSeoPage));
app.get('/agent/:agentId', asyncRoute(handleSeoPage));
app.get('/expert/:expertId', asyncRoute(handleSeoPage));
app.get('/inspiration/:inspirationId', asyncRoute(handleSeoPage));

const distDir = path.resolve(process.cwd(), 'dist');
const isProd = process.env.NODE_ENV === 'production';
app.use(
  express.static(distDir, {
    index: false,
    maxAge: isProd ? '1y' : 0,
    immutable: isProd
  })
);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  return fail(res, err.message || '服务器错误', 500, 'INTERNAL');
});

async function start() {
  await seedDatabase(false);
  await ensureExpertApplicationSeed();
  await ensureExpertNos();
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


