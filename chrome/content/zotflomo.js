Cu.import("resource://gre/modules/osfile.jsm")
Services.scriptloader.loadSubScript('chrome://zotflomo/content/utils.js')

let zotflomo = {
}

zotflomo.init = function () {
  // Register the callback in Zotero as an item observer
  Zotero.debug('zotflomo@init ...')

  document.getElementById('zotero-itemmenu').addEventListener('popupshowing', this.itemmenuPopupShowing.bind(this), false)
  document.getElementById('zotero-collectionmenu').addEventListener('popupshowing', this.collectionmenuPopupShowing.bind(this), false)
}

zotflomo.collectionmenuPopupShowing = function () {
}

zotflomo.itemmenuPopupShowing = function () {
  var zitems = Utils.getSelectedItems('note')
  var mutiNote = zitems && zitems.length > 0

  document.querySelectorAll('.muti-select-note').forEach(element => {
    element.disabled = !mutiNote
  })
}

zotflomo.htmlToText = function (html) {
  var	nsIFC = Components.classes['@mozilla.org/widget/htmlformatconverter;1'].createInstance(Components.interfaces.nsIFormatConverter)
  var from = Components.classes['@mozilla.org/supports-string;1'].createInstance(Components.interfaces.nsISupportsString)
  from.data = html
  var to = { value: null }
  try {
    nsIFC.convert('text/html', from, from.toString().length, 'text/unicode', to, {})
    to = to.value.QueryInterface(Components.interfaces.nsISupportsString)
    return to.toString()
  } catch (e) {
    Zotero.debug(e, 1)
    return html
  }
}

zotflomo.publish = function () {
  var zitems = Utils.getSelectedItems(['note'])
  if (!zitems || zitems.length <= 0) {
    Utils.warning('不支持的条目。')
    return
  }

  let url = Zotero.Prefs.get('zotflomo.url')
  let tail = Zotero.Prefs.get('zotflomo.tail')
  if (tail === undefined) {
    tail = 1
    Zotero.Prefs.set('zotflomo.tail', true)
  }
  if (!url) {
    this.option()
    url = Zotero.Prefs.get('zotflomo.url')
    tail = Zotero.Prefs.get('zotflomo.tail')
  }
  if (!url) {
    return
  }
  let pw = new Zotero.ProgressWindow()
  pw.changeHeadline('发布')
  pw.show()
  for (const zitem of zitems) {
    let itemProgress = new pw.ItemProgress(
      `chrome://zotero/skin/spinner-16px${Zotero.hiDPISuffix}.png`,
      `${zitem.getNoteTitle()} 提交中 ...`
    )
    itemProgress.setProgress(50)
    let note = zitem.getNote().replace(/^<h3>## /g, '<h3>#').replace(/<hr \/>\n*<p style="color: #808080;">于 \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} 发布到 <a href="https:\/\/flomoapp.com\/mine\/\?memo_id=.*">Flomo<\/a> 。\<\/p>/g, '')
    Zotero.debug('zotflomo@url: ' + url)
    let start = note.indexOf('<p>- <strong>标签</strong>：')
    if (start > -1) {
      let startContent = note.substr(0, start)
      let end = note.indexOf('\n', start)
      let content, endContent
      if (end > start) {
        content = note.substr(start, end - start)
        endContent = note.substr(end)
      } else {
        content = note.substr(start)
        endContent = ''
      }
      note = startContent + content.replace(/\[(.*?)\]/g, '#$1') + endContent
    }
    let body = {
      content: this.htmlToText(note).replace(/"/g, '\\"').replace(/## */g, '#').replace(/\n\n/g, '\n').replace(/\r\n\r\n/g, '\r\n')
    }
    Zotero.debug('zotflomo@body: ' + JSON.stringify(body))
    Zotero.HTTP.doPost(url, JSON.stringify(body), function (request) {
      if (request.status === 200) {
        let json = JSON.parse(request.responseText)
        if (json.code === 0) {
          if (json.memo.content === '<p></p>') {
            itemProgress.setIcon(`chrome://zotero/skin/cross${Zotero.hiDPISuffix}.png`)
            itemProgress.setText(`${zitem.getNoteTitle()} 发布异常，内容空白，请删除并重试。`)
            itemProgress.setProgress(100)
          } else {
            if (tail) {
              zitem.setNote(zitem.getNote() + `<hr /><p style="color: #808080;">于 ${json.memo.created_at} 发布到 <a href="https://flomoapp.com/mine/?memo_id=${json.memo.slug}">Flomo</a> 。</p>`);
              zitem.saveTx()
            }
            itemProgress.setIcon(`chrome://zotero/skin/tick${Zotero.hiDPISuffix}.png`)
            itemProgress.setText(`${zitem.getNoteTitle()} 发布成功。`)
            itemProgress.setProgress(100)
          }
        } else {
          itemProgress.setIcon(`chrome://zotero/skin/cross${Zotero.hiDPISuffix}.png`)
          itemProgress.setText(`${zitem.getNoteTitle()}：${json.message}`)
          itemProgress.setProgress(100)
        }
      } else if (request.status === 0) {
        itemProgress.setIcon(`chrome://zotero/skin/cross${Zotero.hiDPISuffix}.png`)
        itemProgress.setText(`${zitem.getNoteTitle()}：${request.status} - 网络错误，请重试。`)
        itemProgress.setProgress(100)
      } else {
        itemProgress.setIcon(`chrome://zotero/skin/cross${Zotero.hiDPISuffix}.png`)
        itemProgress.setText(`${zitem.getNoteTitle()}：${request.status} - ${request.statusText}`)
        itemProgress.setProgress(100)
      }
    }, {
      'Content-Type': 'application/json'
    })
  }
}

zotflomo.option = function () {
  window.openDialog(
    'chrome://zotflomo/content/config.xul',
    'zotcard-config', 'modal, chrome, centerscreen',
    {})
}

if (typeof window !== 'undefined') {
  window.addEventListener('load', function (e) { zotflomo.init() }, false)

  // API export for Zotero UI
  // Can't imagine those to not exist tbh
  if (!window.Zotero) window.Zotero = {}
  if (!window.Zotero.ZotFlomo) window.Zotero.ZotFlomo = {}
  // note sure about any of this

  window.Zotero.ZotFlomo.publish = function () { zotflomo.publish() }
  window.Zotero.ZotFlomo.option = function () { zotflomo.option() }
} else {
  Zotero.debug('zotflomo@window is null.')
}

if (typeof module !== 'undefined') module.exports = zotflomo
