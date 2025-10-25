/**
 * @fileoverview Block Message Definitions
 * Predefined messages for user account blocking reasons.
 * @module utils/blockMessage
 */

/**
 * Block message definitions with codes
 * @type {Object}
 * @property {Object} 210 - Failed login attempts block
 * @property {Object} 220 - Terms of service violation block
 */
export const blockMessage = {
  210: {
    log: "après 5 tentatives de connexion échoués.",
    message: "Compte bloqué en raison de nombreuses tentatives de connexion.",
  },
  220: {
    log: "en raison d'une violation des termes d'utilisation.",
    message:
      "Votre compte est bloqué en raison d'une violation des termes d'utilisation. Veuillez contacter l'administrateur pour plus d'informations.",
  },
};
