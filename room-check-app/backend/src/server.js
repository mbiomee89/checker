import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../../');

dotenv.config({ path: path.join(projectRoot, '.env') });

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is not set. Copy .env.example to .env and set it.');
  process.exit(1);
}

// Resolve a relative sqlite DATABASE_URL to an absolute path so behavior doesn't
// depend on the shell's cwd (Prisma resolves relative file: paths at generate time).
if (process.env.DATABASE_URL?.startsWith('file:')) {
  const relative = process.env.DATABASE_URL.slice('file:'.length);
  if (!path.isAbsolute(relative)) {
    process.env.DATABASE_URL = `file:${path.resolve(projectRoot, 'prisma', relative)}`;
  }
}

const { createApp } = await import('./app.js');

const app = createApp();
const port = Number(process.env.PORT || 3001);

app.listen(port, () => {
  console.log(`Checker backend listening on http://localhost:${port}`);
});
