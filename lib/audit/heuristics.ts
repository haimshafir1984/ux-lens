export const auditHeuristics = [
  {
    id: "contrast",
    title: "Contrast & Accessibility",
    objective:
      "Measure text/background contrast ratio and flag low-contrast segments."
  },
  {
    id: "visualHierarchy",
    title: "Visual Hierarchy",
    objective: "Detect whether the main CTA appears above-the-fold and prominent."
  },
  {
    id: "responsive",
    title: "Mobile Responsiveness",
    objective:
      "Compare layout consistency between desktop and mobile screenshots."
  },
  {
    id: "typography",
    title: "Typography",
    objective:
      "Evaluate minimum readable font sizes and heading/body contrast in scale."
  },
  {
    id: "forms",
    title: "Forms & Empty States",
    objective:
      "Detect form entry points, file upload controls, and missing helper text."
  },
  {
    id: "navigation",
    title: "Navigation Clarity",
    objective:
      "Evaluate menu discoverability, CTA path clarity, and whether users can easily recover their location."
  },
  {
    id: "consistency",
    title: "Visual Consistency",
    objective:
      "Check consistency of button styles, spacing rhythm, iconography, and section alignment."
  },
  {
    id: "feedback",
    title: "System Feedback & States",
    objective:
      "Detect loading, success, error, and empty states; ensure users receive clear feedback after actions."
  },
  {
    id: "performance",
    title: "Perceived Performance",
    objective:
      "Flag UX risks related to heavy above-the-fold content, large visual shifts, and delayed first interaction."
  },
  {
    id: "trust",
    title: "Trust & Credibility Signals",
    objective:
      "Detect visible trust indicators like contact details, policy links, social proof, and secure checkout cues."
  },
  {
    id: "conversion",
    title: "Conversion Friction",
    objective:
      "Identify points that slow the user journey to conversion such as CTA conflict, distracting sections, or unclear next steps."
  },
  {
    id: "content",
    title: "Content Clarity",
    objective:
      "Verify clear headings, scannable sections, concise copy, and semantic structure for fast comprehension."
  },
  {
    id: "errorPrevention",
    title: "Error Prevention",
    objective:
      "Check whether forms and flows prevent mistakes with constraints, hints, and safe defaults."
  },
  {
    id: "mobileTouch",
    title: "Touch Ergonomics",
    objective:
      "Evaluate tap target size, spacing, and mobile gesture comfort in key interactive zones."
  }
] as const;
