
import { GoogleGenAI, Modality } from "@google/genai";
import { VoiceName } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const translateText = async (text: string, sourceLang: string, targetLang: string) => {
  if (!text.trim()) return "";
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Translate the following text from ${sourceLang} to ${targetLang}. Only provide the translated text, nothing else:\n\n${text}`,
  });

  return response.text || "";
};

export const generateSpeech = async (text: string, voice: VoiceName = 'Kore') => {
  if (!text.trim()) return null;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: `Say clearly in the appropriate language: ${text}` }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: voice },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  return base64Audio || null;
};
