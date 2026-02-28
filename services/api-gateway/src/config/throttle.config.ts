export const THROTTLE_CONFIG = {
  // Límites globales
  global: {
    ttl: 60,
    limit: 100,
  },

  // Límites específicos por ruta
  auth: {
    login: { ttl: 300, limit: 5 },
    register: { ttl: 3600, limit: 3 },
    forgotPassword: { ttl: 600, limit: 3 },
  },

  // Límites por tipo de operación
  upload: {
    ttl: 60,
    limit: 10,
  },

  // Límites para WebSocket
  websocket: {
    messagesPerMinute: 30,
    connectionsPerUser: 5,
  },
};
