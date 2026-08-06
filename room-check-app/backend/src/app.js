import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { UPLOAD_ROOT } from './middleware/upload.js';
import { errorHandler } from './utils/errors.js';

import authRoutes from './routes/auth.js';
import campRoutes from './routes/camps.js';
import roomRoutes from './routes/rooms.js';
import checklistItemRoutes from './routes/checklistItems.js';
import inspectionRoutes from './routes/inspections.js';
import correctiveActionRoutes from './routes/correctiveActions.js';
import priorityFlagRoutes from './routes/priorityFlags.js';
import adminCampRoutes from './routes/adminCamps.js';
import adminRoomRoutes from './routes/adminRooms.js';
import adminUserRoutes from './routes/adminUsers.js';
import adminChecklistRoutes from './routes/adminChecklist.js';
import hseRoutes from './routes/hse.js';

function health(_req, res) {
  res.json({ ok: true });
}

function mountApiRoutes(app, prefix) {
  app.use(`${prefix}/auth`, authRoutes);
  app.use(`${prefix}/camps`, campRoutes);
  app.use(`${prefix}/rooms`, roomRoutes);
  app.use(`${prefix}/checklist-items`, checklistItemRoutes);
  app.use(`${prefix}/inspections`, inspectionRoutes);
  app.use(`${prefix}/corrective-actions`, correctiveActionRoutes);
  app.use(`${prefix}/priority-flags`, priorityFlagRoutes);
  app.use(`${prefix}/admin/camps`, adminCampRoutes);
  app.use(`${prefix}/admin/rooms`, adminRoomRoutes);
  app.use(`${prefix}/admin/users`, adminUserRoutes);
  app.use(`${prefix}/admin/checklist-items`, adminChecklistRoutes);
  app.use(`${prefix}/hse`, hseRoutes);
}

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);

  app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
  app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') ?? true, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(rateLimit({ windowMs: 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false }));

  app.get('/health', health);
  app.get('/api/health', health);
  app.use('/uploads', express.static(UPLOAD_ROOT));
  app.use('/api/uploads', express.static(UPLOAD_ROOT));

  // Dev: mount routes at BOTH '' and '/api' — the Vite proxy strips '/api' before
  // forwarding, so requests arrive at the root path in dev but at '/api' in prod.
  if (process.env.NODE_ENV !== 'production') mountApiRoutes(app, '');
  mountApiRoutes(app, '/api');

  app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
  app.use(errorHandler);

  return app;
}
