/**
 * Re-export shared BD WhatsApp helpers so auth, support, and tests
 * stay on one normalization path (no duplicated rules).
 */
export {
  BD_MOBILE_OPERATOR_PREFIXES,
  WHATSAPP_INVALID_MESSAGE,
  formatWhatsappHint,
  isValidWhatsapp,
  normalizeWhatsapp,
} from '@your-academy/shared';
