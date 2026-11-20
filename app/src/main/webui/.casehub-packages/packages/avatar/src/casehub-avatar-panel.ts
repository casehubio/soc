import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { AvatarWsController } from './avatar-ws-controller.js';
import type { AvatarWsHost } from './avatar-ws-controller.js';
import type { ConversationTurn, PlaybackItem } from './types.js';
import './casehub-avatar.js';
import './casehub-transcript.js';
import './casehub-speech.js';

interface VoiceOption { value: string; label: string; mos: string; warn?: string; broken?: string }
interface VoiceGroup { label: string; voices: VoiceOption[] }

const VOICE_GROUPS: VoiceGroup[] = [
  { label: 'Piper VITS — MOS ~3.7', voices: [
    { value: 'lessac-medium', label: 'Lessac medium', mos: '3.6' },
    { value: 'lessac-high', label: 'Lessac high', mos: '3.9' },
    { value: 'amy', label: 'Amy (US)', mos: '3.7' },
    { value: 'ryan', label: 'Ryan (US)', mos: '3.8' },
    { value: 'jenny', label: 'Jenny (UK)', mos: '3.7' },
  ]},
  { label: 'Piper via sherpa — MOS ~3.7', voices: [
    { value: 'sherpa:lessac-medium', label: 'Sherpa: Lessac', mos: '3.6' },
    { value: 'sherpa:amy', label: 'Sherpa: Amy', mos: '3.7' },
    { value: 'sherpa:ryan', label: 'Sherpa: Ryan', mos: '3.8' },
    { value: 'sherpa:jenny', label: 'Sherpa: Jenny', mos: '3.7' },
  ]},
  { label: 'Kokoro v1.0 — American English ♀ — MOS ~4.3', voices: [
    { value: 'kokoro:af_alloy', label: 'Alloy', mos: '4.2' },
    { value: 'kokoro:af_aoede', label: 'Aoede', mos: '4.2' },
    { value: 'kokoro:af_bella', label: 'Bella', mos: '4.2' },
    { value: 'kokoro:af_heart', label: 'Heart ★', mos: '4.5' },
    { value: 'kokoro:af_jessica', label: 'Jessica', mos: '4.3' },
    { value: 'kokoro:af_kore', label: 'Kore', mos: '4.3' },
    { value: 'kokoro:af_nicole', label: 'Nicole', mos: '4.3' },
    { value: 'kokoro:af_nova', label: 'Nova', mos: '4.3' },
    { value: 'kokoro:af_river', label: 'River', mos: '4.2' },
    { value: 'kokoro:af_sarah', label: 'Sarah', mos: '4.3' },
    { value: 'kokoro:af_sky', label: 'Sky', mos: '4.3' },
  ]},
  { label: 'Kokoro v1.0 — American English ♂ — MOS ~4.2', voices: [
    { value: 'kokoro:am_adam', label: 'Adam', mos: '4.2' },
    { value: 'kokoro:am_echo', label: 'Echo', mos: '4.1' },
    { value: 'kokoro:am_eric', label: 'Eric', mos: '4.2' },
    { value: 'kokoro:am_fenrir', label: 'Fenrir', mos: '4.1' },
    { value: 'kokoro:am_liam', label: 'Liam', mos: '4.2' },
    { value: 'kokoro:am_michael', label: 'Michael', mos: '4.1' },
    { value: 'kokoro:am_onyx', label: 'Onyx', mos: '4.2' },
    { value: 'kokoro:am_puck', label: 'Puck', mos: '4.1' },
    { value: 'kokoro:am_santa', label: 'Santa', mos: '4.0' },
  ]},
  { label: 'Kokoro v1.0 — British English — MOS ~4.2', voices: [
    { value: 'kokoro:bf_alice', label: 'Alice ♀', mos: '4.2' },
    { value: 'kokoro:bf_emma', label: 'Emma ♀', mos: '4.3' },
    { value: 'kokoro:bf_isabella', label: 'Isabella ♀', mos: '4.2' },
    { value: 'kokoro:bf_lily', label: 'Lily ♀', mos: '4.2' },
    { value: 'kokoro:bm_daniel', label: 'Daniel ♂', mos: '4.1' },
    { value: 'kokoro:bm_fable', label: 'Fable ♂', mos: '4.1' },
    { value: 'kokoro:bm_george', label: 'George ♂', mos: '4.2' },
    { value: 'kokoro:bm_lewis', label: 'Lewis ♂', mos: '4.1' },
  ]},
  { label: 'Kokoro v1.0 — Other Languages — MOS ~4.0', voices: [
    { value: 'kokoro:ef_dora', label: 'Dora (ES) ♀', mos: '4.0' },
    { value: 'kokoro:em_alex', label: 'Alex (ES) ♂', mos: '4.0' },
    { value: 'kokoro:ff_siwis', label: 'Siwis (FR) ♀', mos: '4.0' },
    { value: 'kokoro:hf_alpha', label: 'Alpha (HI) ♀', mos: '3.9' },
    { value: 'kokoro:hf_beta', label: 'Beta (HI) ♀', mos: '3.9' },
    { value: 'kokoro:hm_omega', label: 'Omega (HI) ♂', mos: '3.9' },
    { value: 'kokoro:hm_psi', label: 'Psi (HI) ♂', mos: '3.9' },
    { value: 'kokoro:if_sara', label: 'Sara (IT) ♀', mos: '4.0' },
    { value: 'kokoro:im_nicola', label: 'Nicola (IT) ♂', mos: '4.0' },
    { value: 'kokoro:jf_alpha', label: 'Alpha (JA) ♀', mos: '4.0' },
    { value: 'kokoro:jf_gongitsune', label: 'Gongitsune (JA) ♀', mos: '4.0' },
    { value: 'kokoro:jf_nezumi', label: 'Nezumi (JA) ♀', mos: '4.0' },
    { value: 'kokoro:jf_tebukuro', label: 'Tebukuro (JA) ♀', mos: '4.0' },
    { value: 'kokoro:jm_kumo', label: 'Kumo (JA) ♂', mos: '4.0' },
    { value: 'kokoro:pf_dora', label: 'Dora (PT) ♀', mos: '4.0' },
    { value: 'kokoro:pm_alex', label: 'Alex (PT) ♂', mos: '4.0' },
    { value: 'kokoro:pm_santa', label: 'Santa (PT) ♂', mos: '3.9' },
    { value: 'kokoro:zf_xiaobei', label: 'Xiaobei (ZH) ♀', mos: '4.0' },
    { value: 'kokoro:zf_xiaoni', label: 'Xiaoni (ZH) ♀', mos: '4.0' },
    { value: 'kokoro:zf_xiaoxiao', label: 'Xiaoxiao (ZH) ♀', mos: '4.0' },
    { value: 'kokoro:zf_xiaoyi', label: 'Xiaoyi (ZH) ♀', mos: '4.0' },
    { value: 'kokoro:zm_yunjian', label: 'Yunjian (ZH) ♂', mos: '4.0' },
    { value: 'kokoro:zm_yunxi', label: 'Yunxi (ZH) ♂', mos: '4.0' },
    { value: 'kokoro:zm_yunxia', label: 'Yunxia (ZH) ♂', mos: '4.0' },
    { value: 'kokoro:zm_yunyang', label: 'Yunyang (ZH) ♂', mos: '4.0' },
  ]},
];

@customElement('casehub-avatar-panel')
export class CasehubAvatarPanel extends LitElement implements AvatarWsHost {
  @property({ type: String, attribute: 'ws-url' }) wsUrl = '/ws/avatar';
  @property({ type: String, attribute: 'avatar-url' }) avatarUrl = '';
  @property({ type: String }) body: 'M' | 'F' = 'F';
  @property({ type: String }) mood = 'neutral';
  @property({ type: String, attribute: 'llm-model' }) llmModel = 'claude-haiku-4-5@20251001';
  @property({ type: String, attribute: 'tts-model' }) ttsModel = 'kokoro:af_heart';
  @property({ type: Number }) speed = 0.9;

  @state() turns: ConversationTurn[] = [];
  @state() avatarAudioQueue: PlaybackItem[] = [];
  @state() connectionState: 'connecting' | 'connected' | 'disconnected' = 'disconnected';
  @state() private _statusText = 'Connecting...';
  @state() private _modelStatus: Record<string, string> = {};
  @state() private _timingText = '';
  @state() private _showAvatar = true;

  private _controller!: AvatarWsController;
  private _modelPollTimer: ReturnType<typeof setInterval> | null = null;

  static override readonly styles = css`
    :host { display: flex; flex-direction: column; height: 100%; background: #1a1a2e; color: #e0e0e0; font-family: system-ui, sans-serif; }
    .controls { display: flex; gap: 1rem; padding: 0.5rem 1rem; border-bottom: 1px solid #333; align-items: center; justify-content: center; flex-wrap: wrap; }
    .controls label { font-size: 0.8rem; color: #999; }
    .controls select { padding: 0.3rem 0.5rem; border-radius: 6px; border: 1px solid #555; background: #2a2a3e; color: #e0e0e0; font-size: 0.85rem; }
    casehub-avatar { flex: 0 0 300px; border-bottom: 1px solid #333; }
    casehub-avatar[hidden] { display: none; }
    .model-status { padding: 0.25rem 1rem; font-size: 0.75rem; color: #999; text-align: center; }
    .model-status .downloading { color: #d9a547; }
    .model-status .ready { color: #4a9; }
    .status { padding: 0.25rem 1rem; font-size: 0.75rem; color: #666; text-align: center; }
    .timing { margin: 0.5rem 1rem; padding: 0.5rem 0.75rem; background: #1e1e32; border-radius: 8px; font-size: 0.8rem; font-family: monospace; }
    .timing:empty { display: none; }
    casehub-transcript { flex: 1; overflow-y: auto; }
    .input-bar { display: flex; gap: 0.5rem; padding: 1rem; border-top: 1px solid #333; }
    .input-bar input { flex: 1; padding: 0.75rem; border-radius: 8px; border: 1px solid #555; background: #2a2a3e; color: #e0e0e0; font-size: 1rem; }
    .input-bar input:focus { outline: none; border-color: #2d5aa0; }
    .input-bar button { padding: 0.75rem 1.5rem; border-radius: 8px; border: none; background: #2d5aa0; color: white; font-size: 1rem; cursor: pointer; }
    .input-bar button:disabled { opacity: 0.5; cursor: default; }
  `;

  override connectedCallback() {
    super.connectedCallback();
    this.setAttribute('role', 'region');
    this.setAttribute('aria-label', 'Avatar conversation');
    this._controller = new AvatarWsController(this, { wsUrl: this.wsUrl });
    this._pollModelStatus();
    this._modelPollTimer = setInterval(() => this._pollModelStatus(), 2000);
    this.addEventListener('avatar:timing', ((e: CustomEvent) => {
      const t = e.detail;
      this._timingText = `Cleanup: ${t.cleanupMs}ms | LLM: ${t.llmMs}ms | TTS: ${t.ttsMs}ms | Total: ${t.totalMs}ms`;
    }) as EventListener);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    if (this._modelPollTimer) { clearInterval(this._modelPollTimer); this._modelPollTimer = null; }
  }

  private async _pollModelStatus() {
    try {
      const resp = await fetch('/api/models/status');
      if (resp.ok) {
        this._modelStatus = await resp.json() as Record<string, string>;
        const total = Object.keys(this._modelStatus).length;
        const ready = Object.values(this._modelStatus).filter(s => s === 'READY').length;
        if (ready === total && this._modelPollTimer) {
          clearInterval(this._modelPollTimer);
          this._modelPollTimer = null;
        }
      }
    } catch { /* ignore fetch errors */ }
  }

  protected override updated(changed: Map<string, unknown>) {
    if (changed.has('connectionState')) {
      console.log('[PANEL] connectionState changed:', changed.get('connectionState'), '->', this.connectionState);
      switch (this.connectionState) {
        case 'connecting': this._statusText = 'Connecting...'; break;
        case 'connected':
          this._statusText = 'Connected';
          break;
        case 'disconnected':
          this._statusText = 'Disconnected — reconnecting...';
          break;
      }
    }
  }

  private _onSpeechStart(e: CustomEvent) {
    console.log('[PANEL] speech:start received, sending WS start');
    this._controller.sendStart({
      sampleRate: e.detail.sampleRate,
      llmModel: this.llmModel,
      ttsModel: this.ttsModel,
    });
    this._statusText = 'Listening...';
  }

  private _audioSendCount = 0;
  private _onSpeechAudio(e: CustomEvent) {
    this._audioSendCount++;
    if (this._audioSendCount <= 3 || this._audioSendCount % 50 === 0) {
      console.log('[PANEL] speech:audio #' + this._audioSendCount + ', buffer:', e.detail.buffer.byteLength, 'bytes');
    }
    this._controller.sendAudio(e.detail.buffer);
  }

  private _onSpeechStop() {
    console.log('[PANEL] speech:stop received, total audio frames sent:', this._audioSendCount);
    this._audioSendCount = 0;
    this._controller.sendStop();
    this._statusText = 'Processing speech...';
  }

  // Matches original sendText (line 193-201)
  private _onSendText() {
    const input = this.shadowRoot!.querySelector<HTMLInputElement>('#msg');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    this._controller.sendText(text, { llmModel: this.llmModel, ttsModel: this.ttsModel });
    input.value = '';
    this._statusText = 'Processing...';
  }

  private _onInputKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') this._onSendText();
  }

  private _onLlmChange(e: Event) { this.llmModel = (e.target as HTMLSelectElement).value; }
  private _onTtsChange(e: Event) { this.ttsModel = (e.target as HTMLSelectElement).value; }
  private _onSpeedChange(e: Event) { this.speed = parseFloat((e.target as HTMLInputElement).value); }

  private get _modelStatusHtml() {
    const entries = Object.entries(this._modelStatus);
    if (entries.length === 0) return '';
    const ready = entries.filter(([, s]) => s === 'READY').length;
    const downloading = entries.filter(([, s]) => s === 'DOWNLOADING').length;
    if (ready === entries.length) return html`<span class="ready">All voice models ready</span>`;
    if (downloading > 0) return html`<span class="downloading">Downloading voice models: ${ready}/${entries.length} ready</span>`;
    return '';
  }

  protected override render() {
    const connected = this.connectionState === 'connected';
    return html`
      <div class="controls">
        <label>LLM: <select @change=${this._onLlmChange}>
          <option value="claude-haiku-4-5@20251001" ?selected=${this.llmModel === 'claude-haiku-4-5@20251001'}>Haiku 4.5 (fast)</option>
          <option value="claude-sonnet-4@20250514" ?selected=${this.llmModel === 'claude-sonnet-4@20250514'}>Sonnet 4</option>
          <option value="claude-opus-4@20250514" ?selected=${this.llmModel === 'claude-opus-4@20250514'}>Opus 4</option>
        </select></label>
        <label>Voice: <select @change=${this._onTtsChange}>
          ${VOICE_GROUPS.map(g => html`
            <optgroup label=${g.label}>
              ${g.voices.map(v => {
                const st = this._modelStatus[v.value];
                const stUnavail = st != null && st !== 'READY';
                const disabled = !!v.broken || stUnavail;
                const suffix = v.broken ? ` (${v.broken})` : st === 'DOWNLOADING' ? ' (downloading...)' : st === 'ERROR' ? ' (error)' : '';
                const warn = v.warn ? ` ⚠️ ${v.warn}` : '';
                return html`<option value=${v.value}
                  ?selected=${this.ttsModel === v.value}
                  ?disabled=${disabled}
                  >${v.label} ▸ MOS ${v.mos}${warn}${suffix}</option>`;
              })}
            </optgroup>
          `)}
        </select></label>
        <label>Speed: <input type="range" min="0.6" max="1.4" step="0.05" .value=${String(this.speed)}
          @input=${this._onSpeedChange} style="width:80px;vertical-align:middle">
          <span>${this.speed}x</span></label>
      </div>
      <casehub-avatar
        ?hidden=${!this._showAvatar}
        avatar-url=${this.avatarUrl}
        body=${this.body}
        mood=${this.mood}
        .speed=${this.speed}
        .audioQueue=${this.avatarAudioQueue}
        @avatar:queue-accepted=${() => { this.avatarAudioQueue = []; }}>
      </casehub-avatar>
      <div class="model-status">${this._modelStatusHtml}</div>
      <div class="status">${this._statusText}</div>
      <div class="timing">${this._timingText}</div>
      <casehub-transcript .turns=${this.turns}></casehub-transcript>
      <div class="input-bar">
        <casehub-speech
          ?disabled=${!connected}
          @speech:start=${this._onSpeechStart}
          @speech:audio=${this._onSpeechAudio}
          @speech:stop=${this._onSpeechStop}>
        </casehub-speech>
        <input id="msg" type="text" placeholder="Type a message..."
          autocomplete="off" ?disabled=${!connected}
          @keydown=${this._onInputKeydown}>
        <button ?disabled=${!connected} @click=${this._onSendText}>Send</button>
      </div>
    `;
  }
}
