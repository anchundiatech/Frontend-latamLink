"use client";

import { AdaptivePOSLayout } from "@/components/pos/adaptive/AdaptivePOSLayout";

// La lógica de pago vive en usePOSController; esta página solo monta el
// punto de entrada que elige la presentación según el dispositivo

export default function POSPage() {
  return <AdaptivePOSLayout />;
}
