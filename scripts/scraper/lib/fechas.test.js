// Ejecutar: node --test lib/fechas.test.js   (desde scripts/scraper)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSpanishDate, normalizeHora } from './fechas.js';

test('fecha ISO y dd/mm/aaaa', () => {
  assert.equal(parseSpanishDate('2026-10-24'), '2026-10-24');
  assert.equal(parseSpanishDate('24/10/2026'), '2026-10-24');
});

test('día y mes sin año: usa el año actual si la fecha no quedó lejos', () => {
  const hoy = new Date('2026-11-19T12:00:00Z');
  assert.equal(parseSpanishDate('24 de octubre', hoy), '2026-10-24');
  assert.equal(parseSpanishDate('16 de diciembre', hoy), '2026-12-16');
});

test('fecha sin año muy lejana sigue siendo ambigua (null), no se asume el año siguiente', () => {
  const hoy = new Date('2026-11-19T12:00:00Z');
  assert.equal(parseSpanishDate('5 de mayo', hoy), null);
});

test('cambio de año: 28 de diciembre leído el 5 de enero es del año anterior', () => {
  const hoy = new Date('2027-01-05T12:00:00Z');
  assert.equal(parseSpanishDate('28 de diciembre', hoy), '2026-12-28');
});

test('cambio de año: 5 de enero leído el 5 de enero es de este año', () => {
  const hoy = new Date('2027-01-05T12:00:00Z');
  assert.equal(parseSpanishDate('5 de enero', hoy), '2027-01-05');
});

test('cambio de año hacia adelante: 3 de enero escrito en diciembre es del año siguiente', () => {
  const hoy = new Date('2026-12-20T12:00:00Z');
  assert.equal(parseSpanishDate('3 de enero', hoy), '2027-01-03');
});

test('día inexistente sin año devuelve null (29 de febrero en año no bisiesto)', () => {
  const hoy = new Date('2027-03-01T12:00:00Z');
  assert.equal(parseSpanishDate('29 de febrero', hoy), null);
});

test('texto sin fecha o con número suelto devuelve null', () => {
  assert.equal(parseSpanishDate('Entrada libre'), null);
  assert.equal(parseSpanishDate('16.'), null);
});

test('normalizeHora', () => {
  assert.equal(normalizeHora('21 hs'), '21:00');
  assert.equal(normalizeHora('20:30'), '20:30');
  assert.equal(normalizeHora('17.00 hs'), '17:00');
  assert.equal(normalizeHora('25:00'), null);
  assert.equal(normalizeHora(''), null);
});
