-- CreateEnum
CREATE TYPE "RelayerPaymentStatus" AS ENUM ('PENDING', 'CONFIRMED');

-- CreateTable
CREATE TABLE "relayer_payment_log" (
    "id" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "slot" INTEGER,
    "merchant" TEXT NOT NULL,
    "payer" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "reference" TEXT,
    "status" "RelayerPaymentStatus" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "relayer_payment_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "x402_receipt_log" (
    "id" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "payer" TEXT,
    "transaction" TEXT,
    "settled_at" TIMESTAMP(3) NOT NULL,
    "distributed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "x402_receipt_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "relayer_payment_log_signature_idx" ON "relayer_payment_log"("signature");

-- CreateIndex
CREATE INDEX "relayer_payment_log_merchant_idx" ON "relayer_payment_log"("merchant");

-- CreateIndex
CREATE INDEX "relayer_payment_log_reference_idx" ON "relayer_payment_log"("reference");

-- CreateIndex
CREATE INDEX "x402_receipt_log_transaction_idx" ON "x402_receipt_log"("transaction");
