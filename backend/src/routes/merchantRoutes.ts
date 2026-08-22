import { Router } from "express"; // Importamos el Router de Express
import { validateSchema } from "../middleware/validateSchema.js"; // Importamos el validador
import { requireServiceKey, requireRelayerKey } from "../middleware/requireApiKey.js";
import {
  createMerchantOwner,
  createMerchant,
  createTerminal,
  createPayment,
  createDestination,
  getMerchantById,
  getMerchantByPda,
  getMerchantsByOwnerPubkey,
  getPaymentsByMerchant,
} from "../controllers/merchantController.js";

import {
  createMerchantOwnerSchema,
  createMerchantSchema,
  createTerminalSchema,
  createPaymentSchema,
  createDestinationSchema,
} from "../schemas/merchantSchema.js"; // Importamos todos los esquemas ordenados

const router = Router(); // Inicializamos el router

// Rutas POST (Creación y registros). Todas requieren la credencial general de
// servicio: esta API administra comercios, terminales e historial de cobros.
router.post(
  "/",
  requireServiceKey,
  validateSchema(createMerchantOwnerSchema),
  createMerchantOwner,
);
router.post(
  "/store",
  requireServiceKey,
  validateSchema(createMerchantSchema),
  createMerchant,
);
router.post(
  "/terminal",
  requireServiceKey,
  validateSchema(createTerminalSchema),
  createTerminal,
);
// Solo el relayer puede registrar un cobro: escribirlo con la credencial
// general permitiría inventar pagos confirmados que nunca ocurrieron.
router.post(
  "/payment",
  requireRelayerKey,
  validateSchema(createPaymentSchema),
  createPayment,
);
router.post(
  "/destination",
  requireServiceKey,
  validateSchema(createDestinationSchema),
  createDestination,
);

// Rutas GET (Consultas del backend)
router.get("/pda/:pdaAddress", requireServiceKey, getMerchantByPda); // Usada por el conciliador para resolver el comercio de un cobro on-chain
router.get("/owner/:pubkey", requireServiceKey, getMerchantsByOwnerPubkey); // Recupera los comercios de un dueño al iniciar sesión
router.get("/:merchantId", requireServiceKey, getMerchantById);
router.get("/:merchantId/payments", requireServiceKey, getPaymentsByMerchant);

export default router;
