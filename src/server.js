/**
 * Punto de entrada principal de la aplicación
 */
const app = require('./app');
const database = require('./config/database');
const config = require('./config/config');

// Puerto donde se ejecutará el servidor
const PORT = config.PORT;

/**
 * Inicializar la conexión a la base de datos
 */
const inicializarBaseDeDatos = async () => {
  try {
    await database.authenticate();
    console.log('Conexión a la base de datos establecida correctamente');
  } catch (error) {
    console.error('Error al conectar con la base de datos:', error);
    process.exit(1); // Salir con error si no se puede conectar a la BD
  }
};

/**
 * Iniciar el servidor
 */
const iniciarServidor = async () => {
  try {
    // Conectar a la base de datos
    await inicializarBaseDeDatos();

    // Iniciar el servidor HTTP
    app.listen(PORT, () => {
      console.log(`Servidor ejecutándose en el puerto: ${PORT}`);
      console.log(`Ambiente: ${config.NODE_ENV}`);
      console.log(`URL: http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Error al iniciar el servidor:', error);
    process.exit(1);
  }
};

// Iniciar la aplicación
iniciarServidor();