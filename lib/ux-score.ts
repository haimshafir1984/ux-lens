import type { AuditSignals } from "@/lib/audit/signals";
import type { VisionIssue } from "@/lib/vision-ui-analyzer";

export type UxScoreBreakdown = {
  overallScore: number;
  categories: {
    navigation: number;
    hierarchy: number;
    CTA: number;
    typography: number;
    spacing: number;
    contrast: number;
    mobile: number;
    performance: number;
  };
};

type UxScoreInput = {
  signals: AuditSignals;
  issues: VisionIssue[];
};

function clamp(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function computeUxScore(input: UxScoreInput): UxScoreBreakdown {
  const byType = new Map<string, VisionIssue[]>();
  for (const issue of input.issues) {
    const list = byType.get(issue.type) ?? [];
    list.push(issue);
    byType.set(issue.type, list);
  }

  const severityPenalty = (type: string) =>
    (byType.get(type) ?? []).reduce((acc, issue) => {
      if (issue.severity === "high") return acc + 16;
      if (issue.severity === "medium") return acc + 9;
      return acc + 4;
    }, 0);

  const navigation = clamp(
    100 - severityPenalty("Navigation complexity") - (input.signals.navItemCount > 9 ? 10 : 0)
  );
  const hierarchy = clamp(
    100 - severityPenalty("Visual hierarchy") - (input.signals.firstViewportTextDensity > 0.4 ? 8 : 0)
  );
  const cta = clamp(100 - severityPenalty("CTA clarity") - (!input.signals.primaryCtaAboveFold ? 14 : 0));
  const typography = clamp(
    100 - severityPenalty("Typography") - (input.signals.minFontSizePx < 14 ? 12 : 0)
  );
  const spacing = clamp(100 - severityPenalty("Spacing") - (input.signals.inconsistentButtonStyles ? 7 : 0));
  const contrast = clamp(
    100 - severityPenalty("Contrast") - Math.min(24, input.signals.contrastRiskElements * 5)
  );
  const mobile = clamp(
    100 -
      severityPenalty("Mobile usability") -
      (input.signals.mobileOverflowingElements > 0 ? 15 : 0) -
      Math.min(18, input.signals.tapTargetSmallCount * 3)
  );
  const performance = clamp(
    100 -
      (input.signals.estimatedLcpMs > 2500 ? 12 : 0) -
      (input.signals.estimatedTtiMs > 3000 ? 12 : 0) -
      (input.signals.estimatedCls > 0.1 ? 10 : 0)
  );

  const overallScore = clamp(
    navigation * 0.14 +
      hierarchy * 0.14 +
      cta * 0.14 +
      typography * 0.1 +
      spacing * 0.1 +
      contrast * 0.14 +
      mobile * 0.14 +
      performance * 0.1
  );

  return {
    overallScore,
    categories: {
      navigation,
      hierarchy,
      CTA: cta,
      typography,
      spacing,
      contrast,
      mobile,
      performance
    }
  };
}
