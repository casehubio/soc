import type { EditableText, Position, HighlightStyle, HighlightOptions, AnnotationOptions, EditSession, LineReader } from './types.js';
import { EditSessionActiveError } from './types.js';

export class McpToolAdapter {
  private _session: EditSession | null = null;
  private _reader: LineReader | null = null;

  constructor(private readonly editor: EditableText) {}

  async handleToolCall(name: string, params: Record<string, unknown>): Promise<unknown> {
    switch (name) {
      case 'editor_get_content':
        return { content: this.editor.getText() };

      case 'editor_set_content':
        this.editor.setContent(params.text as string);
        return { success: true };

      case 'editor_get_line': {
        const line = params.line as number;
        if (line < 0 || line >= this.editor.getLineCount()) {
          return { error: 'out_of_range', line, lineCount: this.editor.getLineCount() };
        }
        return { text: this.editor.getLine(line) };
      }

      case 'editor_find_text': {
        const matches = this.editor.findText(params.query as string);
        return { matches };
      }

      case 'editor_find_heading':
        return this._findHeading(params.heading as string);

      case 'editor_replace_range':
        this.editor.replaceRange(params.from as Position, params.to as Position, params.text as string);
        return { success: true };

      case 'editor_insert_text':
        this.editor.insertText(params.text as string);
        return { success: true };

      case 'editor_get_cursor':
        return this.editor.getCursor();

      case 'editor_set_cursor':
        this.editor.setCursor(params.line as number, params.col as number);
        return { success: true };

      case 'editor_highlight': {
        const id = this.editor.highlight(
          params.from as Position,
          params.to as Position,
          params.style as HighlightStyle | HighlightOptions | undefined,
        );
        return { id };
      }

      case 'editor_remove_highlight':
        this.editor.removeHighlight(params.id as string);
        return { success: true };

      case 'editor_annotate': {
        const opts: AnnotationOptions = { type: params.type as AnnotationOptions['type'] };
        if (params.text) opts.text = params.text as string;
        if (params.style) opts.style = params.style as Record<string, string>;
        const id = this.editor.addAnnotation(params.anchor as Position, opts);
        return { id };
      }

      case 'editor_remove_annotation':
        this.editor.removeAnnotation(params.id as string);
        return { success: true };

      case 'editor_clear_overlays':
        this.editor.clearHighlights();
        this.editor.clearAnnotations();
        return { success: true };

      case 'editor_highlight_sentence': {
        const id = this.editor.highlightSentence(
          params.pos as Position | undefined,
          params.style as HighlightStyle | HighlightOptions | undefined,
        );
        return { id };
      }

      case 'editor_highlight_text': {
        const ids = this.editor.highlightText(
          params.query as string,
          params.style as HighlightStyle | HighlightOptions | undefined,
        );
        return { ids };
      }

      case 'editor_highlight_line': {
        const id = this.editor.highlightLine(
          params.line as number,
          params.count as number | undefined,
          params.style as HighlightStyle | HighlightOptions | undefined,
        );
        return { id };
      }

      case 'editor_get_highlight_text': {
        const text = this.editor.getHighlightText(params.id as string);
        if (text === undefined) return { error: 'not_found', id: params.id };
        return { text };
      }

      case 'editor_list_highlights':
        return { highlights: this.editor.listHighlights() };

      case 'editor_clear_highlight_group':
        this.editor.clearHighlightGroup(params.group as string);
        return { success: true };

      case 'editor_reader_start': {
        if (this._reader) this._reader.dispose();
        this._reader = this.editor.createReader(params.style as HighlightStyle | HighlightOptions | undefined);
        return { position: this._reader.position() };
      }

      case 'editor_reader_move': {
        if (!this._reader) return { error: 'no_reader' };
        this._reader.moveTo(params.pos as Position);
        return { position: this._reader.position() };
      }

      case 'editor_reader_advance': {
        if (!this._reader) return { error: 'no_reader' };
        this._reader.advance();
        return { position: this._reader.position() };
      }

      case 'editor_reader_advance_line': {
        if (!this._reader) return { error: 'no_reader' };
        this._reader.advanceLine();
        return { position: this._reader.position() };
      }

      case 'editor_reader_stop': {
        if (this._reader) {
          this._reader.dispose();
          this._reader = null;
        }
        return { success: true };
      }

      case 'editor_begin_session':
        return this._beginSession(params.owner as string);

      case 'editor_end_session':
        return this._endSession();

      default:
        return { error: 'unknown_tool', tool: name };
    }
  }

  private _findHeading(heading: string): unknown {
    const text = this.editor.getText();
    const lines = text.split('\n');
    const positions: Position[] = [];

    for (let i = 0; i < lines.length; i++) {
      const match = lines[i]!.match(/^(#{1,6})\s+(.+)$/);
      if (match && match[2]!.trim() === heading) {
        positions.push({ line: i, col: 0 });
      }
    }

    if (positions.length === 0) {
      return { error: 'no_match', heading };
    }
    if (positions.length > 1) {
      return { error: 'multiple_matches', heading, positions };
    }

    let endLine = lines.length;
    const level = lines[positions[0]!.line]!.match(/^(#{1,6})/)![1]!.length;
    for (let i = positions[0]!.line + 1; i < lines.length; i++) {
      const m = lines[i]!.match(/^(#{1,6})\s/);
      if (m && m[1]!.length <= level) {
        endLine = i;
        break;
      }
    }

    return {
      position: positions[0],
      endPosition: { line: endLine, col: 0 },
      level,
    };
  }

  private _beginSession(owner: string): unknown {
    try {
      this._session = this.editor.beginEditSession(owner);
      return {
        owner: this._session.owner,
        mode: this._session.mode,
        startedAt: this._session.startedAt,
      };
    } catch (e) {
      if (e instanceof EditSessionActiveError) {
        return { error: 'session_active', owner: e.owner, since: e.startedAt };
      }
      throw e;
    }
  }

  private _endSession(): unknown {
    if (this._session) {
      this.editor.endEditSession(this._session);
      this._session = null;
    }
    return { success: true };
  }
}
