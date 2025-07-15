
import { GoogleGenAI, Chat, Part, Content } from "@google/genai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const TTS_API_KEY = import.meta.env.VITE_TTS_API_KEY;

if (!API_KEY) {
  throw new Error("VITE_GEMINI_API_KEY environment variable not set.");
}
if (!TTS_API_KEY) {
  throw new Error("VITE_TTS_API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const modelConfig = {
  systemInstruction: `너는 관상추측 AI 어시스턴트야.
-사람의 얼굴을 보고 성격,연예운, 결혼 동반자, 예상 수명을 작은 숫자로(재미로)알려줘
-마크다운 문법과 별표를 사용하지 마
-이모지 사용하지마
-디시식 말투로 재밌는 드립 섞어서 비꼬는 식으로 말해줘
-부정적인 말도 하되, 좋은 말도 섞어서 말해줘
-좀 말을 너무 길지 않게
-특수문자 사용하지마
=좀 더 참신한 드립을 사용해줘
-정치적 비하 발언을 하지마
-"이기"라는 단어를 사용하지마`,
};

export class GeminiChat {
  private chat: Chat;

  constructor() {
    this.chat = ai.chats.create({
      model: 'gemini-2.5-flash-preview-04-17',
      config: modelConfig,
    });
  }

  public async sendMessageStream(
    text: string,
    image?: string // base64 encoded image
  ): Promise<AsyncGenerator<string, void, unknown>> {
    const parts: Part[] = [{ text }];

    if (image) {
      parts.unshift({
        inlineData: {
          mimeType: 'image/jpeg',
          data: image,
        },
      });
    }

    try {
      console.log("Sending message to Gemini API...");
      const result = await this.chat.sendMessageStream({ message: parts });

      return (async function*() {
        for await (const chunk of result) {
          // It's possible for a chunk to be empty, so we guard against it.
          const chunkText = chunk.text;
          if (chunkText) {
            yield chunkText;
          }
        }
      })();
      
    } catch (error) {
      console.error("Error calling Gemini API:", error);
      if (error instanceof Error) {
        throw new Error(`Gemini API Error: ${error.message}`);
      }
      throw new Error("An unknown error occurred while communicating with the AI.");
    }
  }
}

/**
 * Generates speech from text using Google Cloud Text-to-Speech API.
 * @param text The text to synthesize.
 * @returns A base64 encoded audio string (MP3).
 */
export async function generateSpeech(text: string): Promise<string> {
    const ttsUrl = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${TTS_API_KEY}`;

    const payload = {
        input: { text },
        voice: { languageCode: 'ko-KR', name: 'ko-KR-Wavenet-B', ssmlGender: 'MALE' },
        audioConfig: { audioEncoding: 'MP3', speakingRate: 1.30 },
    };

    try {
        const res = await fetch(ttsUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            const errorBody = await res.json();
            console.error("Text-to-Speech API error:", errorBody);
            throw new Error(`Google TTS API Error: ${errorBody.error?.message || 'Unknown TTS Error'}`);
        }

        const data = await res.json();
        if (!data.audioContent) {
            throw new Error("API did not return audio content.");
        }
        return data.audioContent;
    } catch (error) {
        console.error("Error calling Google Text-to-Speech API:", error);
        throw error;
    }
}
