const { createLogger, format, transports } = require('winston'); // 📦 Importamos Winston
const path = require('path'); // 🛣️ Módulo de Node para manejar rutas
const fs = require('fs'); // 📁 Módulo de Node para trabajar con el sistema de archivos

// 🛡️ Asegura que la carpeta "logs" (donde está este archivo) exista
const logsDir = path.join(__dirname);
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// 🛠️ Creamos el logger con configuración personalizada
const logger = createLogger({
  // 🔽 Nivel mínimo a registrar (info, warn, error, etc.)
  level: 'info',

  // 🧱 Formato del log: timestamp + nivel + mensaje + stack (si hay)
  format: format.combine(
    format.timestamp(),
    format.printf(({ timestamp, level, message, stack }) => {
      return `[${timestamp}] ${level.toUpperCase()}: ${message}${stack ? '\nSTACK:\n' + stack : ''}`;
    })
  ),

  // 📤 Destinos (transportes) del log
  transports: [
    // 📄 error.log guarda solo logs de nivel "error"
    new transports.File({ filename: path.join(logsDir, 'error.log'), level: 'warn' }),


    // 📄 combined.log guarda todos los logs desde "info" hacia arriba (info, warn, error)
    new transports.File({ filename: path.join(logsDir, 'combined.log') })
  ]
});

// 🖥️ En desarrollo, también mostramos los logs en la consola
if (process.env.NODE_ENV !== 'production') {
  logger.add(new transports.Console({
    format: format.simple()
  }));
}

// ✅ Ejemplo: log de advertencia
logger.warn('🟡 [DEMO] Usuario intentó registrarse con un correo existente');

// 📦 Exportamos el logger para usarlo en otros archivos
module.exports = logger;
