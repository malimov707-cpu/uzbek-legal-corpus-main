import { FormEvent, useEffect, useRef, useState } from "react";
import { AvatarCanvas } from "../components/avatar/AvatarCanvas";
import type { AvatarMode } from "../components/avatar/AvatarModel";
import { askConferenceSpeaker, type ConferenceReply } from "../services/conferenceApi";
import type { AvatarSpeech } from "../hooks/useAvatarSpeech";

const labels: Record<AvatarMode, string> = {
  idle: "Suhbatga tayyor",
  listening: "Sizni tinglayapman",
  thinking: "Javob tayyorlayapman",
  speaking: "Javob bermoqda",
};

export function ConferencePage() {
  const [mode, setMode] = useState<AvatarMode>("idle");
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState<ConferenceReply | null>(null);
  const [speech, setSpeech] = useState<AvatarSpeech | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [typing, setTyping] = useState(false);
  const requestRef = useRef<AbortController | null>(null);
  const speechId = useRef(0);

  useEffect(() => () => requestRef.current?.abort(), []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const question = message.trim();
    if (!question || busy) return;
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setBusy(true);
    setError("");
    setReply(null);
    setSpeech(null);
    setTyping(false);
    setMode("thinking");
    setMessage("");
    try {
      const result = await askConferenceSpeaker(question, controller.signal);
      setReply(result);
      setSpeech({ id: ++speechId.current, reply: result });
      setMode("speaking");
    } catch (reason) {
      if (!controller.signal.aborted) {
        setError(reason instanceof Error ? reason.message : "Kutilmagan xatolik yuz berdi.");
        setMode("idle");
      }
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  };

  const stopSpeaking = () => {
    setSpeech(null);
    setMode("idle");
  };

  const handleSpeechEnd = () => {
    setSpeech(null);
    setMode("idle");
  };

  return <main className="conference-page">
    <div className="conference-glow conference-glow--left" />
    <div className="conference-glow conference-glow--right" />
    <header className="conference-header">
      <a className="conference-brand" href="/" aria-label="Huquqiy yordam bosh sahifasi">
        <span className="brand-emblem">A</span>
        <span><strong>ADOLAT AI</strong><small>HUQUQIY YORDAMCHI</small></span>
      </a>
      <div className="conference-session"><span className={`session-dot session-dot--${mode}`} />{labels[mode]}</div>
    </header>

    <section className="speaker-stage" aria-label="Adolat AI huquqiy yordamchisi">
      <div className="stage-kicker"><span>01 / HUQUQIY SUN’IY INTELLEKT</span><span>LIVE SESSION</span></div>
      <div className="stage-orbit stage-orbit--one" />
      <div className="stage-orbit stage-orbit--two" />
      <div className="stage-floor" />
      <AvatarCanvas
        mode={mode}
        isUserTyping={typing}
        speech={speech}
        onSpeechStart={() => setMode("speaking")}
        onSpeechEnd={handleSpeechEnd}
      />
      <div className="speaker-caption">
        <span>HUQUQIY AI YORDAMCHISI</span>
        <h1>Adolat</h1>
        <p>O‘zbekiston qonunchiligi bo‘yicha ishonchli yo‘lboshchi</p>
      </div>
      {reply && <aside className="answer-card" aria-live="polite">
        <div className="answer-card__label"><span />
          {reply.retrieval_mode === "local-corpus-search" ? "KORPUSDAN TOPILDI" : "JAVOB"}
        </div>
        <p>{reply.answer}</p>
        {reply.citations.length > 0 && <div className="answer-sources">
          {reply.citations.map((citation, index) => <span key={`${citation.code}-${citation.article}-${index}`}>
            {citation.code_title}, {citation.article}
          </span>)}
        </div>}
        <button type="button" className="answer-stop" onClick={stopSpeaking}>Ovozni to‘xtatish</button>
      </aside>}
    </section>

    <footer className="conference-footer">
      <div className="prompt-hint">QONUNCHILIK BO‘YICHA SAVOLINGIZNI BERING</div>
      {error && <p className="conference-error" role="alert">{error}</p>}
      <form className="speaker-composer" onSubmit={submit}>
        <span className="composer-mark" aria-hidden="true">✳</span>
        <input
          value={message}
          maxLength={2000}
          placeholder="Masalan: Mehnat ta’tili qanday hisoblanadi?"
          aria-label="Huquqiy savolingiz"
          disabled={busy}
          onFocus={() => { setTyping(true); if (!busy) setMode("listening"); }}
          onBlur={() => { setTyping(false); if (!busy && mode === "listening") setMode("idle"); }}
          onChange={(event) => {
            setMessage(event.target.value);
            if (!busy) setMode(event.target.value.trim() ? "listening" : (typing ? "listening" : "idle"));
          }}
        />
        <button className="speaker-submit" type="submit" disabled={busy || !message.trim()} aria-label="Savolni yuborish">
          {busy ? <span className="submit-spinner" /> : <span aria-hidden="true">↑</span>}
        </button>
      </form>
      <div className="conference-disclaimer">AI javoblari huquqiy maslahat emas. Amaldagi qonun matnini <a href="https://lex.uz" target="_blank" rel="noreferrer">lex.uz</a>dan tekshiring.</div>
    </footer>
  </main>;
}
