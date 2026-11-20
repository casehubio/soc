declare module 'talkinghead' {
  export class TalkingHead {
    constructor(container: Element, config: Record<string, unknown>);
    showAvatar(config: Record<string, unknown>): Promise<void>;
    speakAudio(data: { audio: AudioBuffer; visemes: string[]; vtimes: number[]; vdurations: number[] }): Promise<void>;
    get isSpeaking(): boolean;
  }
}
