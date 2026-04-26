/**
 * LPT Discovery Multi-Área — Apps Script Endpoint
 *
 * Recibe POST con JSON desde cualquiera de los 7 formularios y lo escribe
 * como una fila en la pestaña correspondiente al área (campo `_area`).
 *
 * - Crea pestañas automáticamente la primera vez que llega un área
 * - Crea headers automáticamente
 * - Si llegan campos nuevos en posts posteriores, los agrega como columnas
 * - Stamp de timestamp + área en las primeras columnas
 * - Devuelve {ok: true} o {ok: false, error: "..."}
 */

const AREA_SHEETS = {
  'contable': 'Contable',
  'comercial': 'Comercial',
  'operaciones-cafe': 'Operaciones de Café',
  'cultivos-asociados': 'Cultivos Asociados',
  'calidades-inventarios': 'Calidades e Inventarios',
  'tesoreria-bancos': 'Tesorería y Bancos',
  'planeacion-financiera': 'Planeación Financiera',
};

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const area = (data._area || 'sin-area').toString();
    const sheetName = AREA_SHEETS[area] || area;

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }

    const lastCol = sheet.getLastColumn();
    let headers = lastCol > 0
      ? sheet.getRange(1, 1, 1, lastCol).getValues()[0]
      : [];

    const incomingKeys = Object.keys(data).filter(k => !k.startsWith('_'));
    const isFirstWrite = headers.length === 0;
    const newKeys = incomingKeys.filter(k => !headers.includes(k));

    if (isFirstWrite) {
      headers = ['_recibido_at', '_area', '_recipient', ...incomingKeys];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.setFrozenRows(1);
      sheet.getRange(1, 1, 1, headers.length)
        .setFontWeight('bold')
        .setBackground('#1f3d2b')
        .setFontColor('#ffffff');
      sheet.setColumnWidths(1, headers.length, 220);
    } else if (newKeys.length) {
      const startCol = headers.length + 1;
      sheet.getRange(1, startCol, 1, newKeys.length).setValues([newKeys]);
      sheet.getRange(1, startCol, 1, newKeys.length)
        .setFontWeight('bold')
        .setBackground('#1f3d2b')
        .setFontColor('#ffffff');
      headers = headers.concat(newKeys);
    }

    const row = headers.map(h => {
      if (h === '_recibido_at') return new Date().toISOString();
      if (h === '_area') return area;
      if (h === '_recipient') return data._recipient || '';
      const v = data[h];
      if (Array.isArray(v)) return v.join(', ');
      if (typeof v === 'object' && v !== null) return JSON.stringify(v);
      return v == null ? '' : v;
    });

    sheet.appendRow(row);

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, area: area, sheet: sheetName }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  return ContentService
    .createTextOutput('LPT Discovery multi-área endpoint activo. Use POST.')
    .setMimeType(ContentService.MimeType.TEXT);
}
