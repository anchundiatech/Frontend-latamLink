import { Router } from 'express'; // Importamos el Router de Express
import { validateSchema } from '../middleware/validateSchema.js'; // Importamos el validador
import { 
  createMerchantOwner, 
  createMerchant, 
  createTerminal, 
  createPayment, 
  createDestination,
  getMerchantById,       // <-- Importamos la función de consulta por ID
  getPaymentsByMerchant  // <-- Importamos la función de historial de pagos
} from '../controllers/merchantController.js'; 

import { 
  createMerchantOwnerSchema, 
  createMerchantSchema, 
  createTerminalSchema, 
  createPaymentSchema, 
  createDestinationSchema 
} from '../schemas/merchantSchema.js'; // Importamos todos los esquemas ordenados

const router = Router(); // Inicializamos el router

// Rutas POST (Creación y registros)
router.post('/', validateSchema(createMerchantOwnerSchema), createMerchantOwner);
router.post('/store', validateSchema(createMerchantSchema), createMerchant);
router.post('/terminal', validateSchema(createTerminalSchema), createTerminal);
router.post('/payment', validateSchema(createPaymentSchema), createPayment);
router.post('/destination', validateSchema(createDestinationSchema), createDestination);

// Rutas GET (Consultas del backend)
router.get('/:merchantId', getMerchantById);                  // Consultar información de un comercio y sus terminales
router.get('/:merchantId/payments', getPaymentsByMerchant);   // Consultar el historial de pagos de un comercio

export default router; // Exportamos el router para usarlo en index.ts
