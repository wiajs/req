let debug = 'a, b  c， d';
debug = debug.replaceAll(/\s*,\s*|\s*，\s*|\s+/g, ',');
console.log('', {debug});