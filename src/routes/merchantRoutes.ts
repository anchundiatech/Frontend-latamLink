import { Router } from 'express';
import { validateSchema } from '../middleware/validateSchema.js';
import { requireRelayerKey, requireServiceKey } from '../middleware/requireApiKey.js';
import {
  createMerchantOwner,
  createMerchant,
  createTerminal,
  createPayment,
  createDestination,
  getMerchantById,
  getPaymentsByMerchant,
  updateMerchant,
  updateTerminal,
  updateDestination,
  deactivateTerminal,
  deactivateDestination,
} from '../controllers/merchantController.js';

import {
  createMerchantOwnerSchema,
  createMerchantSchema,
  createTerminalSchema,
  createPaymentSchema,
  createDestinationSchema,
  updateMerchantSchema,
  updateTerminalSchema,
  updateDestinationSchema,
} from '../schemas/merchantSchema.js';

const router = Router();

// Toda la API administra datos de comercios y su historial de cobros, así que
// va detrás de credencial de servicio. El frontend la consume desde el lado
// servidor; nunca se expone la clave al navegador.
router.use(requireServiceKey);

// --- Rutas POST (Creación y registros) ---
router.post('/', validateSchema(createMerchantOwnerSchema), createMerchantOwner);
router.post('/store', validateSchema(createMerchantSchema), createMerchant);
router.post('/terminal', validateSchema(createTerminalSchema), createTerminal);
// El historial de pagos solo lo escribe el relayer, que es quien firma y envía
// las transacciones: así no se pueden inventar cobros.
router.post('/payment', requireRelayerKey, validateSchema(createPaymentSchema), createPayment);
router.post('/destination', validateSchema(createDestinationSchema), createDestination);

// --- Rutas GET (Consultas) ---
router.get('/:merchantId', getMerchantById);
router.get('/:merchantId/payments', getPaymentsByMerchant);

// --- Rutas PATCH (Actualización y Soft Delete) ---
router.patch('/:merchantId', validateSchema(updateMerchantSchema), updateMerchant);
router.patch('/terminal/:terminalId', validateSchema(updateTerminalSchema), updateTerminal);
router.patch(
  '/destination/:destinationId',
  validateSchema(updateDestinationSchema),
  updateDestination
);
router.patch('/terminal/:terminalId/deactivate', deactivateTerminal);
router.patch('/destination/:destinationId/deactivate', deactivateDestination);

export default router;
