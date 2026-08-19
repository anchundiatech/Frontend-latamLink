-- Los campos `description` e `isActive` estaban declarados en schema.prisma
-- pero ninguna migración los creaba, así que cualquier base levantada desde
-- cero fallaba al registrar un destino ("column is_active does not exist").
ALTER TABLE "MerchantDestination" ADD COLUMN "description" TEXT,
ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;
