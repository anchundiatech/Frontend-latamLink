import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import dotenv from 'dotenv';
import { prisma } from './lib/prisma.js';
import merchantRoutes from './routes/merchantRoutes.js';

dotenv.config();

const app = express();
// Next usa el 3000 y el relayer el 3001: esta API escucha en el 3002 salvo que
// se indique otra cosa, para que los tres puedan correr a la vez en local.
const port = Number(process.env.API_PORT ?? process.env.PORT ?? 3002);

app.use(express.json({ limit: '100kb' }));
app.use('/api/merchants', merchantRoutes);

// Monitoreo
app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'OK', message: 'LatamLink Pay API operativa' });
});

// Comprobación de conexión a la base de datos. Antes devolvía el listado de
// dueños (datos personales) a quien la llamara; ahora solo informa del estado.
app.get('/api/test-db', async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: 'success', message: 'Conexión a la base de datos correcta' });
  } catch (error) {
    console.error('Error crítico en la BD:', error);
    res.status(503).json({ status: 'error', message: 'Fallo al conectar con la base de datos' });
  }
});

app.use((_req: Request, res: Response) => {
  res.status(404).json({ status: 'error', message: 'Ruta no encontrada' });
});

// Sin este manejador, un JSON malformado devolvía la traza de Express.
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[api] Error no controlado:', err);
  res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
});

const server = app.listen(port, () => {
  console.log(`Servidor ejecutándose en http://localhost:${port}`);
});

// Cierre ordenado: sin esto quedaban conexiones abiertas a PostgreSQL en cada
// reinicio del proceso.
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    server.close(() => {
      void prisma.$disconnect().finally(() => process.exit(0));
    });
  });
}

export default app;
