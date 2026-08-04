import { Injectable } from '@nestjs/common';
import { BrevoClient } from '@getbrevo/brevo';

@Injectable()
export class MailService {
  private readonly brevo = new BrevoClient({
    apiKey: process.env.BREVO_API_KEY!,
  });

  async sendRecoveryCode(
    email: string,
    codigo: string,
  ): Promise<void> {
    await this.brevo.transactionalEmails.sendTransacEmail({
      sender: {
        name: 'PetCare',
        email: process.env.MAIL_FROM!,
      },
      to: [
        {
          email,
        },
      ],
      subject: 'Recuperación de contraseña - PetCare',
      htmlContent: `
<div style="margin:0;padding:20px;background:#f4f7f6;font-family:Arial,Helvetica,sans-serif;">
  <table align="center" cellpadding="0" cellspacing="0" width="600"
         style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e6e6e6;">

    <tr>
      <td style="background:#4f7f73;padding:24px;text-align:center;">
        <h1 style="margin:0;color:#ffffff;font-size:28px;">
          🐾 PetCare
        </h1>
        <p style="margin-top:8px;color:#dfeee9;font-size:15px;">
          Recuperación de contraseña
        </p>
      </td>
    </tr>

    <tr>
      <td style="padding:35px;color:#333333;font-size:16px;line-height:1.6;">

        <p>Hola,</p>

        <p>
          Recibimos una solicitud para restablecer la contraseña de tu cuenta de
          <strong>PetCare</strong>.
        </p>

        <p>
          Ingresá el siguiente código en la aplicación para continuar:
        </p>

        <div style="margin:35px 0;text-align:center;">
          <span style="
            display:inline-block;
            background:#4f7f73;
            color:#ffffff;
            font-size:34px;
            font-weight:bold;
            letter-spacing:10px;
            padding:18px 35px;
            border-radius:10px;">
            ${codigo}
          </span>
        </div>

        <p>
          ⏱️ Este código es válido durante
          <strong>10 minutos</strong>.
        </p>

        <p>
          Si no solicitaste este cambio, simplemente ignorá este correo.
          Tu contraseña seguirá siendo la misma.
        </p>

        <br>

        <p style="margin-bottom:0;">
          Saludos,<br>
          <strong>Equipo PetCare</strong>
        </p>

      </td>
    </tr>

    <tr>
      <td style="
        background:#f4f7f6;
        color:#777777;
        text-align:center;
        padding:18px;
        font-size:12px;
        border-top:1px solid #e6e6e6;">

        Este es un correo generado automáticamente. Por favor, no respondas este mensaje.

      </td>
    </tr>

  </table>
</div>
`,
    });
  }
}