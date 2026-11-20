import { LitElement, type TemplateResult } from "lit";
export declare abstract class PagesContentElement<P extends object> extends LitElement {
    props: P | undefined;
    render(): TemplateResult;
    protected abstract renderContent(props: P): TemplateResult;
}
//# sourceMappingURL=PagesContentElement.d.ts.map