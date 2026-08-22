import { Request, Response } from 'express';
import { Connection } from '@solana/web3.js';
import { prisma, serializeBigInt } from '../lib/prisma.js';

/**
 * Los errores internos (Prisma, RPC, red) pueden contener rutas, cadenas de
 * conexión y nombres de tabla. Se registran en el servidor y al cliente solo le
 * llega un mensaje de dominio.
 */
const fail = (res: Response, status: number, message: string, error?: unknown) => {
  if (error) console.error(`[merchantController] ${message}:`, error);
  return res.status(status).json({ status: 'error', message });
};

/** Código de error de Prisma (P2002 duplicado, P2003 relación, P2025 no existe). */
const prismaErrorCode = (error: unknown): string | undefined =>
  typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code: unknown }).code)
    : undefined;

// ==========================================
// MÓDULO DE CREACIÓN (CREATE)
// ==========================================

export const createMerchantOwner = async (req: Request, res: Response) => {
  try {
    const { pubkey, email, name, embeddedWalletPda } = req.body;
    const newOwner = await prisma.merchantOwner.create({
      data: { pubkey, email, name, embeddedWalletPda },
    });
    res.status(201).json({ status: 'success', data: newOwner });
  } catch (error) {
    if (prismaErrorCode(error) === 'P2002') {
      return fail(res, 409, 'Ya existe un dueño con esa pubkey o wallet');
    }
    return fail(res, 400, 'No se pudo crear el dueño', error);
  }
};

export const createMerchant = async (req: Request, res: Response) => {
  try {
    const {
      merchantOwnerId,
      merchantIdOnchain,
      pdaAddress,
      pdaPaymentVault,
      pdaGasVault,
      name,
      feeBps,
      posFeeBps,
      minPaymentAmount,
      isActive,
      totalVolume,
    } = req.body;

    const newMerchant = await prisma.merchant.create({
      data: {
        merchantOwnerId,
        merchantIdOnchain: BigInt(merchantIdOnchain),
        pdaAddress,
        pdaPaymentVault,
        pdaGasVault,
        name,
        feeBps,
        posFeeBps,
        minPaymentAmount: BigInt(minPaymentAmount),
        isActive,
        totalVolume: BigInt(totalVolume ?? 0),
      },
    });

    res.status(201).json({ status: 'success', data: serializeBigInt(newMerchant) });
  } catch (error) {
    if (prismaErrorCode(error) === 'P2002') {
      return fail(res, 409, 'Conflicto: este comercio o PDA ya existe');
    }
    if (prismaErrorCode(error) === 'P2003') {
      return fail(res, 404, 'El dueño indicado no existe');
    }
    return fail(res, 400, 'No se pudo crear el comercio', error);
  }
};

export const createTerminal = async (req: Request, res: Response) => {
  try {
    // Campos explícitos: `accessToken` lo genera la base de datos y no puede
    // llegar desde el cliente.
    const { merchantId, posTerminalId, isActive } = req.body;
    const newTerminal = await prisma.posTerminal.create({
      data: { merchantId, posTerminalId, isActive },
    });
    res.status(201).json({ status: 'success', data: newTerminal });
  } catch (error) {
    if (prismaErrorCode(error) === 'P2002') {
      return fail(res, 409, 'Ese comercio ya tiene una terminal con ese identificador');
    }
    if (prismaErrorCode(error) === 'P2003') {
      return fail(res, 404, 'El comercio indicado no existe');
    }
    return fail(res, 400, 'No se pudo crear la terminal', error);
  }
};

/**
 * Comprueba que una firma exista realmente en la red antes de dar un cobro por
 * confirmado. Sin esto, el historial de pagos sería una lista de lo que
 * cualquiera quisiera declarar.
 *
 * Solo se exige para pagos `CONFIRMED`: los `PENDING` los registra el relayer
 * en cuanto envía la transacción, cuando todavía no es consultable.
 */
const signatureExistsOnChain = async (signature: string): Promise<boolean> => {
  const rpcUrl = process.env.RPC_URL;
  if (!rpcUrl) return true; // sin RPC configurado no se puede verificar

  const connection = new Connection(rpcUrl, 'confirmed');
  const [status] = (await connection.getSignatureStatuses([signature])).value;
  if (!status || status.err) return false;
  return status.confirmationStatus === 'confirmed' || status.confirmationStatus === 'finalized';
};

export const createPayment = async (req: Request, res: Response) => {
  try {
    const {
      txSignature,
      merchantId,
      posTerminalId,
      payerPubkey,
      amountGross,
      posFee,
      gasFee,
      dust,
      timestamp,
      status,
    } = req.body;

    if (status === 'CONFIRMED') {
      let exists: boolean;
      try {
        exists = await signatureExistsOnChain(txSignature);
      } catch (error) {
        return fail(res, 503, 'No se pudo verificar la transacción contra la red', error);
      }
      if (!exists) {
        return fail(res, 422, 'La transacción no está confirmada en la red');
      }
    }

    const newPayment = await prisma.payment.create({
      data: {
        txSignature,
        merchantId,
        posTerminalId,
        payerPubkey,
        status: status || 'PENDING',
        amountGross: BigInt(amountGross),
        posFee: BigInt(posFee),
        gasFee: BigInt(gasFee),
        dust: BigInt(dust),
        timestamp: new Date(timestamp),
      },
    });

    res.status(201).json({ status: 'success', data: serializeBigInt(newPayment) });
  } catch (error) {
    if (prismaErrorCode(error) === 'P2002') {
      return fail(res, 409, 'Ese pago ya está registrado');
    }
    if (prismaErrorCode(error) === 'P2003') {
      return fail(res, 404, 'El comercio o la terminal indicados no existen');
    }
    return fail(res, 400, 'No se pudo registrar el pago', error);
  }
};

export const createDestination = async (req: Request, res: Response) => {
  try {
    const { merchantId, destinationPubkey, percentage, positionIndex, isActive, description } =
      req.body;

    const newDestination = await prisma.merchantDestination.create({
      data: {
        merchantId,
        destinationPubkey,
        percentage: Number(percentage),
        positionIndex: Number(positionIndex),
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        description: description || null,
      },
    });

    res.status(201).json({ status: 'success', data: serializeBigInt(newDestination) });
  } catch (error) {
    if (prismaErrorCode(error) === 'P2002') {
      return fail(res, 409, 'Ese destino ya está registrado en el comercio');
    }
    if (prismaErrorCode(error) === 'P2003') {
      return fail(res, 404, 'El comercio indicado no existe');
    }
    return fail(res, 400, 'No se pudo crear el destino', error);
  }
};

// ==========================================
// MÓDULO DE CONSULTA (READ)
// ==========================================

export const getMerchantById = async (req: Request, res: Response) => {
  try {
    const { merchantId } = req.params;

    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      include: {
        terminals: { where: { isActive: true } },
        destinations: { where: { isActive: true }, orderBy: { positionIndex: 'asc' } },
      },
    });

    if (!merchant) {
      return fail(res, 404, 'Comercio no encontrado');
    }

    res.status(200).json({ status: 'success', data: serializeBigInt(merchant) });
  } catch (error) {
    return fail(res, 400, 'Error al consultar el comercio', error);
  }
};

/**
 * Busca los comercios de un dueño por su pubkey.
 *
 * Es lo que permite que la app recupere la configuración del comercio al
 * iniciar sesión desde cualquier dispositivo, en vez de depender de lo que haya
 * quedado guardado en ese navegador.
 */
export const getMerchantsByOwnerPubkey = async (req: Request, res: Response) => {
  try {
    const { pubkey } = req.params;

    const owner = await prisma.merchantOwner.findUnique({
      where: { pubkey },
      include: {
        merchants: {
          include: {
            terminals: { where: { isActive: true } },
            destinations: { where: { isActive: true }, orderBy: { positionIndex: 'asc' } },
          },
        },
      },
    });

    if (!owner) {
      return fail(res, 404, 'No hay ningún comercio registrado para esa wallet');
    }

    res.status(200).json({ status: 'success', data: serializeBigInt(owner) });
  } catch (error) {
    return fail(res, 400, 'Error al consultar los comercios del dueño', error);
  }
};

/**
 * Busca un comercio por su dirección on-chain (PDA).
 *
 * Lo usa el registro de pagos: el relayer solo conoce la dirección de la
 * cadena, y resolver el comercio en el servidor evita que un cliente pueda
 * atribuir un cobro al historial de otro comercio.
 */
export const getMerchantByPda = async (req: Request, res: Response) => {
  try {
    const { pdaAddress } = req.params;

    const merchant = await prisma.merchant.findUnique({
      where: { pdaAddress },
      include: {
        terminals: { where: { isActive: true } },
        destinations: { where: { isActive: true }, orderBy: { positionIndex: 'asc' } },
      },
    });

    if (!merchant) {
      return fail(res, 404, 'No hay ningún comercio registrado con esa dirección');
    }

    res.status(200).json({ status: 'success', data: serializeBigInt(merchant) });
  } catch (error) {
    return fail(res, 400, 'Error al consultar el comercio', error);
  }
};

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

export const getPaymentsByMerchant = async (req: Request, res: Response) => {
  try {
    const { merchantId } = req.params;

    // Sin paginación, un comercio con historial largo devolvía todo de una vez.
    const requestedLimit = Number(req.query.limit);
    const limit =
      Number.isFinite(requestedLimit) && requestedLimit > 0
        ? Math.min(Math.floor(requestedLimit), MAX_PAGE_SIZE)
        : DEFAULT_PAGE_SIZE;
    const requestedOffset = Number(req.query.offset);
    const offset =
      Number.isFinite(requestedOffset) && requestedOffset > 0 ? Math.floor(requestedOffset) : 0;

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where: { merchantId },
        orderBy: { timestamp: 'desc' },
        include: { terminal: true },
        take: limit,
        skip: offset,
      }),
      prisma.payment.count({ where: { merchantId } }),
    ]);

    res.status(200).json({
      status: 'success',
      count: payments.length,
      total,
      limit,
      offset,
      data: serializeBigInt(payments),
    });
  } catch (error) {
    return fail(res, 400, 'Error al consultar los pagos', error);
  }
};

// ==========================================
// MÓDULO DE ACTUALIZACIÓN (UPDATE)
// ==========================================
// `req.body` ya viene validado y saneado por validateSchema: solo contiene los
// campos que un operador puede modificar (nunca las PDAs ni las estadísticas).

export const updateMerchant = async (req: Request, res: Response) => {
  const { merchantId } = req.params;
  try {
    const updatedMerchant = await prisma.merchant.update({
      where: { id: merchantId },
      data: req.body,
    });
    res.status(200).json({ status: 'success', data: serializeBigInt(updatedMerchant) });
  } catch (error) {
    if (prismaErrorCode(error) === 'P2025') return fail(res, 404, 'Comercio no encontrado');
    return fail(res, 400, 'Error al actualizar el comercio', error);
  }
};

export const updateTerminal = async (req: Request, res: Response) => {
  const { terminalId } = req.params;
  try {
    const updatedTerminal = await prisma.posTerminal.update({
      where: { id: terminalId },
      data: req.body,
    });
    res.status(200).json({ status: 'success', data: serializeBigInt(updatedTerminal) });
  } catch (error) {
    if (prismaErrorCode(error) === 'P2025') return fail(res, 404, 'Terminal no encontrada');
    return fail(res, 400, 'Error al actualizar la terminal', error);
  }
};

export const updateDestination = async (req: Request, res: Response) => {
  const { destinationId } = req.params;
  try {
    const updatedDestination = await prisma.merchantDestination.update({
      where: { id: destinationId },
      data: req.body,
    });
    res.status(200).json({ status: 'success', data: serializeBigInt(updatedDestination) });
  } catch (error) {
    if (prismaErrorCode(error) === 'P2025') return fail(res, 404, 'Destino no encontrado');
    return fail(res, 400, 'Error al actualizar el destino', error);
  }
};

// ==========================================
// MÓDULO DE DESACTIVACIÓN LÓGICA (SOFT DELETE)
// ==========================================

export const deactivateTerminal = async (req: Request, res: Response) => {
  const { terminalId } = req.params;
  try {
    const updatedTerminal = await prisma.posTerminal.update({
      where: { id: terminalId },
      data: { isActive: false },
    });
    res.status(200).json({
      status: 'success',
      message: 'Terminal desactivada correctamente',
      data: serializeBigInt(updatedTerminal),
    });
  } catch (error) {
    if (prismaErrorCode(error) === 'P2025') return fail(res, 404, 'Terminal no encontrada');
    return fail(res, 400, 'Error al desactivar la terminal', error);
  }
};

export const deactivateDestination = async (req: Request, res: Response) => {
  const { destinationId } = req.params;
  try {
    const updatedDestination = await prisma.merchantDestination.update({
      where: { id: destinationId },
      data: { isActive: false },
    });
    res.status(200).json({
      status: 'success',
      message: 'Destino desactivado correctamente',
      data: serializeBigInt(updatedDestination),
    });
  } catch (error) {
    if (prismaErrorCode(error) === 'P2025') return fail(res, 404, 'Destino no encontrado');
    return fail(res, 400, 'Error al desactivar el destino', error);
  }
};
