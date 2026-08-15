import { Router } from 'express'; // Importamos el Router de Express
import { createMerchantOwner } from '../controllers/merchantController.js'; // Importamos nuestra lógica
import { validateSchema } from '../middleware/validateSchema.js'; // Importamos el validador
import { createMerchantOwnerSchema } from '../schemas/merchantSchema.js'; // Importamos el esquema
import { createMerchant } from '../controllers/merchantController.js';
import { createMerchantSchema } from '../schemas/merchantSchema.js';
// Importa createTerminal y createTerminalSchema al inicio del archivo
import { createTerminal } from '../controllers/merchantController.js';
import { createTerminalSchema } from '../schemas/merchantSchema.js';
import { createPayment } from '../controllers/merchantController.js';
import { createPaymentSchema } from '../schemas/merchantSchema.js';
import { createDestination } from '../controllers/merchantController.js';
import { createDestinationSchema } from '../schemas/merchantSchema.js';

const router = Router(); // Inicializamos el router

// Definimos la ruta POST para crear un dueño
// Cuando alguien envíe datos a /api/merchants, llamamos a createMerchantOwner
router.post('/', validateSchema(createMerchantOwnerSchema), createMerchantOwner);

// Nueva ruta para crear comercios
router.post('/store', validateSchema(createMerchantSchema), createMerchant);

// Nueva ruta para registrar una terminal
router.post('/terminal', validateSchema(createTerminalSchema), createTerminal);
// Nueva ruta para registrar un Pago
router.post('/payment', validateSchema(createPaymentSchema), createPayment);

router.post('/destination', validateSchema(createDestinationSchema), createDestination);

export default router; // Exportamos el router para usarlo en index.ts
