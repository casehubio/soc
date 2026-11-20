import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

@customElement('casehub-speech')
export class CasehubSpeech extends LitElement {
  @property({ type: Number, attribute: 'sample-rate' }) sampleRate = 16000;
  @property({ type: Boolean, reflect: true }) disabled = false;

  @state() private _recording = false;
  @state() private _finishing = false;
  private _starting = false;
  private _audioFrameCount = 0;
  private _micStream: MediaStream | null = null;
  private _micProcessor: ScriptProcessorNode | null = null;
  private _micSource: MediaStreamAudioSourceNode | null = null;
  private _audioCtx: AudioContext | null = null;

  get recording() { return this._recording; }

  static override readonly styles = css`
    :host { display: inline-block; }
    button {
      padding: var(--pages-space-3, 12px) var(--pages-space-4, 16px);
      border-radius: 8px;
      border: 2px solid var(--pages-neutral-5, #555);
      background: var(--pages-surface, #2a2a3e);
      color: var(--pages-on-surface, #e0e0e0);
      font-size: 1rem;
      cursor: pointer;
      transition: all 0.2s;
    }
    button:disabled { opacity: 0.5; cursor: default; }
    button[aria-pressed="true"] {
      background: var(--pages-error, #d64);
      border-color: var(--pages-error, #d64);
      color: var(--pages-on-error, white);
      animation: pulse 1s infinite;
    }
    @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.7; } }
  `;

  override connectedCallback() {
    super.connectedCallback();
    this.setAttribute('role', 'group');
    this.setAttribute('aria-label', 'Speech controls');
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this._stopCapture();
  }

  protected override updated(changed: Map<string, unknown>) {
    if (changed.has('disabled') && this.disabled && this._recording && !this._finishing) {
      this._stopRecording();
    }
  }

  private async _startRecording() {
    if (this._recording || this._starting) return;
    this._starting = true;
    console.log('[MIC] startRecording called');
    try {
      if (!this._audioCtx) this._audioCtx = new AudioContext();
      console.log('[MIC] AudioContext sampleRate:', this._audioCtx.sampleRate);
      this._micStream = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: this.sampleRate, channelCount: 1, echoCancellation: true, noiseSuppression: true } as MediaTrackConstraints,
      });
      console.log('[MIC] getUserMedia succeeded');
      this._micSource = this._audioCtx.createMediaStreamSource(this._micStream);
      this._micProcessor = this._audioCtx.createScriptProcessor(4096, 1, 1);
      this._audioFrameCount = 0;
      this._micProcessor.onaudioprocess = (e: AudioProcessingEvent) => {
        if (!this._recording) return;
        const input = e.inputBuffer.getChannelData(0);
        const resampled = this._resampleTo16k(input, this._audioCtx!.sampleRate);
        const buf = new ArrayBuffer(resampled.length * 4);
        new Float32Array(buf).set(resampled);
        this.dispatchEvent(new CustomEvent('speech:audio', { detail: { buffer: buf }, bubbles: true, composed: true }));
        this._audioFrameCount++;
      };
      this._micSource.connect(this._micProcessor);
      this._micProcessor.connect(this._audioCtx.destination);
      console.log('[MIC] dispatching speech:start, sampleRate:', this.sampleRate);
      this.dispatchEvent(new CustomEvent('speech:start', { detail: { sampleRate: this.sampleRate }, bubbles: true, composed: true }));
      this._recording = true;
      console.log('[MIC] recording=true, mic active');
    } catch (e) {
      console.error('[casehub-speech] mic error:', e);
    } finally {
      this._starting = false;
    }
  }

  private _stopRecording() {
    if (!this._recording) return;
    console.log('[MIC] stopRecording called, frames sent:', this._audioFrameCount);
    this._finishing = true;
    this.requestUpdate();
    setTimeout(() => {
      this._recording = false;
      console.log('[MIC] sending STOP after 500ms delay, total frames:', this._audioFrameCount);
      this._stopCapture();
      this.dispatchEvent(new CustomEvent('speech:stop', { detail: {}, bubbles: true, composed: true }));
      this._finishing = false;
    }, 500);
  }

  private _stopCapture() {
    if (this._micProcessor) { this._micProcessor.disconnect(); this._micProcessor = null; }
    if (this._micSource) { this._micSource.disconnect(); this._micSource = null; }
    if (this._micStream) { this._micStream.getTracks().forEach(t => t.stop()); this._micStream = null; }
  }

  private _resampleTo16k(input: Float32Array, fromRate: number): Float32Array {
    if (fromRate === 16000) return input;
    const ratio = fromRate / 16000;
    const len = Math.round(input.length / ratio);
    const out = new Float32Array(len);
    for (let i = 0; i < len; i++) {
      out[i] = input[Math.round(i * ratio)]!;
    }
    return out;
  }

  private _handleClick = () => {
    if (this._finishing) return;
    if (this._recording) this._stopRecording(); else this._startRecording();
  };

  protected override render() {
    return html`
      <button
        @click=${this._handleClick}
        ?disabled=${this.disabled || this._finishing}
        aria-pressed=${this._recording ? 'true' : 'false'}>
        ${this._finishing ? 'Finishing...' : this._recording ? 'Recording...' : 'Mic'}
      </button>
    `;
  }
}
