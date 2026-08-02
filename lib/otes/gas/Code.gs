/**
 * OTES Action Log — Google Drive sync
 *
 * Deploy as web app:
 *   Execute as: Me
 *   Who has access: Anyone
 *
 * Optional: Project settings → Script properties → SYNC_SECRET = any passphrase
 * (same value as OTES_SYNC_SECRET in Vercel)
 */
var FILE_NAME = 'otes-workspace.json';

function doGet() {
  return ContentService.createTextOutput('OTES Action Log sync is running.');
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var secret = PropertiesService.getScriptProperties().getProperty('SYNC_SECRET');
    if (secret && body.secret !== secret) {
      return jsonResponse({ error: 'Unauthorized' });
    }

    if (body.action === 'load') {
      var file = findWorkspaceFile_();
      if (!file) {
        return jsonResponse({ workspace: null });
      }
      return jsonResponse({ workspace: JSON.parse(file.getBlob().getDataAsString()) });
    }

    if (body.action === 'save') {
      if (!body.workspace) {
        return jsonResponse({ error: 'Missing workspace' });
      }
      saveWorkspaceFile_(JSON.stringify(body.workspace));
      return jsonResponse({ ok: true });
    }

    return jsonResponse({ error: 'Unknown action' });
  } catch (err) {
    return jsonResponse({ error: String(err) });
  }
}

function findWorkspaceFile_() {
  var files = DriveApp.getFilesByName(FILE_NAME);
  if (files.hasNext()) {
    return files.next();
  }
  return null;
}

function saveWorkspaceFile_(contents) {
  var file = findWorkspaceFile_();
  if (file) {
    file.setContent(contents);
    return file;
  }
  return DriveApp.createFile(FILE_NAME, contents, MimeType.PLAIN_TEXT);
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
