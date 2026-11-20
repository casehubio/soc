export interface SubmitButtonProps {
  readonly label: string;
  readonly style?: "primary" | "danger" | "secondary" | "ghost" | "outline";
  readonly disabled?: boolean;
}
