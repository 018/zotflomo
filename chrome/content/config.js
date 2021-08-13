/* Copyright 2021 018.
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';
/* global window, document, Components */
/* global Zotero, ZoteroPane, ZOTERO_CONFIG */
Components.utils.import('resource://gre/modules/Services.jsm');
//Services.scriptloader.loadSubScript('chrome://zotflomo/content/zotcardOverlay.js');

function onload () {
  let url = Zotero.Prefs.get('zotflomo.url')
  document.getElementById('url_edt').value = url
  let tail = Zotero.Prefs.get('zotflomo.tail')
  document.getElementById('tail_rdo').value = (tail === undefined || tail ? '是' : '否')
  Zotero.debug(`zotflomo@url: ${url}, tail: ${tail}`)
}

function ok () {
  var url = document.getElementById('url_edt').value
  Zotero.Prefs.set('zotflomo.url', url)

  var tail = document.getElementById('tail_rdo').value
  Zotero.Prefs.set('zotflomo.tail', tail === '是')
}
