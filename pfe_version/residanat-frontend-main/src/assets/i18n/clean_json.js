const fs = require('fs');

function mergeDeep(target, source) {
  for (const key in source) {
    if (source[key] instanceof Object && key in target) {
      Object.assign(source[key], mergeDeep(target[key], source[key]));
    }
  }
  Object.assign(target || {}, source);
  return target;
}

const filePath = process.argv[2];
const content = fs.readFileSync(filePath, 'utf8');
// Fix potential trailing commas or other minor issues by parsing and re-stringifying
const json = JSON.parse(content);

fs.writeFileSync(filePath, JSON.stringify(json, null, 2), 'utf8');
console.log('Cleaned ' + filePath);
