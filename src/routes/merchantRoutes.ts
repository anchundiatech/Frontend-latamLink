import { Router } from 'express'; // Importamos el Router de Express
import { validateSchema } from '../middleware/validateSchema.js'; // Importamos el validador
import { 
  createMerchantOwner, 
  createMerchant, 
  createTerminal, 
  createPayment, 
  createDestination,
  getMerchantById,         // Consulta de comercio y terminales
  getPaymentsByMerchant,   // Historial de pagos
  updateMerchant,          // Actualizar datos del comercio
  updateTerminal,          // Actualizar datos de la terminal
  updateDestination,       // Actualizar datos del destino
  deactivateTerminal,      // Soft Delete para terminal
  deactivateDestination    // Soft Delete para destino
} from '../controllers/merchantController.js'; 

import { 
  createMerchantOwnerSchema, 
  createMerchantSchema, 
  createTerminalSchema, 
  createPaymentSchema, 
  createDestinationSchema 
} from '../schemas/merchantSchema.js'; // Importamos todos los esquemas ordenados

const router = Router(); // Inicializamos el router

// --- Rutas POST (Creación y registros) ---
router.post('/', validateSchema(createMerchantOwnerSchema), createMerchantOwner);
router.post('/store', validateSchema(createMerchantSchema), createMerchant);
router.post('/terminal', validateSchema(createTerminalSchema), createTerminal);
router.post('/payment', validateSchema(createPaymentSchema), createPayment);
router.post('/destination', validateSchema(createDestinationSchema), createDestination);

// --- Rutas GET (Consultas del backend) ---
router.get('/:merchantId', getMerchantById);                  // Consultar información de un comercio y sus terminales
router.get('/:merchantId/payments', getPaymentsByMerchant);   // Consultar el historial de pagos de un comercio

// --- Rutas PATCH (Actualización y Soft Delete) ---
router.patch('/:merchantId', updateMerchant);                           // UPDATE: Modificar datos generales del comercio
router.patch('/terminal/:terminalId', updateTerminal);                  // UPDATE: Modificar datos de una terminal
router.patch('/destination/:destinationId', updateDestination);         // UPDATE: Modificar datos de una billetera de destino
router.patch('/terminal/:terminalId/deactivate', deactivateTerminal);       // SOFT DELETE: Desactivar terminal POS
router.patch('/destination/:destinationId/deactivate', deactivateDestination); // SOFT DELETE: Desactivar billetera de destino

export default router; // Exportamos el router para usarlo en index.ts