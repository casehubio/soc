import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { PlaybackItem, VisemeFrame } from './types.js';

interface VisemeMesh {
  mesh: { morphTargetInfluences: number[] };
  dict: Record<string, number>;
}

@customElement('casehub-avatar')
export class CasehubAvatar extends LitElement {
  @property({ type: String, attribute: 'avatar-url' }) avatarUrl = '';
  @property({ type: String }) body: 'M' | 'F' = 'F';
  @property({ type: String }) mood = 'neutral';
  @property({ type: String, attribute: 'camera-view' }) cameraView: 'head' | 'upper' | 'full' = 'head';
  @property({ type: Boolean, attribute: 'camera-rotate' }) cameraRotate = true;
  @property({ type: Boolean, attribute: 'camera-zoom' }) cameraZoom = true;
  @property({ type: Boolean, attribute: 'camera-pan' }) cameraPan = true;
  @property({ type: String, attribute: 'lipsync-lang' }) lipsyncLang = 'en';
  @property({ type: Number }) speed = 0.9;
  @property({ type: Array }) audioQueue: PlaybackItem[] = [];

  @state() private _loading = true;
  @state() private _speaking = false;

  private _head: any = null;
  private _processingQueue = false;
  private _audioCtx: AudioContext | null = null;
  private _visemeMeshes: VisemeMesh[] | null = null;

  private static readonly ATTACK = 0.35;
  private static readonly DECAY = 0.12;

  get loading() { return this._loading; }
  get speaking() { return this._speaking; }

  static override readonly styles = css`
    :host {
      display: block;
      position: relative;
      background: var(--pages-surface, #111);
    }
    .avatar-container {
      width: 100%;
      height: 100%;
      min-height: 200px;
    }
  `;

  override connectedCallback() {
    super.connectedCallback();
    this.setAttribute('role', 'img');
    this.setAttribute('aria-label', '3D avatar');
    this.setAttribute('aria-busy', 'true');
    this._initTalkingHead();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this._head = null;
    this._visemeMeshes = null;
  }

  private _internalQueue: PlaybackItem[] = [];

  protected override updated(changed: Map<string, unknown>) {
    if (changed.has('audioQueue') && this.audioQueue.length > 0) {
      this._internalQueue.push(...this.audioQueue);
      this.dispatchEvent(new CustomEvent('avatar:queue-accepted', { bubbles: true, composed: true }));
      if (!this._processingQueue) this._processQueue();
    }
  }

  private async _initTalkingHead() {
    try {
      const { TalkingHead } = await import('talkinghead');
      const container = this.shadowRoot!.querySelector('.avatar-container');
      if (!container) return;
      this._head = new TalkingHead(container, {
        ttsEndpoint: null,
        lipsyncModules: [this.lipsyncLang],
        cameraView: this.cameraView,
        cameraRotateEnable: this.cameraRotate,
        cameraZoomEnable: this.cameraZoom,
        cameraPanEnable: this.cameraPan,
      });
      await this._head.showAvatar({
        url: this.avatarUrl,
        body: this.body,
        avatarMood: this.mood,
        lipsyncLang: this.lipsyncLang,
      });
      this._loading = false;
      this.setAttribute('aria-busy', 'false');
    } catch (e) {
      console.error('[casehub-avatar] init error:', e);
      this._loading = false;
      this.setAttribute('aria-busy', 'false');
    }
  }

  private _discoverVisemeMeshes(): VisemeMesh[] | null {
    if (this._visemeMeshes) return this._visemeMeshes;
    if (!this._head) { console.log('[AVATAR] no head instance'); return null; }
    const scene = this._head.scene ?? this._head._scene ?? this._head.model ?? this._head._model;
    if (!scene?.traverse) {
      const keys = Object.keys(this._head).filter(k => !k.startsWith('_'));
      const privKeys = Object.keys(this._head).filter(k => k.startsWith('_') && (k.includes('scene') || k.includes('model') || k.includes('mesh') || k.includes('avatar')));
      console.log('[AVATAR] no scene found. Public keys:', keys.join(', '), '| Relevant private:', privKeys.join(', '));
      return null;
    }
    const meshes: VisemeMesh[] = [];
    scene.traverse((o: any) => {
      if (o.morphTargetDictionary) {
        const dict: Record<string, number> = {};
        for (const k in o.morphTargetDictionary) {
          if (k.startsWith('viseme_')) dict[k] = o.morphTargetDictionary[k];
        }
        if (Object.keys(dict).length > 0) meshes.push({ mesh: o, dict });
      }
    });
    if (meshes.length > 0) {
      console.log('[AVATAR] discovered', meshes.length, 'viseme meshes with', Object.keys(meshes[0]!.dict).length, 'targets each');
      this._visemeMeshes = meshes;
    } else {
      console.log('[AVATAR] scene found but no viseme morph targets');
    }
    return this._visemeMeshes;
  }

  private async _processQueue() {
    if (this._processingQueue) return;
    this._processingQueue = true;
    while (this._internalQueue.length > 0) {
      const item = this._internalQueue.shift()!;
      this._speaking = true;
      await this._playItem(item);
    }
    this._speaking = false;
    this._processingQueue = false;
  }

  private _playItem(item: PlaybackItem): Promise<void> {
    return new Promise((resolve) => {
      if (!this._audioCtx) this._audioCtx = new AudioContext();
      const ctx = this._audioCtx;
      const source = ctx.createBufferSource();
      source.buffer = item.audio;
      source.playbackRate.value = this.speed;
      source.connect(ctx.destination);
      source.start();

      const meshes = item.timeline ? this._discoverVisemeMeshes() : null;
      if (!meshes) {
        source.onended = () => resolve();
        return;
      }

      const timeline = item.timeline!;
      const startTime = ctx.currentTime;
      const rate = this.speed;
      let animating = true;

      const animate = () => {
        if (!animating) return;
        const elapsed = (ctx.currentTime - startTime) * 1000 * rate;
        let activeViseme = 'sil';
        let activeWeight = 0;
        for (let i = timeline.length - 1; i >= 0; i--) {
          if (elapsed >= timeline[i]!.startMs && elapsed < timeline[i]!.endMs) {
            activeViseme = timeline[i]!.viseme;
            activeWeight = timeline[i]!.weight ?? 1.0;
            break;
          }
        }
        for (const m of meshes) {
          for (const k in m.dict) {
            const idx = m.dict[k]!;
            const target = k === `viseme_${activeViseme}` ? activeWeight : 0;
            const current = m.mesh.morphTargetInfluences[idx] ?? 0;
            const lerp = target > current ? CasehubAvatar.ATTACK : CasehubAvatar.DECAY;
            m.mesh.morphTargetInfluences[idx] = current + (target - current) * lerp;
          }
        }
        requestAnimationFrame(animate);
      };

      source.onended = () => {
        setTimeout(() => {
          animating = false;
          for (const m of meshes) {
            for (const k in m.dict) m.mesh.morphTargetInfluences[m.dict[k]!] = 0;
          }
          resolve();
        }, 300);
      };
      requestAnimationFrame(animate);
    });
  }

  protected override render() {
    return html`<div class="avatar-container"></div>`;
  }
}
