import nodemailer, { Transporter, SendMailOptions } from 'nodemailer';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ReservationEmailData {
  customerFirstName: string;
  customerLastName: string;
  customerEmail: string;
  date: Date;
  time: string;
  guests: number;
  specialRequest?: string;
  reservationId: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'rejected';
  restaurantName?: string;
  restaurantPhone?: string;
}

// ─── Transporter (lazy singleton) ────────────────────────────────────────────

let _transporter: Transporter | null = null;

async function getTransporter(): Promise<Transporter> {
  if (_transporter) return _transporter;

  const host     = process.env.EMAIL_HOST;
  const port     = parseInt(process.env.EMAIL_PORT ?? '587', 10);
  const user     = process.env.EMAIL_USER;
  // Strip whitespace — App Passwords are sometimes stored with spaces in .env
  const password = (process.env.EMAIL_PASSWORD ?? '').replace(/\s/g, '');

  if (!host || !user || !password) {
    throw new Error('Email configuration incomplete: EMAIL_HOST, EMAIL_USER and EMAIL_PASSWORD are required');
  }

  // Resolve host to IPv4 to bypass DNS issues in some Node.js environments.
  // Uses dns.lookup() which goes through the OS resolver (same as ping/nslookup).
  const dns = await import('dns');
  dns.setDefaultResultOrder('ipv4first');
  let resolvedHost = host;
  await new Promise<void>((resolve) => {
    dns.lookup(host, { family: 4 }, (err, address) => {
      if (!err && address) {
        resolvedHost = address;
        console.log(`📧 SMTP host resolved: ${host} → ${resolvedHost}`);
      } else {
        console.warn(`⚠️  dns.lookup(${host}) failed: ${err?.message ?? 'no result'} — using hostname`);
      }
      resolve();
    });
  });

  _transporter = nodemailer.createTransport({
    host: resolvedHost,
    port,
    secure: port === 465,          // true for port 465, false for 587 (STARTTLS)
    auth: { user, pass: password },
    connectionTimeout: 15000,      // 15s max to establish TCP connection
    greetingTimeout: 15000,        // 15s max to receive SMTP greeting
    socketTimeout: 15000,          // 15s max idle time
    // TLS: disable strict cert checking (cert CN is smtp.gmail.com, not the resolved IP)
    tls: { rejectUnauthorized: false },
  } as any);

  return _transporter;
}

// ─── SMTP verification ────────────────────────────────────────────────────────

/**
 * Verifies the SMTP connection without sending an email.
 * Returns { ok: true } on success, { ok: false, error: string } on failure.
 */
export async function verifySmtpConnection(): Promise<{ ok: boolean; error?: string }> {
  try {
    // Reset singleton so fresh DNS resolution and options take effect on each verify call
    _transporter = null;
    const transporter = await getTransporter();
    await transporter.verify();
    console.log('✅ SMTP verify: OK');
    return { ok: true };
  } catch (err: any) {
    // Log safe diagnostic (no credentials in output)
    console.error('❌ SMTP verify failed:', err?.code ?? '', '|', err?.responseCode ?? '', '|', err?.message?.replace(process.env.EMAIL_PASSWORD ?? '', '[PASS]').replace(process.env.EMAIL_USER ?? '', '[EMAIL]') ?? 'unknown error');
    return { ok: false, error: err?.message ?? 'SMTP verification failed' };
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function getSenderAddress(): string {
  return process.env.EMAIL_FROM ?? `BIZZ'ART <${process.env.EMAIL_USER}>`;
}

// ─── Templates ────────────────────────────────────────────────────────────────

function reservationConfirmationHtml(data: ReservationEmailData): string {
  const restaurant = data.restaurantName ?? "BIZZ'ART Monastir";
  const phone      = data.restaurantPhone ? `<p>📞 Téléphone : <strong>${data.restaurantPhone}</strong></p>` : '';
  const note       = data.specialRequest
    ? `<p style="color:#555;"><em>Votre demande : ${data.specialRequest}</em></p>`
    : '';

  const isPending   = data.status === 'pending';
  const statusMsg   = isPending
    ? `<p style="color:#b08060;">Votre réservation est <strong>en attente de confirmation</strong>. Nous vous contacterons très prochainement.</p>`
    : `<p style="color:#2e7d32;">Votre réservation est <strong>confirmée</strong>. Nous avons hâte de vous accueillir !</p>`;

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Réservation ${restaurant}</title>
</head>
<body style="margin:0;padding:0;background:#f5f0eb;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0eb;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:#1a1a1a;padding:32px;text-align:center;">
            <h1 style="color:#c8a97a;font-size:28px;margin:0;letter-spacing:3px;font-weight:400;">${restaurant}</h1>
            <p style="color:#888;font-size:12px;margin:8px 0 0;letter-spacing:2px;text-transform:uppercase;">Monastir</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:40px 48px;">
            <h2 style="color:#1a1a1a;font-size:20px;font-weight:400;margin:0 0 8px;">
              Bonjour ${data.customerFirstName},
            </h2>
            <p style="color:#444;line-height:1.6;margin:0 0 24px;">
              Nous avons bien reçu votre demande de réservation.
            </p>
            ${statusMsg}

            <!-- Recap -->
            <table width="100%" cellpadding="0" cellspacing="0"
              style="background:#f9f5f0;border-radius:6px;margin:24px 0;padding:24px;border-left:3px solid #c8a97a;">
              <tr><td>
                <p style="margin:0 0 10px;color:#333;"><strong>📅 Date :</strong> ${formatDate(data.date)}</p>
                <p style="margin:0 0 10px;color:#333;"><strong>🕐 Heure :</strong> ${data.time}</p>
                <p style="margin:0 0 10px;color:#333;"><strong>👥 Personnes :</strong> ${data.guests}</p>
                <p style="margin:0;color:#999;font-size:12px;">Réf : ${data.reservationId}</p>
              </td></tr>
            </table>

            ${note}
            ${phone}

            <p style="color:#555;line-height:1.6;">
              Pour toute question ou modification, n'hésitez pas à nous contacter directement.
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f9f5f0;padding:24px 48px;text-align:center;border-top:1px solid #e8e0d5;">
            <p style="color:#999;font-size:12px;margin:0;">
              ${restaurant} — Monastir, Tunisie
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function statusUpdateHtml(data: ReservationEmailData): string {
  const restaurant = data.restaurantName ?? "BIZZ'ART Monastir";
  const statusLabels: Record<string, string> = {
    confirmed:  '✅ Réservation confirmée',
    cancelled:  '❌ Réservation annulée',
    rejected:   '❌ Réservation refusée',
    completed:  '✔️ Visite terminée — Merci !',
    pending:    '⏳ En attente de confirmation',
  };
  const label = statusLabels[data.status] ?? data.status;

  return `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><title>Mise à jour réservation ${restaurant}</title></head>
<body style="margin:0;padding:0;background:#f5f0eb;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0eb;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#1a1a1a;padding:32px;text-align:center;">
            <h1 style="color:#c8a97a;font-size:28px;margin:0;letter-spacing:3px;font-weight:400;">${restaurant}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:40px 48px;">
            <h2 style="color:#1a1a1a;font-size:20px;font-weight:400;margin:0 0 16px;">${label}</h2>
            <p style="color:#444;line-height:1.6;">
              Bonjour ${data.customerFirstName},<br/>
              Votre réservation du <strong>${formatDate(data.date)}</strong> à <strong>${data.time}</strong>
              pour <strong>${data.guests} personne(s)</strong> a été mise à jour.
            </p>
            <p style="color:#999;font-size:12px;">Réf : ${data.reservationId}</p>
          </td>
        </tr>
        <tr>
          <td style="background:#f9f5f0;padding:24px 48px;text-align:center;border-top:1px solid #e8e0d5;">
            <p style="color:#999;font-size:12px;margin:0;">${restaurant} — Monastir, Tunisie</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Sends a confirmation email to the customer after a new reservation.
 * Fire-and-forget: errors are logged but do NOT fail the HTTP response.
 */
export async function sendReservationConfirmation(data: ReservationEmailData): Promise<void> {
  try {
    const transporter = await getTransporter();
    const subject = data.status === 'confirmed'
      ? `✅ Réservation confirmée — ${data.restaurantName ?? "BIZZ'ART"}`
      : `📅 Demande reçue — ${data.restaurantName ?? "BIZZ'ART"} Monastir`;

    const mailOptions: SendMailOptions = {
      from:    getSenderAddress(),
      to:      data.customerEmail,
      subject,
      html:    reservationConfirmationHtml(data),
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 Reservation confirmation sent to ${data.customerEmail} — messageId: ${info.messageId}`);
  } catch (error: any) {
    // Log error but never throw — email failure must not break the reservation
    console.error('⚠️  Email send failed (non-blocking):', error?.message ?? error);
  }
}

/**
 * Sends a status update email when admin changes a reservation status.
 * Fire-and-forget.
 */
export async function sendReservationStatusUpdate(data: ReservationEmailData): Promise<void> {
  // Only send for meaningful status changes
  const notifiableStatuses = ['confirmed', 'cancelled', 'rejected'];
  if (!notifiableStatuses.includes(data.status)) return;

  try {
    const transporter = await getTransporter();
    const subject = data.status === 'confirmed'
      ? `✅ Réservation confirmée — ${data.restaurantName ?? "BIZZ'ART"}`
      : `Mise à jour de votre réservation — ${data.restaurantName ?? "BIZZ'ART"}`;

    const mailOptions: SendMailOptions = {
      from:    getSenderAddress(),
      to:      data.customerEmail,
      subject,
      html:    statusUpdateHtml(data),
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 Status update (${data.status}) sent to ${data.customerEmail} — messageId: ${info.messageId}`);
  } catch (error: any) {
    console.error('⚠️  Status update email failed (non-blocking):', error?.message ?? error);
  }
}

/**
 * Sends a test email to EMAIL_USER (the configured sender address).
 * Used only for SMTP connection testing — never sends to external addresses.
 */
export async function sendTestEmail(): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  const testRecipient = process.env.EMAIL_USER;
  if (!testRecipient) {
    return { ok: false, error: 'EMAIL_USER not configured' };
  }

  try {
    const transporter = await getTransporter();

    // Verify connection first
    await transporter.verify();

    const info = await transporter.sendMail({
      from:    getSenderAddress(),
      to:      testRecipient,   // always sends to EMAIL_USER, never to external addresses
      subject: `Test SMTP — BIZZ'ART (${new Date().toLocaleTimeString('fr-FR')})`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:400px;padding:20px;background:#f9f5f0;border-radius:8px;">
          <h2 style="color:#c8a97a;">BIZZ'ART — Test SMTP</h2>
          <p style="color:#333;">La configuration email fonctionne correctement.</p>
          <p style="color:#999;font-size:12px;">Envoyé le ${new Date().toLocaleString('fr-FR')}</p>
        </div>`,
      text: `BIZZ'ART — Test SMTP\n\nLa configuration email fonctionne correctement.\nEnvoyé le ${new Date().toLocaleString('fr-FR')}`,
    });

    return { ok: true, messageId: info.messageId };
  } catch (error: any) {
    return { ok: false, error: error?.message ?? 'Unknown error' };
  }
}
