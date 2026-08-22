"use client"

import { useDeviceType } from "@/lib/hooks/useDeviceType"
import { useFullscreen } from "@/lib/hooks/useFullscreen"
import { usePOSController } from "@/lib/services/usePOSController"
import { PaymentStatus } from "@/components/pos/payment/PaymentStatus"
import { PaymentExpired } from "@/components/pos/payment/PaymentExpired"
import { PaymentSuccess } from "@/components/pos/payment/PaymentSuccess"
import { POSMobileLayout } from "./POSMobileLayout"
import { POSTabletLayout } from "./POSTabletLayout"
import { POSDesktopLayout } from "./POSDesktopLayout"
import { POSKioskLayout } from "./POSKioskLayout"

/**
 * Punto de entrada del POS adaptativo. La máquina de estados de pago vive
 * en usePOSController y es única; esto solo decide qué presentación usar
 * según el dispositivo — nunca duplica la lógica.
 *
 * El modo kiosko no es un breakpoint: lo activa el operador entrando en
 * fullscreen a propósito, sin importar el tamaño de pantalla.
 */
export function AdaptivePOSLayout() {
  const controller = usePOSController()
  const deviceType = useDeviceType()
  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen()

  const goBack = () => {
    controller.handleCancel()
  }

  const handleRetry = () => {
    controller.handleCancel()
  }

  return (
    <>
      {isFullscreen ? (
        <POSKioskLayout controller={controller} onExitKiosk={toggleFullscreen} />
      ) : deviceType === "mobile" ? (
        <POSMobileLayout controller={controller} onBack={goBack} />
      ) : deviceType === "tablet-portrait" || deviceType === "tablet-landscape" ? (
        <POSTabletLayout controller={controller} onBack={goBack} />
      ) : (
        <POSDesktopLayout controller={controller} onBack={goBack} onEnterKiosk={toggleFullscreen} />
      )}

      <PaymentStatus status={controller.paymentStatus} onRetry={handleRetry} />
      <PaymentExpired status={controller.paymentStatus} onRetry={handleRetry} />
      {controller.paymentStatus === "confirmed" && (
        <PaymentSuccess onDone={controller.handleSuccessDone} />
      )}
    </>
  )
}
