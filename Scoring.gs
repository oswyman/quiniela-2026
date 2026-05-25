/**
 * Funciones puras de puntuacion. No leen ni escriben hojas.
 */

function calculatePredictionScore(prediction, result, options) {
  var scoring = (options && options.scoring) || Q26.SCORING;
  if (!prediction || prediction.isLate) {
    return buildScoreResult_(scoring.late, 'TARDIO', 'Pronostico tardio');
  }

  var homePred = toNumberOrNull_(prediction.homeGoals);
  var awayPred = toNumberOrNull_(prediction.awayGoals);
  var homeResult = toNumberOrNull_(result && result.homeGoals);
  var awayResult = toNumberOrNull_(result && result.awayGoals);

  if (homePred === null || awayPred === null || homeResult === null || awayResult === null) {
    return buildScoreResult_(0, 'SIN_RESULTADO', 'Faltan datos para puntuar');
  }

  if (homePred === homeResult && awayPred === awayResult) {
    return buildScoreResult_(scoring.exactScore, 'MARCADOR_EXACTO', 'Marcador exacto');
  }

  var predictedOutcome = getOutcome_(homePred, awayPred);
  var actualOutcome = getOutcome_(homeResult, awayResult);
  var predictedDiff = homePred - awayPred;
  var actualDiff = homeResult - awayResult;

  if (predictedDiff === actualDiff) {
    return buildScoreResult_(scoring.goalDifference, 'DIFERENCIA_CORRECTA', 'Diferencia de goles correcta');
  }

  if (predictedOutcome === actualOutcome) {
    if (actualOutcome === 'DRAW') {
      return buildScoreResult_(scoring.winnerOrDraw, 'EMPATE_CORRECTO', 'Empate correcto');
    }
    return buildScoreResult_(scoring.winnerOrDraw, 'GANADOR_CORRECTO', 'Ganador correcto');
  }

  return buildScoreResult_(scoring.incorrect, 'INCORRECTO', 'Resultado incorrecto');
}

function resolveMatchResult(matchRecord, resultMode) {
  if (!matchRecord) {
    return { homeGoals: null, awayGoals: null };
  }

  if (resultMode === Q26.RESULT_MODES.FINAL_WITH_PENALTIES) {
    return firstCompleteScore_([
      { homeGoals: matchRecord.validHome, awayGoals: matchRecord.validAway },
      { homeGoals: matchRecord.penHome, awayGoals: matchRecord.penAway },
      { homeGoals: matchRecord.etHome, awayGoals: matchRecord.etAway },
      { homeGoals: matchRecord.home90, awayGoals: matchRecord.away90 }
    ]);
  }

  if (resultMode === Q26.RESULT_MODES.EXTRA_TIME) {
    return firstCompleteScore_([
      { homeGoals: matchRecord.validHome, awayGoals: matchRecord.validAway },
      { homeGoals: matchRecord.etHome, awayGoals: matchRecord.etAway },
      { homeGoals: matchRecord.home90, awayGoals: matchRecord.away90 }
    ]);
  }

  return firstCompleteScore_([
    { homeGoals: matchRecord.validHome, awayGoals: matchRecord.validAway },
    { homeGoals: matchRecord.home90, awayGoals: matchRecord.away90 }
  ]);
}

function isPredictionLate(sentAt, matchDate, matchTime, timezone) {
  var closeAt = buildMatchDateTime_(matchDate, matchTime, timezone);
  if (!sentAt || !closeAt) {
    return false;
  }
  return new Date(sentAt).getTime() > closeAt.getTime();
}

function getOutcome_(homeGoals, awayGoals) {
  if (homeGoals > awayGoals) return 'HOME';
  if (homeGoals < awayGoals) return 'AWAY';
  return 'DRAW';
}

function firstCompleteScore_(scores) {
  for (var i = 0; i < scores.length; i++) {
    var home = toNumberOrNull_(scores[i].homeGoals);
    var away = toNumberOrNull_(scores[i].awayGoals);
    if (home !== null && away !== null) {
      return { homeGoals: home, awayGoals: away };
    }
  }
  return { homeGoals: null, awayGoals: null };
}

function buildScoreResult_(points, type, message) {
  return {
    points: points,
    type: type,
    message: message,
    exact: type === 'MARCADOR_EXACTO' ? 1 : 0,
    winner: type === 'GANADOR_CORRECTO' ? 1 : 0,
    draw: type === 'EMPATE_CORRECTO' ? 1 : 0,
    difference: type === 'DIFERENCIA_CORRECTA' ? 1 : 0
  };
}

function toNumberOrNull_(value) {
  if (value === '' || value === null || typeof value === 'undefined') {
    return null;
  }
  var numberValue = Number(value);
  return isNaN(numberValue) ? null : numberValue;
}

function buildMatchDateTime_(matchDate, matchTime, timezone) {
  if (!matchDate) {
    return null;
  }

  var date = matchDate instanceof Date ? new Date(matchDate) : new Date(matchDate);
  if (isNaN(date.getTime())) {
    return null;
  }

  if (matchTime instanceof Date) {
    date.setHours(matchTime.getHours(), matchTime.getMinutes(), 0, 0);
  } else if (typeof matchTime === 'string' && matchTime.trim()) {
    var parts = matchTime.trim().split(':');
    date.setHours(Number(parts[0] || 0), Number(parts[1] || 0), 0, 0);
  }

  return date;
}
