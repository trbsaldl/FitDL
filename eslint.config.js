// Revisión de código: npm run lint (necesita ESLint; en GitHub se instala solo)
// Los scripts de la app comparten el ámbito global y se llaman desde el HTML (onclick),
// por eso "no-unused-vars" solo mira lo local y no las funciones de nivel superior.
const browser = ['window', 'document', 'localStorage', 'sessionStorage', 'navigator', 'location', 'history', 'screen', 'console',
    'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'requestAnimationFrame', 'requestIdleCallback', 'fetch',
    'crypto', 'TextEncoder', 'URL', 'URLSearchParams', 'Blob', 'FileReader', 'Image', 'performance', 'AbortController',
    'BarcodeDetector', 'Notification', 'caches', 'self', 'matchMedia', 'structuredClone', 'atob', 'btoa', 'FormData',
    'HTMLElement', 'Event', 'MutationObserver', 'IntersectionObserver', 'SpeechRecognition', 'webkitSpeechRecognition',
    'speechSynthesis', 'getComputedStyle', 'CSS', 'innerWidth', 'innerHeight', 'open', 'print', 'Intl', 'createImageBitmap',
    'OffscreenCanvas', 'Audio', 'alert', 'confirm', 'prompt', 'ResizeObserver', 'XMLHttpRequest', 'indexedDB'];
const g = names => Object.fromEntries(names.map(n => [n, 'readonly']));
module.exports = [
    { ignores: ['node_modules/**', 'alimentos/**', 'sw.js', 'js/data/**', 'tools/marcas/cache_off/**'] },
    {
        files: ['js/**/*.js'],
        languageOptions: { ecmaVersion: 2023, sourceType: 'script', globals: g(browser) },
        rules: {
            'no-unused-vars': ['warn', { vars: 'local', args: 'none', caughtErrors: 'none', ignoreRestSiblings: true }],
            'no-redeclare': 'off', 'no-dupe-keys': 'error', 'no-unreachable': 'error', 'no-undef': 'off',
            'no-empty': ['warn', { allowEmptyCatch: true }], eqeqeq: ['warn', 'smart'],
        },
    },
    {
        files: ['tests/**/*.js', 'tools/**/*.js', 'eslint.config.js'],
        languageOptions: { ecmaVersion: 2023, sourceType: 'commonjs', globals: { ...g(['console', 'process', 'require', 'module', '__dirname', 'Buffer', 'setTimeout', 'clearTimeout', 'URL', 'fetch']) } },
        rules: { 'no-unused-vars': ['warn', { args: 'none', caughtErrors: 'none', ignoreRestSiblings: true }], 'no-dupe-keys': 'error', 'no-unreachable': 'error', 'no-empty': ['warn', { allowEmptyCatch: true }] },
    },
];
