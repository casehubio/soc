import '@casehubio/pages-viz';

declare module '@casehubio/pages-viz' {
  interface FieldSchema {
    oneOf?: readonly { readonly const: string; readonly title: string }[];
  }
}
