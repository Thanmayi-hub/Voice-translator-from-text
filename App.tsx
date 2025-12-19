
import React, { useState, useRef, useCallback } from 'react';
import { LanguageSelector } from './components/LanguageSelector';
import { translateText, generateSpeech } from './services/geminiService';
import { decodeBase64, decodeAudioData } from './services/audioUtils';
import { LANGUAGES, VOICES } from './constants';
import { VoiceName } from './types';

const App: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [sourceLang, setSourceLang] = useState('en');
  const [targetLang, setTargetLang] = useState('es');
  const [selectedVoice, setSelectedVoice] = useState<VoiceName>('Kore');
  const [isTranslating, setIsTranslating] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const handleTranslate = async () => {
    if (!inputText.trim()) return;
    setIsTranslating(true);
    setError(null);
    try {
      const src = LANGUAGES.find(l => l.code === sourceLang)?.name || 'English';
      const tgt = LANGUAGES.find(l => l.code === targetLang)?.name || 'Spanish';
      const result = await translateText(inputText, src, tgt);
      setTranslatedText(result);
    } catch (err: any) {
      setError("Translation failed. Please try again.");
      console.error(err);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSpeak = async (textToSpeak: string) => {
    if (!textToSpeak.trim()) return;
    
    setIsSpeaking(true);
    setError(null);

    try {
      // Stop any existing playback
      if (currentSourceRef.current) {
        currentSourceRef.current.stop();
      }

      // Initialize AudioContext on user interaction
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      } else if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      const base64Audio = await generateSpeech(textToSpeak, selectedVoice);
      if (!base64Audio) throw new Error("Audio generation failed");

      const binaryData = decodeBase64(base64Audio);
      const audioBuffer = await decodeAudioData(binaryData, audioContextRef.current);

      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      
      source.onended = () => setIsSpeaking(false);
      currentSourceRef.current = source;
      source.start();

    } catch (err: any) {
      setError("Speech generation failed.");
      setIsSpeaking(false);
      console.error(err);
    }
  };

  const swapLanguages = () => {
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
    setInputText(translatedText);
    setTranslatedText(inputText);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-4xl space-y-8">
        {/* Header */}
        <header className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 bg-blue-600 rounded-2xl shadow-lg mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">LinguoVoice</h1>
          <p className="text-slate-500 font-medium">Ultra-realistic AI translation and text-to-voice</p>
        </header>

        {/* Translation Card */}
        <main className="glass border border-white rounded-[2.5rem] shadow-2xl p-6 md:p-10 space-y-8">
          
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-6 items-end">
            <LanguageSelector label="From" value={sourceLang} onChange={setSourceLang} />
            
            <button 
              onClick={swapLanguages}
              className="mb-1 p-3 rounded-full hover:bg-slate-100 transition-colors text-slate-400 hover:text-blue-500 group"
              title="Swap Languages"
            >
              <svg className="w-6 h-6 transform group-active:rotate-180 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </button>

            <LanguageSelector label="To" value={targetLang} onChange={setTargetLang} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Input Side */}
            <div className="flex flex-col space-y-4">
              <div className="relative">
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Enter text to translate..."
                  className="w-full h-48 p-6 rounded-3xl border-2 border-slate-100 focus:border-blue-400 bg-slate-50/50 focus:bg-white resize-none transition-all outline-none text-lg text-slate-700 font-light placeholder:text-slate-400"
                />
                <div className="absolute bottom-4 right-4 text-xs font-bold text-slate-300 uppercase tracking-widest">
                  {inputText.length} chars
                </div>
              </div>
              <button
                onClick={handleTranslate}
                disabled={isTranslating || !inputText}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold rounded-2xl shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2 group"
              >
                {isTranslating ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Translating...
                  </>
                ) : (
                  <>
                    Translate
                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </>
                )}
              </button>
            </div>

            {/* Output Side */}
            <div className="flex flex-col space-y-4">
              <div className="relative">
                <div className={`w-full h-48 p-6 rounded-3xl border-2 border-slate-100 bg-white shadow-inner overflow-y-auto text-lg text-slate-800 font-medium ${!translatedText && 'text-slate-300'}`}>
                  {translatedText || "Translation will appear here..."}
                </div>
                {translatedText && (
                  <button
                    onClick={() => handleSpeak(translatedText)}
                    disabled={isSpeaking}
                    className="absolute bottom-4 right-4 p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors disabled:opacity-50"
                  >
                    {isSpeaking ? (
                      <div className="flex gap-1">
                        <span className="w-1 h-4 bg-blue-500 animate-bounce"></span>
                        <span className="w-1 h-4 bg-blue-500 animate-bounce [animation-delay:-0.15s]"></span>
                        <span className="w-1 h-4 bg-blue-500 animate-bounce [animation-delay:-0.3s]"></span>
                      </div>
                    ) : (
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.983 5.983 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.984 3.984 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                )}
              </div>

              {/* Voice Selection */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Voice Tone</label>
                <div className="flex flex-wrap gap-2">
                  {VOICES.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVoice(v.id as VoiceName)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                        selectedVoice === v.id 
                          ? 'bg-blue-600 text-white shadow-md' 
                          : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                      }`}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}
        </main>

        <footer className="text-center text-slate-400 text-sm">
          Powered by Gemini 3 Flash & 2.5 Flash TTS
        </footer>
      </div>
    </div>
  );
};

export default App;
