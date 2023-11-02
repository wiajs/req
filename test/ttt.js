let v = 'wia.*';
v = v.replaceAll('.', '[.]').replaceAll('*', '\\w*');
const reg = new RegExp(`\\b${v}\\b`, 'i');
console.log('', {v, reg});
// console.log(/\bwia[.]\w*\b/.test('xwia.agent'));
console.log(reg.test('wia_agent'));
console.log(reg.test('wia_req, wia.agent'));

let debug = 'a, b  c， d';
debug = debug.replaceAll(/\s*,\s*|\s*，\s*|\s+/g, ',');
console.log('', {debug});
