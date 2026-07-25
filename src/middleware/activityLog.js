/**
 * Traza legible de la actividad de la app: una linea por request con la accion,
 * metodo, ruta, estado y duracion. Pensada para seguir en vivo lo que hace un
 * usuario mientras navega (demos, grabaciones, diagnostico en produccion).
 *
 * Se omiten las sondas de k8s y los assets: inundan la traza sin aportar.
 * Desactivable con ACTIVITY_LOG=false.
 */

const SKIP = [/^\/api\/pohapp\/readiness$/, /^\/readiness$/, /^\/$/, /^\/favicon\.ico$/];

// Nombre humano por ruta, para leer la traza como acciones y no como endpoints.
const ACCIONES = [
  [/\/query-nlp\/explica/, 'Consulta al asistente IA'],
  [/\/query-nlp\/preview/, 'Busqueda semantica'],
  [/\/chat\/search/, 'Busqueda en historial'],
  [/\/chat/, 'Historial de consultas'],
  // Antes que las reglas de poha: /aporte/poha/atomic tambien contiene "poha".
  [/\/aporte/, 'Aporte de contenido'],
  [/\/poha\/getindex/, 'Listado de remedios'],
  [/\/poha\/get\/\d+/, 'Detalle de remedio'],
  [/\/poha/, 'Remedios'],
  [/\/planta\/get\/\d+/, 'Detalle de planta'],
  [/\/planta/, 'Plantas medicinales'],
  [/\/dolencias/, 'Dolencias'],
  [/\/admin\/embeddings/, 'Regeneracion de embeddings'],
  [/\/admin/, 'Panel de administracion'],
  [/\/usuario/, 'Usuario'],
  [/\/imagenes/, 'Imagen'],
];

function describir(path) {
  // El prefijo /api/pohapp contiene "poha": sin quitarlo, toda ruta caeria en
  // la regla de remedios.
  const ruta = path.replace(/^\/api\/pohapp/, '');
  const match = ACCIONES.find(([re]) => re.test(ruta));
  return match ? match[1] : '-';
}

function activityLog(req, res, next) {
  if (process.env.ACTIVITY_LOG === 'false') return next();
  if (SKIP.some((re) => re.test(req.path))) return next();

  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    const estado = res.statusCode >= 500 ? 'ERROR' : res.statusCode >= 400 ? 'AVISO' : 'OK';
    console.log(
      `[${estado}] ${describir(req.path).padEnd(28)} ${req.method} ${req.path} -> ${res.statusCode} (${ms}ms)`
    );
  });

  next();
}

module.exports = { activityLog };
