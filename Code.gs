/**
 * Funciones principales del MVP Quiniela Mundial 2026.
 */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu(Q26.MENU.title)
    .addItem(Q26.MENU.setup, 'setupQuinielaMaster')
    .addSeparator()
    .addItem(Q26.MENU.createGroup, 'createGroupFileFromActiveConfig')
    .addItem(Q26.MENU.validate, 'validatePredictions')
    .addItem(Q26.MENU.recalc, 'recalculateAll')
    .addItem(Q26.MENU.prizes, 'calculatePrizes')
    .addSeparator()
    .addItem(Q26.MENU.protect, 'protectSheets')
    .addItem(Q26.MENU.backup, 'createManualBackup')
    .addSeparator()
    .addItem(Q26.MENU.mockResults, 'loadMockResultsAndRecalculate')
    .addToUi();
}

function setupQuinielaMaster() {
  try {
    createWorkbookStructure();
    initializeDefaultConfiguration();
    protectSheets();
    auditLog('SETUP_COMPLETO', 'TODAS', '', { version: Q26.VERSION }, 'OK');
    SpreadsheetApp.getUi().alert('Plantilla inicializada correctamente.');
  } catch (err) {
    auditError('SETUP_COMPLETO', 'TODAS', '', err);
    throw err;
  }
}

function createGroupFileFromActiveConfig() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var config = getPrimaryGroupConfig_();
  var fileName = 'Quiniela 2026 - ' + sanitizeFileName_(config.groupName);

  try {
    var newFile = DriveApp.getFileById(ss.getId()).makeCopy(fileName);
    var newSpreadsheet = SpreadsheetApp.openById(newFile.getId());
    createWorkbookStructure(newSpreadsheet);
    writeSingleGroupConfig_(newSpreadsheet, config);
    removeRowsForOtherGroups_(newSpreadsheet, config.groupName);
    protectSheets(newSpreadsheet);
    auditLog('CREAR_ARCHIVO_GRUPO', Q26.SHEETS.CONFIG, config.groupName, {
      sourceSpreadsheetId: ss.getId(),
      newSpreadsheetId: newSpreadsheet.getId()
    }, 'OK');
    SpreadsheetApp.getUi().alert('Archivo creado: ' + newSpreadsheet.getUrl());
    return newSpreadsheet.getUrl();
  } catch (err) {
    auditError('CREAR_ARCHIVO_GRUPO', Q26.SHEETS.CONFIG, config.groupName, err);
    throw err;
  }
}

function registerParticipant(name, email, groupName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(Q26.SHEETS.PARTICIPANTS);
  var participantId = 'P-' + Utilities.getUuid().slice(0, 8).toUpperCase();
  var group = groupName || getPrimaryGroupConfig_().groupName;

  sheet.appendRow([
    participantId,
    name,
    email,
    group,
    Q26.PAYMENT_STATUS.PENDING,
    Q26.PARTICIPANT_STATUS.ACTIVE,
    new Date()
  ]);
  auditLog('REGISTRAR_PARTICIPANTE', Q26.SHEETS.PARTICIPANTS, participantId, { name: name, email: email, group: group }, 'OK');
  return participantId;
}

function submitPrediction(participantId, matchId, homeGoals, awayGoals) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var participant = findParticipantById_(participantId);
  var match = findMatchById_(matchId);
  if (!participant) throw new Error('Participante no encontrado: ' + participantId);
  if (!match) throw new Error('Partido no encontrado: ' + matchId);

  var now = new Date();
  var predictionId = 'PR-' + Utilities.getUuid().slice(0, 10).toUpperCase();
  var isLate = isPredictionLate(now, match.date, match.time, match.timezone);
  var predictionStatus = isLate ? Q26.PREDICTION_STATUS.LATE : Q26.PREDICTION_STATUS.VALID;
  var lateText = isLate ? 'SI' : 'NO';
  var sheet = ss.getSheetByName(Q26.SHEETS.PREDICTIONS);
  sheet.appendRow([
    predictionId,
    participantId,
    participant.name,
    matchId,
    match.homeTeam,
    match.awayTeam,
    homeGoals,
    awayGoals,
    now,
    Utilities.formatDate(now, Session.getScriptTimeZone(), 'HH:mm:ss'),
    predictionStatus,
    lateText,
    0
  ]);
  auditLog('ENVIAR_PRONOSTICO', Q26.SHEETS.PREDICTIONS, predictionId, { participantId: participantId, matchId: matchId }, 'OK');
  return predictionId;
}

function validatePredictions() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var predictionsSheet = ss.getSheetByName(Q26.SHEETS.PREDICTIONS);
  var values = getDataRows_(predictionsSheet);
  var headers = getHeaders_(predictionsSheet);
  var matchesById = indexMatchesById_();

  values.forEach(function(row, index) {
    var record = rowToObject_(headers, row);
    var match = matchesById[record['ID partido']];
    if (!match) return;
    var sentAt = combineDateAndTime_(record['Fecha envio'], record['Hora envio']);
    var late = isPredictionLate(sentAt, match.date, match.time, match.timezone);
    var rowNumber = index + 2;
    setCellByHeader_(predictionsSheet, rowNumber, 'Estado pronostico', late ? Q26.PREDICTION_STATUS.LATE : Q26.PREDICTION_STATUS.VALID);
    setCellByHeader_(predictionsSheet, rowNumber, 'Es tardio', late ? 'SI' : 'NO');
  });

  auditLog('VALIDAR_PRONOSTICOS', Q26.SHEETS.PREDICTIONS, '', { rows: values.length }, 'OK');
}

function recalculateAll() {
  validatePredictions();
  calculatePredictionPoints_();
  updateScoreTable_();
  updateRanking();
  calculatePrizes();
  auditLog('RECALCULAR_TODO', 'TODAS', '', {}, 'OK');
}

function calculatePredictionPoints_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var predictionsSheet = ss.getSheetByName(Q26.SHEETS.PREDICTIONS);
  var rows = getDataRows_(predictionsSheet);
  var headers = getHeaders_(predictionsSheet);
  var matches = indexMatchesById_();
  var config = getPrimaryGroupConfig_();

  rows.forEach(function(row, index) {
    var record = rowToObject_(headers, row);
    var match = matches[record['ID partido']];
    if (!match) return;
    var result = resolveMatchResult(match, config.resultMode);
    var scoringResult = calculatePredictionScore({
      homeGoals: record['Pronostico goles local'],
      awayGoals: record['Pronostico goles visitante'],
      isLate: record['Es tardio'] === 'SI' || record['Estado pronostico'] === Q26.PREDICTION_STATUS.LATE
    }, result, { scoring: Q26.SCORING });
    setCellByHeader_(predictionsSheet, index + 2, 'Puntos obtenidos', scoringResult.points);
  });
}

function updateScoreTable_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var participants = getParticipants_().filter(function(p) {
    return p.status === Q26.PARTICIPANT_STATUS.ACTIVE;
  });
  var predictions = getPredictions_();
  var matches = indexMatchesById_();
  var config = getPrimaryGroupConfig_();
  var rows = [];

  participants.forEach(function(participant) {
    var stats = {
      points: 0,
      exact: 0,
      winner: 0,
      draw: 0,
      difference: 0,
      valid: 0,
      late: 0
    };

    predictions.filter(function(prediction) {
      return prediction.participantId === participant.id;
    }).forEach(function(prediction) {
      var match = matches[prediction.matchId];
      if (!match) return;
      var isLate = prediction.isLate === 'SI' || prediction.status === Q26.PREDICTION_STATUS.LATE;
      var result = resolveMatchResult(match, config.resultMode);
      var scoringResult = calculatePredictionScore({
        homeGoals: prediction.homeGoals,
        awayGoals: prediction.awayGoals,
        isLate: isLate
      }, result, { scoring: Q26.SCORING });
      stats.points += scoringResult.points;
      stats.exact += scoringResult.exact;
      stats.winner += scoringResult.winner;
      stats.draw += scoringResult.draw;
      stats.difference += scoringResult.difference;
      stats.valid += isLate ? 0 : 1;
      stats.late += isLate ? 1 : 0;
    });

    rows.push([
      participant.id,
      participant.name,
      participant.group,
      stats.points,
      stats.exact,
      stats.winner,
      stats.draw,
      stats.difference,
      stats.valid,
      stats.late
    ]);
  });

  replaceSheetData_(ss.getSheetByName(Q26.SHEETS.SCORE), Q26.HEADERS[Q26.SHEETS.SCORE], rows);
}

function updateRanking() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var scoreSheet = ss.getSheetByName(Q26.SHEETS.SCORE);
  var scores = getDataRows_(scoreSheet).map(function(row) {
    var obj = rowToObject_(getHeaders_(scoreSheet), row);
    return {
      id: obj['ID participante'],
      name: obj['Nombre participante'],
      group: obj['Grupo'],
      points: Number(obj['Total puntos'] || 0),
      exact: Number(obj['Marcadores exactos'] || 0),
      valid: Number(obj['Pronosticos validos'] || 0)
    };
  });

  scores.sort(function(a, b) {
    return b.points - a.points || b.exact - a.exact || b.valid - a.valid || String(a.name).localeCompare(String(b.name));
  });

  var rows = [];
  var previous = null;
  var position = 0;
  scores.forEach(function(score, index) {
    var tiedWithPrevious = previous &&
      score.points === previous.points &&
      score.exact === previous.exact &&
      score.valid === previous.valid;
    position = tiedWithPrevious ? position : index + 1;
    rows.push([
      position,
      score.id,
      score.name,
      score.group,
      score.points,
      score.exact,
      score.valid,
      ''
    ]);
    previous = score;
  });

  replaceSheetData_(ss.getSheetByName(Q26.SHEETS.RANKING), Q26.HEADERS[Q26.SHEETS.RANKING], rows);
  auditLog('ACTUALIZAR_RANKING', Q26.SHEETS.RANKING, '', { rows: rows.length }, 'OK');
}

function calculatePrizes() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var config = getPrimaryGroupConfig_();
  var participants = getParticipants_().filter(function(p) {
    return p.group === config.groupName && p.status === Q26.PARTICIPANT_STATUS.ACTIVE;
  });
  var participantCount = participants.length;
  var contribution = Number(config.contribution || 0);
  var totalPool = participantCount * contribution;
  var rule = getPrizeRule_(participantCount);
  var basePrizes = [
    totalPool * rule.first,
    totalPool * rule.second,
    totalPool * rule.third
  ];
  var rankingRows = getRankingRowsForGroup_(config.groupName);
  var estimatedByParticipant = allocatePrizesWithTies_(rankingRows, basePrizes);

  writePrizeEstimatesToRanking_(estimatedByParticipant);

  var prizeRows = [[
    config.groupName,
    config.currency,
    participantCount,
    contribution,
    totalPool,
    basePrizes[0],
    basePrizes[1],
    basePrizes[2],
    rule.label,
    estimatedByParticipant.tieNotes.join(' | ') || 'Sin empates en zona de premio'
  ]];
  replaceSheetData_(ss.getSheetByName(Q26.SHEETS.PRIZES), Q26.HEADERS[Q26.SHEETS.PRIZES], prizeRows);
  auditLog('CALCULAR_PREMIOS', Q26.SHEETS.PRIZES, config.groupName, { participantCount: participantCount, totalPool: totalPool }, 'OK');
}

function createManualBackup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd-HHmmss');
  var backupName = ss.getName() + ' - BACKUP ' + timestamp;
  var backup = DriveApp.getFileById(ss.getId()).makeCopy(backupName);
  auditLog('CREAR_RESPALDO', 'ARCHIVO', backup.getId(), { name: backupName, url: backup.getUrl() }, 'OK');
  SpreadsheetApp.getUi().alert('Respaldo creado: ' + backup.getUrl());
  return backup.getUrl();
}

function loadMockResultsAndRecalculate() {
  loadMockResults();
  recalculateAll();
}

function getPrimaryGroupConfig_() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(Q26.SHEETS.CONFIG);
  var headers = getHeaders_(sheet);
  var rows = getDataRows_(sheet);
  if (!rows.length) {
    return {
      groupName: Q26.DEFAULTS.groupName,
      currency: Q26.DEFAULTS.currency,
      contribution: Q26.DEFAULTS.contribution,
      moneyManager: Q26.DEFAULTS.moneyManager,
      managerEmail: Q26.DEFAULTS.managerEmail,
      resultMode: Q26.DEFAULTS.resultMode,
      predictionVisibility: Q26.DEFAULTS.predictionVisibility,
      groupStatus: Q26.DEFAULTS.groupStatus
    };
  }
  var row = rowToObject_(headers, rows[0]);
  return {
    groupName: row['Nombre del grupo'] || Q26.DEFAULTS.groupName,
    currency: row['Moneda'] || Q26.DEFAULTS.currency,
    contribution: Number(row['Aportacion por participante'] || 0),
    moneyManager: row['Responsable del dinero'] || '',
    managerEmail: row['Email del responsable'] || '',
    resultMode: row['Resultado valido'] || Q26.DEFAULTS.resultMode,
    predictionVisibility: row['Visibilidad de pronosticos'] || Q26.DEFAULTS.predictionVisibility,
    groupStatus: row['Estado del grupo'] || Q26.DEFAULTS.groupStatus
  };
}

function getParticipants_() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(Q26.SHEETS.PARTICIPANTS);
  var headers = getHeaders_(sheet);
  return getDataRows_(sheet).map(function(row) {
    var obj = rowToObject_(headers, row);
    return {
      id: obj['ID participante'],
      name: obj['Nombre'],
      email: obj['Email'],
      group: obj['Grupo'],
      paymentStatus: obj['Estado de pago'],
      status: obj['Estado participante']
    };
  }).filter(function(p) { return p.id; });
}

function getPredictions_() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(Q26.SHEETS.PREDICTIONS);
  var headers = getHeaders_(sheet);
  return getDataRows_(sheet).map(function(row) {
    var obj = rowToObject_(headers, row);
    return {
      id: obj['ID pronostico'],
      participantId: obj['ID participante'],
      matchId: obj['ID partido'],
      homeGoals: obj['Pronostico goles local'],
      awayGoals: obj['Pronostico goles visitante'],
      status: obj['Estado pronostico'],
      isLate: obj['Es tardio']
    };
  }).filter(function(p) { return p.id; });
}

function findParticipantById_(participantId) {
  return getParticipants_().filter(function(p) { return p.id === participantId; })[0] || null;
}

function findMatchById_(matchId) {
  return indexMatchesById_()[matchId] || null;
}

function indexMatchesById_() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(Q26.SHEETS.MATCHES);
  var headers = getHeaders_(sheet);
  var index = {};
  getDataRows_(sheet).forEach(function(row) {
    var obj = rowToObject_(headers, row);
    if (!obj['ID partido']) return;
    index[obj['ID partido']] = {
      id: obj['ID partido'],
      phase: obj['Fase'],
      homeTeam: obj['Equipo local'],
      awayTeam: obj['Equipo visitante'],
      date: obj['Fecha'],
      time: obj['Hora'],
      timezone: obj['Zona horaria'] || Q26.DEFAULTS.timezone,
      status: obj['Estado partido'],
      home90: obj['Goles local 90'],
      away90: obj['Goles visitante 90'],
      etHome: obj['Goles local tiempo extra'],
      etAway: obj['Goles visitante tiempo extra'],
      penHome: obj['Goles local penales'],
      penAway: obj['Goles visitante penales'],
      validHome: obj['Resultado valido local'],
      validAway: obj['Resultado valido visitante']
    };
  });
  return index;
}

function getPrizeRule_(participantCount) {
  for (var i = 0; i < Q26.PRIZE_RULES.length; i++) {
    var rule = Q26.PRIZE_RULES[i];
    if (participantCount >= rule.min && participantCount <= rule.max) {
      return rule;
    }
  }
  return Q26.PRIZE_RULES[Q26.PRIZE_RULES.length - 1];
}

function getRankingRowsForGroup_(groupName) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(Q26.SHEETS.RANKING);
  var headers = getHeaders_(sheet);
  return getDataRows_(sheet).map(function(row, index) {
    var obj = rowToObject_(headers, row);
    return {
      rowNumber: index + 2,
      position: Number(obj['Posicion']),
      participantId: obj['ID participante'],
      participantName: obj['Nombre participante'],
      group: obj['Grupo']
    };
  }).filter(function(row) {
    return row.group === groupName;
  });
}

function allocatePrizesWithTies_(rankingRows, basePrizes) {
  var prizesByPosition = {
    1: basePrizes[0] || 0,
    2: basePrizes[1] || 0,
    3: basePrizes[2] || 0
  };
  var byParticipant = {};
  var tieNotes = [];
  var positions = [1, 2, 3];

  positions.forEach(function(position) {
    var tiedRows = rankingRows.filter(function(row) { return row.position === position; });
    if (!tiedRows.length) return;

    var prizePositions = [];
    for (var i = 0; i < tiedRows.length; i++) {
      var prizePosition = position + i;
      if (prizePosition <= 3) prizePositions.push(prizePosition);
    }
    var totalPrize = prizePositions.reduce(function(sum, pos) {
      return sum + (prizesByPosition[pos] || 0);
    }, 0);
    var individualPrize = totalPrize / tiedRows.length;

    tiedRows.forEach(function(row) {
      byParticipant[row.participantId] = individualPrize;
    });

    if (tiedRows.length > 1 && totalPrize > 0) {
      tieNotes.push('Empate en posicion ' + position + ': se repartieron posiciones ' + prizePositions.join(', '));
    }
  });

  byParticipant.tieNotes = tieNotes;
  return byParticipant;
}

function writePrizeEstimatesToRanking_(estimatedByParticipant) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(Q26.SHEETS.RANKING);
  var headers = getHeaders_(sheet);
  var prizeCol = findHeaderColumn_(sheet, 'Premio estimado');
  if (!prizeCol) return;
  getDataRows_(sheet).forEach(function(row, index) {
    var obj = rowToObject_(headers, row);
    var prize = estimatedByParticipant[obj['ID participante']] || 0;
    sheet.getRange(index + 2, prizeCol).setValue(prize);
  });
}

function writeSingleGroupConfig_(spreadsheet, config) {
  var sheet = spreadsheet.getSheetByName(Q26.SHEETS.CONFIG);
  replaceSheetData_(sheet, Q26.HEADERS[Q26.SHEETS.CONFIG], [[
    config.groupName,
    config.currency,
    config.contribution,
    config.moneyManager,
    config.managerEmail,
    config.resultMode,
    config.predictionVisibility,
    new Date(),
    config.groupStatus
  ]]);
}

function removeRowsForOtherGroups_(spreadsheet, groupName) {
  var participantsSheet = spreadsheet.getSheetByName(Q26.SHEETS.PARTICIPANTS);
  var participantHeaders = getHeaders_(participantsSheet);
  var participantRows = getDataRows_(participantsSheet);
  var participantIdsForGroup = {};

  var filteredParticipants = participantRows.filter(function(row) {
    var obj = rowToObject_(participantHeaders, row);
    var keep = obj['Grupo'] === groupName;
    if (keep) participantIdsForGroup[obj['ID participante']] = true;
    return keep;
  });
  replaceSheetData_(participantsSheet, Q26.HEADERS[Q26.SHEETS.PARTICIPANTS], filteredParticipants);

  filterSheetByGroup_(spreadsheet, Q26.SHEETS.SCORE, groupName);
  filterSheetByGroup_(spreadsheet, Q26.SHEETS.RANKING, groupName);
  filterSheetByGroup_(spreadsheet, Q26.SHEETS.PRIZES, groupName);

  var predictionsSheet = spreadsheet.getSheetByName(Q26.SHEETS.PREDICTIONS);
  var predictionHeaders = getHeaders_(predictionsSheet);
  var filteredPredictions = getDataRows_(predictionsSheet).filter(function(row) {
    var obj = rowToObject_(predictionHeaders, row);
    return participantIdsForGroup[obj['ID participante']] === true;
  });
  replaceSheetData_(predictionsSheet, Q26.HEADERS[Q26.SHEETS.PREDICTIONS], filteredPredictions);
}

function filterSheetByGroup_(spreadsheet, sheetName, groupName) {
  var sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2) return;
  var headers = getHeaders_(sheet);
  var rows = getDataRows_(sheet).filter(function(row) {
    return rowToObject_(headers, row)['Grupo'] === groupName;
  });
  replaceSheetData_(sheet, Q26.HEADERS[sheetName], rows);
}

function replaceSheetData_(sheet, headers, rows) {
  sheet.clearContents();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  if (rows.length) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
  formatHeader_(sheet);
}

function getHeaders_(sheet) {
  return sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0];
}

function getDataRows_(sheet) {
  if (!sheet || sheet.getLastRow() < 2) return [];
  var lastCol = Math.max(sheet.getLastColumn(), 1);
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, lastCol).getValues()
    .filter(function(row) {
      return row.some(function(value) { return value !== ''; });
    });
}

function rowToObject_(headers, row) {
  var obj = {};
  headers.forEach(function(header, index) {
    obj[header] = row[index];
  });
  return obj;
}

function setCellByHeader_(sheet, rowNumber, headerName, value) {
  var col = findHeaderColumn_(sheet, headerName);
  if (col) {
    sheet.getRange(rowNumber, col).setValue(value);
  }
}

function combineDateAndTime_(dateValue, timeValue) {
  if (!dateValue) return null;
  var date = dateValue instanceof Date ? new Date(dateValue) : new Date(dateValue);
  if (timeValue instanceof Date) {
    date.setHours(timeValue.getHours(), timeValue.getMinutes(), timeValue.getSeconds(), 0);
  } else if (typeof timeValue === 'string' && timeValue.trim()) {
    var parts = timeValue.split(':');
    date.setHours(Number(parts[0] || 0), Number(parts[1] || 0), Number(parts[2] || 0), 0);
  }
  return date;
}

function sanitizeFileName_(name) {
  return String(name || 'Grupo').replace(/[\\/:*?"<>|]/g, '-').trim();
}
