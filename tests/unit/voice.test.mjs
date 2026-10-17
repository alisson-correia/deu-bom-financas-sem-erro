import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseVoice } from '../../src/lib/voice.js';

test('voz reconhece valor brasileiro, decimal e tipo sem salvar nada', () => {
  assert.equal(parseVoice('gastei 35,90 reais no mercado').amount, '35.9');
  assert.equal(parseVoice('recebi 12.50 reais').amount, '12.5');
  assert.equal(parseVoice('recebi 1.234,56 reais').amount, '1234.56');
  assert.equal(parseVoice('recebi 1.234 reais').amount, '1234');
  assert.equal(parseVoice('recebi 200 reais').type, 'income');
  assert.equal(parseVoice('comprei café').amount, '');
});
test('comandos de voz configuram claro, escuro e sistema', () => {
  assert.deepEqual(parseVoice('tema escuro'), { theme: 'dark' });
  assert.deepEqual(parseVoice('modo claro'), { theme: 'light' });
  assert.deepEqual(parseVoice('aparência automática'), { theme: 'system' });
});
