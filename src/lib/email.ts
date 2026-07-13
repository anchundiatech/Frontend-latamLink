import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY!)

export async function sendWaitlistConfirmation(email: string, locale?: string) {
  const isEs = locale === "es"

  const subject = isEs
    ? "¡Estás en la lista de espera de LatamLink Pay!"
    : "You're on the LatamLink Pay waitlist!"

  const previewText = isEs
    ? "Te avisaremos cuando lleguemos a tu ciudad."
    : "We'll notify you when we launch in your city."

  const greeting = isEs ? "Hola" : "Hi"
  const thanks = isEs
    ? "Gracias por registrarte en la lista de espera de LatamLink Pay."
    : "Thanks for joining the LatamLink Pay waitlist."

  const message = isEs
    ? "Te avisaremos en cuanto LatamLink Pay esté disponible en tu ciudad. Estamos trabajando para llevar pagos digitales sin banco a los comercios de Latinoamérica."
    : "We'll let you know as soon as LatamLink Pay is available in your city. We're working hard to bring bankless digital payments to Latin American merchants."

  const ctaText = isEs ? "Seguinos en X" : "Follow us on X"

  const footer = isEs
    ? "LatamLink Pay — Infraestructura de pagos para comercios latinoamericanos"
    : "LatamLink Pay — Payment infrastructure for Latin American merchants"

  const { error } = await resend.emails.send({
    from: "LatamLink Pay <onboarding@latamlinkpay.com>",
    to: email,
    subject,
    html: `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${subject}</title>
  </head>
  <body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding:40px 16px">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden">
            <tr>
              <td style="background:#0a0a0a;padding:32px;text-align:center">
                <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px">
                  LatamLink <span style="color:#2dd4bf">Pay</span>
                </h1>
              </td>
            </tr>
            <tr>
              <td style="padding:32px">
                <p style="margin:0 0 16px;font-size:16px;color:#1a1a1a;font-weight:500">${greeting},</p>
                <p style="margin:0 0 16px;font-size:15px;color:#4a4a4a;line-height:1.6">${thanks}</p>
                <p style="margin:0 0 24px;font-size:15px;color:#4a4a4a;line-height:1.6">${message}</p>
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
                  <tr>
                    <td align="center">
                      <a href="https://x.com/LatamLinkpay" style="display:inline-block;padding:12px 24px;background:#2dd4bf;color:#0a0a0a;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600">${ctaText}</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:0;font-size:12px;color:#888888;border-top:1px solid #e5e5e5;padding-top:16px">${footer}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
  })

  if (error) {
    console.error("Resend error:", error)
  }

  return { error }
}
