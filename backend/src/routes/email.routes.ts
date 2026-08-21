import { Router, Request, Response } from 'express';
import { authMiddleware, adminMiddleware } from '../middleware/auth.middleware';
import { sendTestEmail, verifySmtpConnection } from '../services/email.service';
import { ResponseUtil } from '../utils/response.util';

const router = Router();

// ─── GET /api/email/verify — vérifier la connexion SMTP sans envoyer d'email ──

router.get('/verify', authMiddleware, adminMiddleware, async (_req: Request, res: Response) => {
  const result = await verifySmtpConnection();

  if (result.ok) {
    ResponseUtil.success(res, { smtp: 'connected' }, 'SMTP connection verified successfully');
  } else {
    // Ne jamais exposer les détails de configuration dans la réponse
    const safeError = result.error?.includes('Invalid login') || result.error?.includes('auth')
      ? 'Authentication failed — check EMAIL_USER and EMAIL_PASSWORD in .env'
      : result.error?.includes('ECONNREFUSED') || result.error?.includes('ETIMEDOUT')
      ? 'Cannot connect to SMTP server — check EMAIL_HOST and EMAIL_PORT'
      : 'SMTP connection failed';

    ResponseUtil.error(res, safeError, undefined, 503);
  }
});

// ─── POST /api/email/test — envoyer un email de test vers EMAIL_USER uniquement

router.post('/test', authMiddleware, adminMiddleware, async (_req: Request, res: Response) => {
  const result = await sendTestEmail();

  if (result.ok) {
    ResponseUtil.success(res, {
      messageId: result.messageId,
      sentTo: process.env.EMAIL_USER, // l'adresse est visible ici car c'est la vôtre
    }, 'Test email sent successfully — check your inbox');
  } else {
    const safeError = result.error?.includes('Invalid login') || result.error?.includes('auth')
      ? 'Authentication failed — check EMAIL_USER and EMAIL_PASSWORD'
      : result.error?.includes('ECONNREFUSED')
      ? 'Cannot connect to smtp.gmail.com:587 — check network/firewall'
      : result.error?.includes('self signed') || result.error?.includes('certificate')
      ? 'TLS certificate issue — may need NODE_TLS_REJECT_UNAUTHORIZED=0 in dev'
      : result.error ?? 'Email send failed';

    ResponseUtil.error(res, safeError, undefined, 503);
  }
});

export default router;
