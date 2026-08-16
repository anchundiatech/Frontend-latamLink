import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const serializeBigInt = (data: any) => {
  return JSON.parse(
    JSON.stringify(data, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    )
  );
};

// Crear dueño: Mantiene estructura manual para asegurar campos
export const createMerchantOwner = async (req: Request, res: Response) => {
  try {
    const { pubkey, email, name, embeddedWalletPda } = req.body;
    const newOwner = await prisma.merchantOwner.create({
      data: { pubkey, email, name, embeddedWalletPda },
    });
    res.status(201).json({ status: 'success', data: newOwner });
  } catch (error) {
    res.status(400).json({ status: 'error', message: 'Error al crear dueño', error });
  }
};

// Crear comercio: Mapeo manual para manejar BigInt y evitar errores de asignación masiva
export const createMerchant = async (req: Request, res: Response) => {
  try {
    const { merchantOwnerId, merchantIdOnchain, pdaAddress, pdaPaymentVault, pdaGasVault, name, feeBps, posFeeBps, minPaymentAmount, isActive, totalVolume } = req.body;
    
    // Usamos $transaction para garantizar que o se guarda todo, o no se guarda nada
    const newMerchant = await prisma.$transaction(async (tx) => {
      return await tx.merchant.create({
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
          totalVolume: BigInt(totalVolume)
        },
      });
    });

    // Respuesta usando el serializador que definimos
    res.status(201).json({ status: 'success', data: serializeBigInt(newMerchant) });
  } catch (error: any) {
    // Si es P2002, enviamos un mensaje claro al usuario
    if (error.code === 'P2002') {
      return res.status(409).json({ status: 'error', message: 'Conflicto: Este comercio o PDA ya existe.' });
    }
    res.status(400).json({ status: 'error', message: 'No se pudo crear el comercio', error: error.message });
  }
};

// Crear terminal
export const createTerminal = async (req: Request, res: Response) => {
  try {
    const newTerminal = await prisma.posTerminal.create({ data: req.body });
    res.status(201).json({ status: 'success', data: newTerminal });
  } catch (error) {
    res.status(400).json({ status: 'error', message: 'No se pudo crear la terminal', error });
  }
};

// Crear pago: Conversión de BigInt necesaria aquí también
export const createPayment = async (req: Request, res: Response) => {
  try {
    const { txSignature, merchantId, posTerminalId, payerPubkey, amountGross, posFee, gasFee, dust, timestamp, status } = req.body;
    
    const newPayment = await prisma.payment.create({
      data: {
        txSignature, 
        merchantId, 
        posTerminalId, 
        payerPubkey, 
        status: status || 'PENDING', // Blindaje con respaldo por defecto
        amountGross: BigInt(amountGross),
        posFee: BigInt(posFee),
        gasFee: BigInt(gasFee),
        dust: BigInt(dust),
        timestamp: new Date(timestamp) // Aseguramos formato fecha
      },
    });

    // Usamos serializeBigInt para evitar el error de serialización JSON de Prisma
    res.status(201).json({ status: 'success', data: serializeBigInt(newPayment) });
  } catch (error: any) {
    res.status(400).json({ 
      status: 'error', 
      message: 'Error en pago', 
      error: error.message || error 
    });
  }
};

// Crear destino
export const createDestination = async (req: Request, res: Response) => {
  try {
    const { merchantId, destinationPubkey, percentage, positionIndex, isActive, description } = req.body;

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
  } catch (error: any) {
    res.status(400).json({ 
      status: 'error', 
      message: 'Error al crear destino', 
      error: error.message || error 
    });
  }
};


// Obtener comercio por ID con sus terminales y destinos
export const getMerchantById = async (req: Request, res: Response) => {
  try {
    const { merchantId } = req.params;

    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      include: {
        terminals: true,
        destinations: true,
      },
    });

    if (!merchant) {
      return res.status(404).json({ status: 'error', message: 'Comercio no encontrado' });
    }

    res.status(200).json({ status: 'success', data: serializeBigInt(merchant) });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: 'Error al consultar comercio', error: error.message || error });
  }
};

// Obtener historial de pagos de un comercio
export const getPaymentsByMerchant = async (req: Request, res: Response) => {
  try {
    const { merchantId } = req.params;

    const payments = await prisma.payment.findMany({
      where: { merchantId },
      orderBy: { timestamp: 'desc' }, // Los más recientes primero
      include: {
        terminal: true, // Incluimos detalles de la terminal que cobró
      },
    });

    res.status(200).json({ status: 'success', count: payments.length, data: serializeBigInt(payments) });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: 'Error al consultar pagos', error: error.message || error });
  }
};


// --- Módulo de Actualización (UPDATE) ---

export const updateMerchant = async (req: Request, res: Response) => {
  const { merchantId } = req.params;
  try {
    const updatedMerchant = await prisma.merchant.update({
      where: { id: merchantId },
      data: req.body,
    });

    // Convertimos cualquier BigInt a Number/String para que Express no falle al serializar
    const serializedMerchant = JSON.parse(
      JSON.stringify(updatedMerchant, (_, v) =>
        typeof v === 'bigint' ? v.toString() : v
      )
    );

    res.status(200).json({ status: 'success', data: serializedMerchant });
  } catch (error: any) {
    res.status(400).json({ 
      status: 'error', 
      message: 'Error al actualizar comercio', 
      errorDetail: error.message || String(error) 
    });
  }
};

// --- Módulo de Soft Delete (Desactivación lógica) ---

export const deactivateTerminal = async (req: Request, res: Response) => {
  const { terminalId } = req.params;
  try {
    const updatedTerminal = await prisma.posTerminal.update({
      where: { id: terminalId },
      data: { isActive: false },
    });
    res.status(200).json({ status: 'success', message: 'Terminal desactivada correctamente', data: updatedTerminal });
  } catch (error) {
    res.status(400).json({ status: 'error', message: 'Error al desactivar terminal', error });
  }
};

export const deactivateDestination = async (req: Request, res: Response) => {
  const { destinationId } = req.params;
  try {
    const updatedDestination = await prisma.merchantDestination.update({
      where: { id: destinationId },
      data: { isActive: false },
    });
    res.status(200).json({ status: 'success', message: 'Destino desactivado correctamente', data: updatedDestination });
  } catch (error) {
    res.status(400).json({ status: 'error', message: 'Error al desactivar destino', error });
  }
};


//actualizar terminal
export const updateTerminal = async (req: Request, res: Response) => {
  const { terminalId } = req.params;
  try {
    const updatedTerminal = await prisma.posTerminal.update({
      where: { id: terminalId },
      data: req.body, // Permite actualizar posTerminalId, etc.
    });
    res.status(200).json({ status: 'success', data: updatedTerminal });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: 'Error al actualizar terminal', errorDetail: error.message });
  }
};