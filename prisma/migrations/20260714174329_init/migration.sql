-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'FAILED');

-- CreateTable
CREATE TABLE "MerchantOwner" (
    "id" TEXT NOT NULL,
    "pubkey" TEXT NOT NULL,
    "email" TEXT,
    "name" TEXT,
    "embedded_wallet_pda" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MerchantOwner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Merchant" (
    "id" TEXT NOT NULL,
    "merchantOwnerId" TEXT NOT NULL,
    "merchant_id_onchain" BIGINT NOT NULL,
    "pda_address" TEXT NOT NULL,
    "pda_payment_vault" TEXT NOT NULL,
    "pda_gas_vault" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fee_bps" INTEGER NOT NULL DEFAULT 0,
    "pos_fee_bps" INTEGER NOT NULL DEFAULT 0,
    "min_payment_amount" BIGINT NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "total_volume" BIGINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Merchant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MerchantDestination" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "destination_pubkey" TEXT NOT NULL,
    "percentage" INTEGER NOT NULL,
    "position_index" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MerchantDestination_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PosTerminal" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "pos_terminal_id" VARCHAR(32) NOT NULL,
    "access_token" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PosTerminal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "tx_signature" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "posTerminalId" TEXT NOT NULL,
    "payer_pubkey" TEXT NOT NULL,
    "amount_gross" BIGINT NOT NULL,
    "pos_fee" BIGINT NOT NULL,
    "gas_fee" BIGINT NOT NULL,
    "dust" BIGINT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MerchantOwner_pubkey_key" ON "MerchantOwner"("pubkey");

-- CreateIndex
CREATE UNIQUE INDEX "MerchantOwner_embedded_wallet_pda_key" ON "MerchantOwner"("embedded_wallet_pda");

-- CreateIndex
CREATE UNIQUE INDEX "Merchant_merchant_id_onchain_key" ON "Merchant"("merchant_id_onchain");

-- CreateIndex
CREATE UNIQUE INDEX "Merchant_pda_address_key" ON "Merchant"("pda_address");

-- CreateIndex
CREATE UNIQUE INDEX "MerchantDestination_merchantId_destination_pubkey_key" ON "MerchantDestination"("merchantId", "destination_pubkey");

-- CreateIndex
CREATE UNIQUE INDEX "PosTerminal_access_token_key" ON "PosTerminal"("access_token");

-- CreateIndex
CREATE UNIQUE INDEX "PosTerminal_merchantId_pos_terminal_id_key" ON "PosTerminal"("merchantId", "pos_terminal_id");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_tx_signature_key" ON "Payment"("tx_signature");

-- AddForeignKey
ALTER TABLE "Merchant" ADD CONSTRAINT "Merchant_merchantOwnerId_fkey" FOREIGN KEY ("merchantOwnerId") REFERENCES "MerchantOwner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchantDestination" ADD CONSTRAINT "MerchantDestination_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosTerminal" ADD CONSTRAINT "PosTerminal_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_posTerminalId_fkey" FOREIGN KEY ("posTerminalId") REFERENCES "PosTerminal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
