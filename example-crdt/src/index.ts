import * as Y from 'yjs';
import { fromUint8Array, toUint8Array } from 'js-base64'
var QuillDeltaToHtmlConverter = require('quill-delta-to-html').QuillDeltaToHtmlConverter;
var cfg = {};

let ydoc: any;
let ytext: any;
let fromUpdate = false;

class CRDTFormat {
  public bold?: Boolean = false;
  public italic?: Boolean = false;
  public underline?: Boolean = false;
};

exports.CRDT = class {

  constructor(cb: (update: string, isLocal: Boolean) => void) {
    ['update', 'insert', 'delete', 'insertImage', 'toHTML'].forEach(f => (this as any)[f] = (this as any)[f].bind(this));
    
    ydoc = new Y.Doc();
    ytext = ydoc.getText("quill");

    ydoc.on("update", (update: any) => {
			if (fromUpdate)
        cb(JSON.stringify({ update: fromUint8Array(update), id: ydoc.clientID }), false);
      else
        cb(JSON.stringify({ update: fromUint8Array(update), id: ydoc.clientID }), true);
		});
  }

  update(update: string) {
    fromUpdate = true;
    let data = JSON.parse(update);

    if (data.id !== ydoc.clientID) {
      Y.applyUpdate(ydoc, toUint8Array(data.update));
    }
  }

  insert(index: number, content: string, format: CRDTFormat) {
    fromUpdate = false;
    ytext.insert(index, content, format);
  }

  delete(index: number, length: number) {
    fromUpdate = false;
    ytext.delete(index, length);
  }

  insertImage(index: number, url: string) {
    fromUpdate = false;
    ytext.applyDelta([{ retain: index }, { insert: { image: url } }])
  }

  toHTML() {
    let delta = ytext.toDelta();
    let html = "";
    var converter = new QuillDeltaToHtmlConverter(delta, cfg);
    html = converter.convert(); 
    return html;
  }
};
