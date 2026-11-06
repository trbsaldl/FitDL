// nutriDL · Medición de uso SOLO en este dispositivo (nada se envía a ningún servidor)
// Sirve para ver en «Informe de errores» si la app engancha: primer día, días activos, retención y la métrica clave
// (personas que apuntan comidas y vuelven al menos 7 días). Si en el futuro se activa un servicio de estadísticas
// sin cookies (Plausible, Umami…), su dirección iría en ANALYTICS_ENDPOINT y solo se usaría con consentimiento.
'use strict';

const EVENTS_KEY = 'nutridl_events';
const ANALYTICS_ENDPOINT = ''; // vacío: no se envía nada
function evLoad() { try { return JSON.parse(localStorage.getItem(EVENTS_KEY) || 'null') || { first: null, days: [], foodDays: [], firsts: {}, n: {} }; } catch (e) { return { first: null, days: [], foodDays: [], firsts: {}, n: {} }; } }
function ev(name) {
    try {
        const E = evLoad(), d = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
        if (!E.first) E.first = d;
        if (!E.days.includes(d)) E.days = E.days.concat(d).slice(-400);
        if (/^food_logged/.test(name) && !E.foodDays.includes(d)) E.foodDays = E.foodDays.concat(d).slice(-400);
        if (!E.firsts[name]) E.firsts[name] = d;
        E.n[name] = (E.n[name] || 0) + 1;
        localStorage.setItem(EVENTS_KEY, JSON.stringify(E));
    } catch (e) { }
}
// Métricas de este dispositivo (retención = ha vuelto ese día o después, dentro de la ventana)
function evMetrics() {
    const E = evLoad(); if (!E.first) return null;
    const dn = iso => Math.round(new Date(iso + 'T12:00:00').getTime() / 86400000), f = dn(E.first);
    const back = (a, b) => E.days.some(x => dn(x) - f >= a && dn(x) - f <= b);
    return {
        first: E.first, activeDays: E.days.length, foodDays: E.foodDays.length,
        d1: back(1, 1), d7: back(7, 13), d30: back(30, 59),
        onboarding: !!E.firsts.onboarding_done, firstFood: E.firsts.food_logged || null,
        northStar: E.foodDays.length >= 7, proInterest: !!E.firsts.pro_interest,
        counts: E.n,
    };
}
// Resumen de uso para el informe técnico (para quien desarrolla la app): en español a propósito
function evReport() { // i18n-ignore-start
    const M = evMetrics(); if (!M) return 'Sin datos de uso todavía.';
    const yes = b => b ? 'sí' : 'no';
    return `Primer uso: ${M.first} · días activos: ${M.activeDays} · días con comidas: ${M.foodDays}\nPlan completado: ${yes(M.onboarding)} · primera comida: ${M.firstFood || 'no'}\nVolvió al día siguiente: ${yes(M.d1)} · a los 7 días: ${yes(M.d7)} · a los 30 días: ${yes(M.d30)}\nMétrica clave (apunta y vuelve 7+ días): ${yes(M.northStar)} · interés en PRO: ${yes(M.proInterest)}`;
} // i18n-ignore-end

