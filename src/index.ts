import express from 'express';
import type { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import merchantRoutes from './routes/merchantRoutes.js';

// Cargar variables de entorno
dotenv.config();

// Inicializar el servidor y el cliente de la base de datos
const app = express();
const prisma = new PrismaClient();
const port = process.env.PORT || 3000;

// Middleware para que nuestro servidor entienda JSON
app.use(express.json());
app.use('/api/merchants', merchantRoutes);

// 1. Ruta de monitoreo (Health Check)
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'LatamLink Pay API is running smoothly 🚀' 
  });
});

// 2. Ruta para probar la conexión a PostgreSQL
app.get('/api/test-db', async (req: Request, res: Response) => {
  try {
    // Intentamos leer la tabla de comercios (estará vacía, pero validará la conexión)
    const merchants = await prisma.merchantOwner.findMany();
    res.status(200).json({ 
      status: 'success', 
      data: merchants,
      message: '¡Conexión a la base de datos exitosa!' 
    });
  } catch (error) {
    console.error('Error crítico en la BD:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Fallo al conectar con la base de datos' 
    });
  }
});

// Levantar el servidor
app.listen(port, () => {
  console.log(`🚀 Servidor ejecutándose en http://localhost:${port}`);
  console.log(`⚙️  Modo de entorno: Desarrollo`);
});