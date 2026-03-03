import type { AuditEvent, AuditState } from "@/lib/audit/types";

export const initialAuditState: AuditState = {
  step: "idle",
  context: { url: "" }
};

export function transitionAuditState(
  state: AuditState,
  event: AuditEvent
): AuditState {
  switch (event.type) {
    case "START":
      return {
        step: "scanning",
        context: { url: event.url }
      };
    case "SCAN_COMPLETE":
      return {
        step: "finalizing",
        context: { ...state.context, report: event.report }
      };
    case "REQUIRE_UPLOAD":
      return {
        step: "interactionRequired",
        context: { ...state.context, promptMessage: event.promptMessage }
      };
    case "UPLOAD_RECEIVED":
      return {
        step: "finalizing",
        context: { ...state.context, promptMessage: undefined }
      };
    case "FINALIZE_SUCCESS":
      return {
        step: "completed",
        context: { ...state.context, report: event.report }
      };
    case "FAIL":
      return {
        step: "failed",
        context: { ...state.context, promptMessage: event.message }
      };
    case "RESET":
      return initialAuditState;
    default:
      return state;
  }
}
