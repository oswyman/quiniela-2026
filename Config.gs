/**
 * Constantes globales del sistema Quiniela Mundial 2026.
 * Ajusta valores aqui antes de instalar si necesitas cambiar defaults.
 */

var Q26 = Q26 || {};

Q26.VERSION = '0.1.0-mvp';

Q26.SHEETS = {
  CONFIG: 'CONFIGURACION',
  PARTICIPANTS: 'PARTICIPANTES',
  MATCHES: 'PARTIDOS',
  PREDICTIONS: 'PRONOSTICOS',
  SCORE: 'PUNTUACION',
  RANKING: 'RANKING',
  PRIZES: 'PREMIOS',
  AUDIT: 'AUDITORIA',
  RULES: 'REGLAS'
};

Q26.HEADERS = {};
Q26.HEADERS[Q26.SHEETS.CONFIG] = [
  'Nombre del grupo',
  'Moneda',
  'Aportacion por participante',
  'Responsable del dinero',
  'Email del responsable',
  'Resultado valido',
  'Visibilidad de pronosticos',
  'Fecha de creacion',
  'Estado del grupo'
];
Q26.HEADERS[Q26.SHEETS.PARTICIPANTS] = [
  'ID participante',
  'Nombre',
  'Email',
  'Grupo',
  'Estado de pago',
  'Estado participante',
  'Fecha registro'
];
Q26.HEADERS[Q26.SHEETS.MATCHES] = [
  'ID partido',
  'Fase',
  'Grupo mundialista',
  'Equipo local',
  'Equipo visitante',
  'Fecha',
  'Hora',
  'Zona horaria',
  'Estado partido',
  'Goles local 90',
  'Goles visitante 90',
  'Goles local tiempo extra',
  'Goles visitante tiempo extra',
  'Goles local penales',
  'Goles visitante penales',
  'Resultado valido local',
  'Resultado valido visitante'
];
Q26.HEADERS[Q26.SHEETS.PREDICTIONS] = [
  'ID pronostico',
  'ID participante',
  'Nombre participante',
  'ID partido',
  'Equipo local',
  'Equipo visitante',
  'Pronostico goles local',
  'Pronostico goles visitante',
  'Fecha envio',
  'Hora envio',
  'Estado pronostico',
  'Es tardio',
  'Puntos obtenidos'
];
Q26.HEADERS[Q26.SHEETS.SCORE] = [
  'ID participante',
  'Nombre participante',
  'Grupo',
  'Total puntos',
  'Marcadores exactos',
  'Ganadores acertados',
  'Empates acertados',
  'Diferencias acertadas',
  'Pronosticos validos',
  'Pronosticos tardios'
];
Q26.HEADERS[Q26.SHEETS.RANKING] = [
  'Posicion',
  'ID participante',
  'Nombre participante',
  'Grupo',
  'Total puntos',
  'Criterio desempate 1',
  'Criterio desempate 2',
  'Premio estimado'
];
Q26.HEADERS[Q26.SHEETS.PRIZES] = [
  'Grupo',
  'Moneda',
  'Participantes activos',
  'Aportacion individual',
  'Bolsa total',
  'Premio primer lugar',
  'Premio segundo lugar',
  'Premio tercer lugar',
  'Regla aplicada',
  'Observaciones'
];
Q26.HEADERS[Q26.SHEETS.AUDIT] = [
  'Timestamp',
  'Usuario',
  'Accion',
  'Hoja',
  'Registro afectado',
  'Detalles',
  'Resultado'
];
Q26.HEADERS[Q26.SHEETS.RULES] = ['Reglas'];

Q26.RESULT_MODES = {
  NINETY: '90_MINUTOS',
  EXTRA_TIME: 'TIEMPOS_EXTRA',
  FINAL_WITH_PENALTIES: 'FINAL_CON_PENALES'
};

Q26.VISIBILITY = {
  BEFORE_CLOSE: 'ANTES_DEL_CIERRE',
  AFTER_CLOSE: 'DESPUES_DEL_CIERRE'
};

Q26.MATCH_STATUS = {
  SCHEDULED: 'PROGRAMADO',
  CLOSED: 'CERRADO',
  LIVE: 'EN_VIVO',
  FINISHED: 'FINALIZADO',
  CANCELLED: 'CANCELADO'
};

Q26.PREDICTION_STATUS = {
  VALID: 'VALIDO',
  LATE: 'TARDIO',
  VOID: 'ANULADO'
};

Q26.PAYMENT_STATUS = {
  PENDING: 'PENDIENTE',
  PAID: 'PAGADO',
  NOT_APPLICABLE: 'NO_APLICA'
};

Q26.PARTICIPANT_STATUS = {
  ACTIVE: 'ACTIVO',
  INACTIVE: 'INACTIVO'
};

Q26.GROUP_STATUS = {
  DRAFT: 'BORRADOR',
  ACTIVE: 'ACTIVO',
  CLOSED: 'CERRADO'
};

Q26.DEFAULTS = {
  groupName: 'Grupo Demo',
  currency: 'MXN',
  contribution: 0,
  moneyManager: 'Responsable por definir',
  managerEmail: '',
  resultMode: Q26.RESULT_MODES.NINETY,
  predictionVisibility: Q26.VISIBILITY.AFTER_CLOSE,
  groupStatus: Q26.GROUP_STATUS.DRAFT,
  timezone: 'America/Mexico_City'
};

Q26.SCORING = {
  exactScore: 3,
  goalDifference: 2,
  winnerOrDraw: 1,
  incorrect: 0,
  late: 0
};

Q26.PRIZE_RULES = [
  { min: 2, max: 2, first: 1.0, second: 0.0, third: 0.0, label: '2 participantes: 100% al primer lugar' },
  { min: 3, max: 3, first: 0.7, second: 0.3, third: 0.0, label: '3 participantes: 70% / 30%' },
  { min: 4, max: 9999, first: 0.6, second: 0.3, third: 0.1, label: '4 o mas participantes: 60% / 30% / 10%' }
];

Q26.SENSITIVE_SHEETS = [
  Q26.SHEETS.SCORE,
  Q26.SHEETS.RANKING,
  Q26.SHEETS.PRIZES,
  Q26.SHEETS.AUDIT,
  Q26.SHEETS.RULES
];

Q26.EDITABLE_SHEETS = [
  Q26.SHEETS.CONFIG,
  Q26.SHEETS.PARTICIPANTS,
  Q26.SHEETS.MATCHES,
  Q26.SHEETS.PREDICTIONS
];

Q26.MENU = {
  title: 'Quiniela 2026',
  setup: 'Inicializar plantilla',
  createGroup: 'Crear archivo para grupo',
  validate: 'Validar pronosticos',
  recalc: 'Recalcular todo',
  prizes: 'Calcular premios',
  protect: 'Proteger hojas',
  backup: 'Crear respaldo',
  mockResults: 'Cargar resultados mock'
};

Q26.API = {
  baseUrl: 'https://api.example.com/v1',
  apiKeyPlaceholder: '[API_KEY]',
  timeoutMs: 20000
};
