import { format, formatDistanceToNowStrict } from "date-fns";

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  return format(new Date(value), "d MMM yyyy, HH:mm");
}

export function formatRelative(value: string | null | undefined): string {
  if (!value) return "never";
  return `${formatDistanceToNowStrict(new Date(value))} ago`;
}

export function formatXp(value: number): string {
  return `${value > 0 ? "+" : ""}${value.toLocaleString("en-GB")}`;
}
