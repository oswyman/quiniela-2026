/**
 * Preparacion para integracion futura con API de resultados deportivos.
 * No usa scraping y no incluye llaves reales.
 */

function syncResultsFromApi() {
  var startedAt = new Date();
  try {
    var config = {
      baseUrl: Q26.API.baseUrl,
      apiKey: Q26.API.apiKeyPlaceholder
    };

    if (config.apiKey === '[API_KEY]') {
      auditLog('SYNC_API_RESULTADOS', Q26.SHEETS.MATCHES, '', {
        message: 'API no configurada. Usando mock para MVP.'
      }, 'OMITIDO');
      return {
        ok: false,
        skipped: true,
        message: 'Configura una API key real antes de sincronizar resultados externos.'
      };
    }

    var results = fetchResultsFromSportsApi_(config);
    updateMatchesFromApiResults_(results);
    recalculateAll();
    auditLog('SYNC_API_RESULTADOS', Q26.SHEETS.MATCHES, '', {
      count: results.length,
      elapsedMs: new Date().getTime() - startedAt.getTime()
    }, 'OK');
    return { ok: true, updated: results.length };
  } catch (err) {
    auditError('SYNC_API_RESULTADOS', Q26.SHEETS.MATCHES, '', err);
    throw err;
  }
}

function fetchMatchesFromSportsApi_(config) {
  // Implementacion futura:
  // 1. Validar config.apiKey.
  // 2. Llamar endpoint oficial de calendario.
  // 3. Normalizar al formato de la hoja PARTIDOS.
  // 4. Registrar errores con auditError.
  throw new Error('fetchMatchesFromSportsApi_ pendiente de implementar con proveedor elegido.');
}

function fetchResultsFromSportsApi_(config) {
  // Implementacion futura con UrlFetchApp.fetch:
  // var response = UrlFetchApp.fetch(config.baseUrl + '/results', {
  //   method: 'get',
  //   headers: { Authorization: 'Bearer ' + config.apiKey },
  //   muteHttpExceptions: true
  // });
  // Validar codigo HTTP y mapear respuesta.
  throw new Error('fetchResultsFromSportsApi_ pendiente de implementar con proveedor elegido.');
}

function updateMatchesFromApiResults_(results) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(Q26.SHEETS.MATCHES);
  var headers = getHeaders_(sheet);
  var rows = getDataRows_(sheet);
  var matchIdCol = findHeaderColumn_(sheet, 'ID partido');
  if (!matchIdCol) throw new Error('No existe columna ID partido en PARTIDOS.');

  var rowByMatchId = {};
  rows.forEach(function(row, index) {
    var obj = rowToObject_(headers, row);
    rowByMatchId[obj['ID partido']] = index + 2;
  });

  results.forEach(function(result) {
    var rowNumber = rowByMatchId[result.matchId];
    if (!rowNumber) return;
    setCellByHeader_(sheet, rowNumber, 'Estado partido', result.status || Q26.MATCH_STATUS.FINISHED);
    setCellByHeader_(sheet, rowNumber, 'Goles local 90', result.home90);
    setCellByHeader_(sheet, rowNumber, 'Goles visitante 90', result.away90);
    setCellByHeader_(sheet, rowNumber, 'Goles local tiempo extra', result.etHome);
    setCellByHeader_(sheet, rowNumber, 'Goles visitante tiempo extra', result.etAway);
    setCellByHeader_(sheet, rowNumber, 'Goles local penales', result.penHome);
    setCellByHeader_(sheet, rowNumber, 'Goles visitante penales', result.penAway);
    setCellByHeader_(sheet, rowNumber, 'Resultado valido local', result.validHome);
    setCellByHeader_(sheet, rowNumber, 'Resultado valido visitante', result.validAway);
  });

  auditLog('ACTUALIZAR_PARTIDOS_API', Q26.SHEETS.MATCHES, '', { count: results.length }, 'OK');
}

function getMockMatches() {
  return [
    {
      matchId: 'M-001',
      phase: 'Fase de grupos',
      worldCupGroup: 'A',
      homeTeam: 'Mexico',
      awayTeam: 'Canada',
      date: new Date('2026-06-11T00:00:00'),
      time: '19:00',
      timezone: Q26.DEFAULTS.timezone,
      status: Q26.MATCH_STATUS.SCHEDULED
    },
    {
      matchId: 'M-002',
      phase: 'Fase de grupos',
      worldCupGroup: 'B',
      homeTeam: 'Estados Unidos',
      awayTeam: 'Japon',
      date: new Date('2026-06-12T00:00:00'),
      time: '16:00',
      timezone: Q26.DEFAULTS.timezone,
      status: Q26.MATCH_STATUS.SCHEDULED
    }
  ];
}

function loadMockMatches() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(Q26.SHEETS.MATCHES);
  var rows = getMockMatches().map(function(match) {
    return [
      match.matchId,
      match.phase,
      match.worldCupGroup,
      match.homeTeam,
      match.awayTeam,
      match.date,
      match.time,
      match.timezone,
      match.status,
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      ''
    ];
  });
  replaceSheetData_(sheet, Q26.HEADERS[Q26.SHEETS.MATCHES], rows);
  auditLog('CARGAR_PARTIDOS_MOCK', Q26.SHEETS.MATCHES, '', { count: rows.length }, 'OK');
}

function getMockResults() {
  return [
    {
      matchId: 'M-001',
      status: Q26.MATCH_STATUS.FINISHED,
      home90: 2,
      away90: 1,
      etHome: '',
      etAway: '',
      penHome: '',
      penAway: '',
      validHome: 2,
      validAway: 1
    },
    {
      matchId: 'M-002',
      status: Q26.MATCH_STATUS.FINISHED,
      home90: 1,
      away90: 1,
      etHome: 2,
      etAway: 1,
      penHome: '',
      penAway: '',
      validHome: 1,
      validAway: 1
    }
  ];
}

function loadMockResults() {
  updateMatchesFromApiResults_(getMockResults());
  auditLog('CARGAR_RESULTADOS_MOCK', Q26.SHEETS.MATCHES, '', { count: getMockResults().length }, 'OK');
}
