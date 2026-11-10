// Raciones de los productos de marca: la del fabricante cuando existe, nunca absurdas. Uso: npm test
const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm'), fs = require('node:fs'), path = require('node:path');

function foods() {
    const ctx = { console };
    vm.createContext(ctx);
    for (const f of ['data/foods', 'data/foods-marcas']) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f + '.js'), 'utf8'), ctx);
    return JSON.parse(vm.runInContext('JSON.stringify(FOODS.filter(f => f.brand))', ctx));
}

test('Marcas: la ración real del fabricante sustituye a la genérica de 100 g (una Oreo = 1 galleta de 11 g)', () => {
    const M = foods();
    const oreo = M.find(f => f.brand === 'Oreo' && f.name === 'Galletas original');
    assert.deepEqual([...oreo.serv], [11, 'galleta', 'galletas']);
    const conReal = M.filter(f => !(f.serv[0] === 100 && f.serv[1] === 'ración'));
    assert.ok(conReal.length >= 1900, 'más de la mitad con ración propia: ' + conReal.length);
});

test('Marcas: ninguna ración absurda (menos de 5 g o más de 500 g/ml)', () => {
    const malas = foods().filter(f => f.serv[0] < 5 || f.serv[0] > 500).map(f => `${f.name} (${f.brand}): ${f.serv[0]}`);
    assert.deepEqual(malas, []);
});
