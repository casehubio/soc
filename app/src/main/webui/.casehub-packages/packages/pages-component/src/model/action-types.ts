export interface AlertProps {
  readonly severity: "info" | "warning" | "error" | "success";
  readonly content: string;
  readonly dismissible?: boolean;
}

export interface ActionButtonProps {
  readonly label: string;
  readonly url: string;
  readonly method?: "POST" | "PUT" | "DELETE";
  readonly body?: Record<string, unknown>;
  readonly headers?: Record<string, string>;
  readonly confirm?: string;
  readonly style?: "primary" | "danger" | "secondary" | "ghost" | "outline";
  readonly disabled?: boolean;
  readonly disabledWhen?: string;
  readonly onSuccess?: { readonly refresh?: string[]; readonly message?: string };
  readonly onError?: { readonly message?: string };
}

export interface SubmitConfig {
  readonly url: string;
  readonly method?: "POST" | "PUT";
  readonly fieldName?: string;
  readonly clearOnSubmit?: boolean;
  readonly onSuccess?: { readonly refresh?: string[]; readonly message?: string };
  readonly onError?: { readonly message?: string };
}

export interface ActionRequest {
  readonly url: string;
  readonly method?: "POST" | "PUT" | "DELETE";
  readonly body?: Record<string, unknown>;
  readonly headers?: Record<string, string>;
}

export interface ActionCallbacks {
  readonly onSuccess?: { readonly refresh?: string[]; readonly message?: string };
  readonly onError?: { readonly message?: string };
}

export interface ActionResult {
  readonly success: boolean;
  readonly status?: number;
  readonly error?: string;
}

export interface PagesActionRequestDetail {
  readonly config: ActionRequest & { readonly callbacks: ActionCallbacks };
  readonly resolve: (result: ActionResult) => void;
}
