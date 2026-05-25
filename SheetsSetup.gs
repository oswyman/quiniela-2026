/**
 * Creacion, formato, validacion y proteccion de hojas.
 */

function createWorkbookStructure(targetSpreadsheet) {
  var ss = targetSpreadsheet || SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(Q26.HEADERS).forEach(function(sheetName) {
    var sheet = getOrCreateSheet_(ss, sheetName);
    ensureHeader_(sheet, Q26.HEADERS[sheetName]);
    formatHeader_(sheet);
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, Q26.HEADERS[sheetName].length);
  });

  setupRulesSheet_(ss.getSheetByName(Q26.SHEETS.RULES));
  applyDataValidations_(ss);
  applyHelpfulNotes_(ss);
  auditLog('CREAR_ESTRUCTURA', 'TODAS', '', { version: Q26.VERSION }, 'OK');
}

function initializeDefaultConfiguration(targetSpreadsheet) {
  var ss = targetSpreadsheet || SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(Q26.SHEETS.CONFIG);
  ensureHeader_(sheet, Q26.HEADERS[Q26.SHEETS.CONFIG]);

  if (sheet.getLastRow() < 2) {
    sheet.appendRow([
      Q26.DEFAULTS.groupName,
      Q26.DEFAULTS.currency,
      Q26.DEFAULTS.contribution,
      Q26.DEFAULTS.moneyManager,
      Q26.DEFAULTS.managerEmail,
      Q26.DEFAULTS.resultMode,
      Q26.DEFAULTS.predictionVisibility,
      new Date(),
      Q26.DEFAULTS.groupStatus
    ]);
  }

  auditLog('INICIALIZAR_CONFIGURACION', Q26.SHEETS.CONFIG, Q26.DEFAULTS.groupName, {}, 'OK');
}

function applyDataValidations_(targetSpreadsheet) {
  var ss = targetSpreadsheet || SpreadsheetApp.getActiveSpreadsheet();

  setValidationByHeader_(ss.getSheetByName(Q26.SHEETS.CONFIG), 'Resultado valido', values_(Q26.RESULT_MODES));
  setValidationByHeader_(ss.getSheetByName(Q26.SHEETS.CONFIG), 'Visibilidad de pronosticos', values_(Q26.VISIBILITY));
  setValidationByHeader_(ss.getSheetByName(Q26.SHEETS.CONFIG), 'Estado del grupo', values_(Q26.GROUP_STATUS));
  setValidationByHeader_(ss.getSheetByName(Q26.SHEETS.PARTICIPANTS), 'Estado de pago', values_(Q26.PAYMENT_STATUS));
  setValidationByHeader_(ss.getSheetByName(Q26.SHEETS.PARTICIPANTS), 'Estado participante', values_(Q26.PARTICIPANT_STATUS));
  setValidationByHeader_(ss.getSheetByName(Q26.SHEETS.MATCHES), 'Estado partido', values_(Q26.MATCH_STATUS));
  setValidationByHeader_(ss.getSheetByName(Q26.SHEETS.PREDICTIONS), 'Estado pronostico', values_(Q26.PREDICTION_STATUS));
  setValidationByHeader_(ss.getSheetByName(Q26.SHEETS.PREDICTIONS), 'Es tardio', ['SI', 'NO']);
}

function applyHelpfulNotes_(targetSpreadsheet) {
  var ss = targetSpreadsheet || SpreadsheetApp.getActiveSpreadsheet();
  setNoteByHeader_(ss.getSheetByName(Q26.SHEETS.CONFIG), 'Resultado valido', 'Define que marcador se usara para puntuar: 90 minutos, tiempos extra o final con penales.');
  setNoteByHeader_(ss.getSheetByName(Q26.SHEETS.CONFIG), 'Visibilidad de pronosticos', 'Recomendado: DESPUES_DEL_CIERRE para evitar ventajas estrategicas.');
  setNoteByHeader_(ss.getSheetByName(Q26.SHEETS.MATCHES), 'Resultado valido local', 'Puede llenarse manualmente o por API futura; si esta vacio se calcula desde el modo de resultado valido.');
  setNoteByHeader_(ss.getSheetByName(Q26.SHEETS.PREDICTIONS), 'Fecha envio', 'No modifiques este timestamp. Usalo para validar cierre.');
  setNoteByHeader_(ss.getSheetByName(Q26.SHEETS.PREDICTIONS), 'Es tardio', 'Se marca automaticamente al validar pronosticos.');
}

function protectSheets(targetSpreadsheet) {
  var ss = targetSpreadsheet || SpreadsheetApp.getActiveSpreadsheet();
  Q26.SENSITIVE_SHEETS.forEach(function(sheetName) {
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) return;
    removeProtections_(sheet);
    var protection = sheet.protect().setDescription('Proteccion automatica Quiniela 2026: ' + sheetName);
    protection.setWarningOnly(false);
    try {
      var me = Session.getEffectiveUser();
      protection.addEditor(me);
      protection.removeEditors(protection.getEditors().filter(function(user) {
        return user.getEmail() !== me.getEmail();
      }));
    } catch (err) {
      protection.setWarningOnly(true);
    }
  });

  protectPredictionTimestampColumns_(ss);
  auditLog('PROTEGER_HOJAS', 'TODAS', '', { sensitiveSheets: Q26.SENSITIVE_SHEETS }, 'OK');
}

function protectPredictionTimestampColumns_(targetSpreadsheet) {
  var ss = targetSpreadsheet || SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(Q26.SHEETS.PREDICTIONS);
  if (!sheet) return;

  ['Fecha envio', 'Hora envio', 'Estado pronostico', 'Es tardio', 'Puntos obtenidos'].forEach(function(headerName) {
    var col = findHeaderColumn_(sheet, headerName);
    if (!col) return;
    var range = sheet.getRange(2, col, Math.max(sheet.getMaxRows() - 1, 1), 1);
    var protection = range.protect().setDescription('Proteccion campo calculado: ' + headerName);
    protection.setWarningOnly(true);
  });
}

function setupRulesSheet_(sheet) {
  if (!sheet) return;
  sheet.clear();
  var rows = [
    ['Reglas visibles para participantes'],
    ['1. Cada participante debe enviar su pronostico antes de la fecha y hora de inicio del partido.'],
    ['2. Pronosticos tardios reciben 0 puntos.'],
    ['3. Marcador exacto: ' + Q26.SCORING.exactScore + ' puntos.'],
    ['4. Diferencia de goles correcta: ' + Q26.SCORING.goalDifference + ' puntos.'],
    ['5. Ganador correcto o empate correcto: ' + Q26.SCORING.winnerOrDraw + ' punto.'],
    ['6. Resultado incorrecto: 0 puntos.'],
    ['7. El resultado valido depende de la configuracion del grupo.'],
    ['8. Recomendacion antifraude: ocultar pronosticos hasta el cierre de cada partido.'],
    ['9. Advertencia: mostrar pronosticos antes del cierre puede generar ventajas estrategicas.'],
    ['10. La plataforma no custodia dinero; el responsable de grupo administra aportaciones y premios.'],
    ['11. Cualquier manejo de premios economicos debe revisarse con asesoria legal aplicable.']
  ];
  sheet.getRange(1, 1, rows.length, 1).setValues(rows);
  sheet.getRange(1, 1).setFontWeight('bold').setFontSize(14);
  sheet.autoResizeColumn(1);
}

function getOrCreateSheet_(ss, sheetName) {
  return ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);
}

function ensureHeader_(sheet, headers) {
  var existing = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  var hasAnyHeader = existing.some(function(value) { return value !== ''; });
  if (!hasAnyHeader) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
}

function formatHeader_(sheet) {
  var lastCol = sheet.getLastColumn();
  if (lastCol < 1) return;
  sheet.getRange(1, 1, 1, lastCol)
    .setFontWeight('bold')
    .setBackground('#1f4e79')
    .setFontColor('#ffffff')
    .setHorizontalAlignment('center');
}

function setValidationByHeader_(sheet, headerName, allowedValues) {
  if (!sheet) return;
  var col = findHeaderColumn_(sheet, headerName);
  if (!col) return;
  var rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(allowedValues, true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, col, Math.max(sheet.getMaxRows() - 1, 1), 1).setDataValidation(rule);
}

function setNoteByHeader_(sheet, headerName, note) {
  if (!sheet) return;
  var col = findHeaderColumn_(sheet, headerName);
  if (col) {
    sheet.getRange(1, col).setNote(note);
  }
}

function findHeaderColumn_(sheet, headerName) {
  var headers = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0];
  for (var i = 0; i < headers.length; i++) {
    if (headers[i] === headerName) {
      return i + 1;
    }
  }
  return null;
}

function values_(objectValue) {
  return Object.keys(objectValue).map(function(key) { return objectValue[key]; });
}

function removeProtections_(sheet) {
  sheet.getProtections(SpreadsheetApp.ProtectionType.SHEET).forEach(function(protection) {
    protection.remove();
  });
  sheet.getProtections(SpreadsheetApp.ProtectionType.RANGE).forEach(function(protection) {
    protection.remove();
  });
}
