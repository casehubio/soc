## D1: Cross-component communication

**Choice:** Hybrid — URL holds selected incident ID (deep-linkable), components react via pages events for instant updates
**Alternatives:**
- Pages dataset selection binding only — fast but no deep-linking or browser back/forward
- URL-driven only — deep-linkable but requires page-level re-render on selection change
**Rationale:** Deep-linking is important for sharing investigation state between analysts. Pages events give instant in-page reactivity without round-tripping through the URL.
**Trade-offs:** Slightly more wiring — must keep URL and event state in sync.
**Exploration:** quick
**Status:** captured

## D2: Detail pane layout

**Choice:** Split + tabs hybrid — timeline always visible at top of detail pane, channels/ATT&CK/IOC in tabs below
**Alternatives:**
- Vertical stack — all detail components visible at once, scrollable. Simple but long scroll.
- Tabbed detail — all components in tabs. Compact but hides the timeline, the primary investigation tool.
**Rationale:** Timeline is the spine of an investigation — always visible. ATT&CK mapping and IOC details are reference lookups consulted as needed. Keeps the view compact.
**Trade-offs:** ATT&CK and IOC panels are one click away instead of always visible.
**Exploration:** quick
**Status:** captured

## D3: New SOC component location

**Choice:** Inline in SOC webui as self-contained Lit elements, structured for easy promotion to blocks-ui
**Alternatives:**
- Build in blocks-ui from the start — reusable immediately but requires cross-repo work and contribution process
**Rationale:** Epic spec D2 says "build in SOC first, propose extraction to blocks-ui after validation." All three components (attck-matrix, ioc-panel, alert-heatmap) are promotable. Built with blocks-ui conventions (DataSourceMixin, typed properties, pages-event emission, no SOC-specific imports) so promotion is a file move + package.json creation.
**Trade-offs:** Not reusable by other security apps until promoted.
**Depends on:** Epic D2
**Exploration:** quick
**Status:** captured

## D4: Case-explorer entity registration

**Choice:** Use the default response reader — shape the incidents endpoint to return `{ entities: [...], totalCount: N }`
**Alternatives:**
- Custom response reader — return arbitrary domain shape and provide a mapping function
**Rationale:** Endpoint is SOC-internal, no external API contract. Conforming to the expected shape means zero custom reader code.
**Trade-offs:** Endpoint shape is dictated by the component convention rather than pure domain modelling.
**Exploration:** quick
**Status:** captured
