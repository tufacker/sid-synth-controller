/*
 * A small builder for Max patchers: boxes, patch cords, and the .amxd file
 * Live loads (a 32-byte header followed by the patcher JSON).
 */
const fs = require('fs');

class Patcher {
  constructor() {
    this.boxes = [];
    this.lines = [];
    this.count = 0;
    this.names = new Set();
  }

  // Adds a box and returns its id. Scripting names must be unique.
  add(box) {
    const id = `obj-${++this.count}`;
    if (box.varname) {
      if (this.names.has(box.varname)) throw new Error(`Duplicate scripting name ${box.varname}`);
      this.names.add(box.varname);
    }
    this.boxes.push({box: {id, ...box}});
    return id;
  }

  box(id) {
    return this.boxes.find(entry => entry.box.id === id).box;
  }

  // A free scripting name based on `base` (base, base_2, base_3...).
  uniqueName(base) {
    let name = base;
    for (let n = 2; this.names.has(name); n++) name = `${base}_${n}`;
    return name;
  }

  connect(source, outlet, destination, inlet) {
    this.lines.push({patchline: {source: [source, outlet], destination: [destination, inlet]}});
  }

  // Hidden helper objects (newobj / message). They only appear in edit mode.
  newobj(text, numinlets, outlettype, rect, extra = {}) {
    return this.add({maxclass: 'newobj', text, numinlets, numoutlets: outlettype.length, outlettype,
      patching_rect: rect, hidden: 1, ...extra});
  }

  message(text, rect) {
    return this.add({maxclass: 'message', text, numinlets: 2, numoutlets: 1, outlettype: [''],
      patching_rect: rect, hidden: 1});
  }

  prepend(word, rect) {
    return this.newobj(`prepend ${word}`, 1, [''], rect);
  }
}

// Live parameter attributes (saved_attribute_attributes.valueof).
function liveAttrs(name, shortName, min, max, initial, type = 0, enums = null, order = 0, info = '') {
  const valueof = {parameter_longname: name, parameter_shortname: shortName, parameter_annotation_name: name,
    parameter_type: type, parameter_unitstyle: 0, parameter_mmin: min, parameter_mmax: max,
    parameter_initial: [initial], parameter_initial_enable: 1, parameter_modmin: min, parameter_modmax: max,
    parameter_order: order};
  if (enums) valueof.parameter_enum = enums;
  if (info) valueof.parameter_info = info;
  return {valueof};
}

function writeDevice(file, patcher) {
  const json = JSON.stringify({patcher}, null, '\t') + '\n';
  const header = Buffer.alloc(32);
  header.write('ampf', 0, 'ascii');
  header.writeUInt32LE(4, 4);
  header.write('mmmmmeta', 8, 'ascii');
  header.writeUInt32LE(4, 16);
  header.writeUInt32LE(0, 20);
  header.write('ptch', 24, 'ascii');
  header.writeUInt32LE(Buffer.byteLength(json), 28);
  fs.writeFileSync(file, Buffer.concat([header, Buffer.from(json, 'utf8')]));
  return json;
}

module.exports = {Patcher, liveAttrs, writeDevice};
