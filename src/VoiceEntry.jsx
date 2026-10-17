import { useEffect, useRef, useState } from 'react';
import { useTheme } from './lib/preferences';
import { parseVoice } from './lib/voice';

export function VoiceEntry({ onDraft, disabled = false }) {
  const { setMode } = useTheme();
  const [listening, setListening] = useState(false);
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);
  const recognition = useRef(null);
  const supported = Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  useEffect(() => () => { if (recognition.current) { recognition.current.onresult = null; recognition.current.onend = null; recognition.current.onerror = null; recognition.current.abort(); } }, []);
  const start = () => {
    if (disabled || recognition.current) return;
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const session = new Recognition();
    session.lang = 'pt-BR';
    session.continuous = false;
    session.interimResults = false;
    recognition.current = session;
    setMessage('Ouvindo… Fale um lançamento ou diga “tema escuro”, “tema claro” ou “tema do sistema”.');
    setFailed(false);
    session.onresult = (event) => {
      const text = event.results[0][0].transcript;
      const result = parseVoice(text);
      if (result.theme) { setMode(result.theme); setMessage(`Tema alterado por voz: ${text}`); }
      else { onDraft(result); setMessage('Confira o lançamento reconhecido antes de salvar.'); }
    };
    session.onerror = (event) => {
      setFailed(true);
      setMessage(event.error === 'not-allowed' || event.error === 'service-not-allowed'
        ? 'O acesso ao microfone foi negado. Autorize-o nas configurações do navegador ou use os botões de lançamento.'
        : 'Não foi possível reconhecer a fala. Tente novamente ou preencha manualmente.');
    };
    session.onend = () => { setListening(false); recognition.current = null; };
    try { setListening(true); session.start(); }
    catch { recognition.current = null; setListening(false); setFailed(true); setMessage('Microfone indisponível. Preencha o lançamento manualmente.'); }
  };
  return <section className="voice-entry" aria-label="Assistente por voz">
    <div><h2>Use sua voz</h2><p>Lance por voz ou altere o tema. Você revisa antes de salvar.</p></div>
    <button disabled={disabled || !supported} onClick={() => listening ? recognition.current?.stop() : start()} aria-pressed={listening}>
      {listening ? 'Parar microfone' : 'Falar com o app'}
    </button>
    {!supported && <p>Seu navegador não oferece reconhecimento de voz. Os lançamentos e o tema continuam disponíveis pelos botões.</p>}
    <details><summary>Como usar a voz</summary><p>Diga “gastei 35,90 reais no mercado”, “tema claro”, “tema escuro” ou “tema do sistema”. Se algum campo não for reconhecido, preencha-o manualmente.</p><small>O reconhecimento é fornecido pelo navegador e pode enviar áudio ao serviço dele. O microfone só é ativado ao tocar no botão.</small></details>
    {message && <p role={failed ? 'alert' : 'status'}>{message}</p>}
  </section>;
}
