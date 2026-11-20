import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { DEFAULT_KIND_PALETTE } from '@casehubio/mosaic-graph-stencil-org';

@customElement('org-legend')
export class OrgLegend extends LitElement {
  @property({ type: Object }) kindColors: Record<string, { start: string; end: string }> = {};
  @property({ type: Boolean }) showDisposition = true;
  @property({ type: Boolean }) showAttestation = true;

  override createRenderRoot() { return this; }

  override connectedCallback() {
    super.connectedCallback();
    this.setAttribute('role', 'region');
    this.setAttribute('aria-label', 'Organization diagram legend');
  }

  private _resolvedKindColors(): Record<string, { start: string; end: string }> {
    return { ...DEFAULT_KIND_PALETTE, ...this.kindColors };
  }

  override render() {
    const kindMap = this._resolvedKindColors();
    const lineStyle = 'display:inline-block;width:36px;height:0;vertical-align:middle;margin-right:6px;';

    return html`
      <div style="background:#f7fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 14px;">
        <div style="font-size:11px;font-weight:700;color:#2d3748;margin-bottom:10px;">Legend</div>
        <div style="display:flex;flex-wrap:wrap;gap:20px;">

          <div>
            <div style="font-size:9px;font-weight:600;color:#4a5568;margin-bottom:6px;">Relationships</div>
            <div style="font-size:8.5px;color:#4a5568;margin-bottom:4px;">
              <span style="${lineStyle}border-top:2px solid #4a5568;"></span>SUPERVISES
            </div>
            <div style="font-size:8.5px;color:#c53030;margin-bottom:4px;">
              <span style="${lineStyle}border-top:1.5px dashed #c53030;"></span>ESCALATES_TO
            </div>
            <div style="font-size:8.5px;color:#2b6cb0;margin-bottom:4px;">
              <span style="${lineStyle}border-top:1.5px dashed #2b6cb0;"></span>BACKS_UP
            </div>
            <div style="font-size:8.5px;color:#2c7a7b;margin-bottom:4px;">
              <span style="${lineStyle}border-top:1.5px dotted #2c7a7b;"></span>DELEGATES_TO
            </div>
          </div>

          <div>
            <div style="font-size:9px;font-weight:600;color:#4a5568;margin-bottom:6px;">Unit Kinds</div>
            ${Object.entries(kindMap).map(([kind, colors]) => html`
              <div style="font-size:8.5px;color:#4a5568;margin-bottom:4px;display:flex;align-items:center;gap:6px;">
                <span style="display:inline-block;width:12px;height:12px;border-radius:2px;background:linear-gradient(90deg, ${colors.start}, ${colors.end});"></span>
                ${kind}
              </div>
            `)}
          </div>

          ${this.showDisposition ? html`
            <div>
              <div style="font-size:9px;font-weight:600;color:#4a5568;margin-bottom:6px;">Disposition Axes</div>
              <div style="display:flex;flex-wrap:wrap;gap:4px;">
                <span style="padding:1px 6px;border-radius:3px;font-size:7.5px;background:#fed7d7;color:#c53030;">autonomy</span>
                <span style="padding:1px 6px;border-radius:3px;font-size:7.5px;background:#fefcbf;color:#975a16;">rules</span>
                <span style="padding:1px 6px;border-radius:3px;font-size:7.5px;background:#c6f6d5;color:#276749;">social</span>
                <span style="padding:1px 6px;border-radius:3px;font-size:7.5px;background:#c6f6d5;color:#276749;">risk</span>
                <span style="padding:1px 6px;border-radius:3px;font-size:7.5px;background:#ebf8ff;color:#2b6cb0;">conflict</span>
              </div>
            </div>
          ` : ''}

          ${this.showAttestation ? html`
            <div>
              <div style="font-size:9px;font-weight:600;color:#4a5568;margin-bottom:6px;">Scope &amp; Attestation</div>
              <div style="font-size:8px;color:#718096;margin-bottom:3px;">
                <span style="padding:1px 6px;border-radius:3px;background:#e9d8fd;color:#553c9a;font-size:7.5px;">scoped supervision</span>
                — relationship constrained to a capability
              </div>
              <div style="font-size:8px;color:#718096;margin-bottom:3px;">
                <span style="padding:1px 6px;border-radius:3px;background:#e9d8fd;color:#553c9a;font-size:7.5px;">attestation grant</span>
                — supervisor can record COMPLIANT/VIOLATED signals
              </div>
              <div style="font-size:8px;color:#718096;">
                <span style="padding:1px 6px;border-radius:3px;background:#ebf8ff;color:#2b6cb0;border:0.8px solid #90cdf4;font-size:7.5px;">unit capability</span>
                — capability declared at the unit level
              </div>
            </div>
          ` : ''}

          <div>
            <div style="font-size:9px;font-weight:600;color:#4a5568;margin-bottom:6px;">Eidos Model Layers</div>
            <div style="font-size:8px;color:#718096;">AgentDescriptor (identity, disposition, capabilities) + OrganizationalUnit (hierarchy, relationships)</div>
          </div>
        </div>
      </div>
    `;
  }
}
