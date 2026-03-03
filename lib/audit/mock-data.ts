import type { AuditReport } from "@/lib/audit/types";

export const mockAuditReport: AuditReport = {
  targetUrl: "https://example.com",
  generatedAt: new Date().toISOString(),
  score: 79,
  requiresFileUpload: true,
  annotations: [
    { id: "a1", label: "ניגודיות חלשה בכותרת המשנה הראשית", severity: "critical", x: 28, y: 26 },
    { id: "a2", label: "כפתור הפעולה הראשי בולט היטב", severity: "good", x: 42, y: 39 },
    { id: "a3", label: "שדה טופס ללא טקסט עזר", severity: "warning", x: 72, y: 66 },
    { id: "a4", label: "ניווט משני לא ברור במסך קטן", severity: "warning", x: 16, y: 15 },
    { id: "a5", label: "חסר מצב טעינה ברור בשליחת טופס", severity: "critical", x: 73, y: 70 }
  ],
  findings: [
    {
      id: "f1",
      category: "contrast",
      title: "ניגודיות כותרת המשנה נמוכה מתקן WCAG AA",
      detail: "זוהה יחס ניגודיות 3.2:1 מול הרקע. מומלץ להעלות לפחות ל-4.5:1.",
      severity: "critical"
    },
    {
      id: "f2",
      category: "visualHierarchy",
      title: "כפתור הפעולה הראשי גלוי מעל קו הקיפול",
      detail: "כפתור ה-CTA המרכזי משתמש בצבע בולט ובמרווחים נכונים.",
      severity: "good"
    },
    {
      id: "f3",
      category: "typography",
      title: "טקסט גוף במובייל נראה קטן מדי",
      detail: "מספר פסקאות יורדות מתחת לגודל המקביל ל-15px במסכים קטנים.",
      severity: "warning"
    },
    {
      id: "f4",
      category: "forms",
      title: "שדה העלאה דורש קובץ לדוגמה להמשך",
      detail: "התהליך נעצר בשדה העלאת קובץ חובה.",
      severity: "warning"
    },
    {
      id: "f5",
      category: "navigation",
      title: "מסלול הניווט למשתמש חדש אינו חד מספיק",
      detail: "אין הבחנה ברורה בין ניווט ראשי למשני והדבר מקשה על מציאת הפעולה המרכזית.",
      severity: "warning"
    },
    {
      id: "f6",
      category: "consistency",
      title: "חוסר עקביות במרווחים בין סקשנים",
      detail: "זוהו מרווחים לא אחידים בין בלוקים דומים, מה שפוגע בתחושת הסדר והאיכות.",
      severity: "warning"
    },
    {
      id: "f7",
      category: "feedback",
      title: "אין מצב טעינה בולט בזמן שליחת טופס",
      detail: "המשתמש לא מקבל אינדיקציה ברורה שהפעולה מתבצעת, מה שעלול לגרום ללחיצות כפולות.",
      severity: "critical"
    },
    {
      id: "f8",
      category: "performance",
      title: "ביצועים נתפסים חלשים מעל קו הקיפול",
      detail: "אלמנטים כבדים באזור העליון פוגעים בתחושת המהירות ומעכבים אינטראקציה ראשונה.",
      severity: "warning"
    },
    {
      id: "f9",
      category: "trust",
      title: "חסרים סימני אמון באזורי המרה",
      detail: "ליד טופס ההמרה לא מוצגים פרטי יצירת קשר/מדיניות פרטיות בצורה בולטת.",
      severity: "warning"
    }
  ],
  checks: [
    {
      id: "check-1",
      category: "accessibility",
      label: "קיים קישור דילוג לתוכן",
      detail: "לא נמצא Skip Link לעמוד.",
      status: "warning"
    },
    {
      id: "check-2",
      category: "contrast",
      label: "ניגודיות טקסט עומדת ברף מומלץ",
      detail: "נמצאו אזורי ניגודיות בסיכון.",
      status: "critical"
    },
    {
      id: "check-3",
      category: "visualHierarchy",
      label: "CTA ראשי מופיע מעל קו הקיפול",
      detail: "כפתור הפעולה מופיע במקום בולט.",
      status: "pass"
    },
    {
      id: "check-4",
      category: "forms",
      label: "לשדות בטופס יש תוויות ברורות",
      detail: "חלק מהשדות ללא label מלא.",
      status: "warning"
    },
    {
      id: "check-5",
      category: "feedback",
      label: "קיים מצב טעינה ברור בפעולות",
      detail: "לא זוהתה אינדיקציית טעינה עקבית.",
      status: "critical"
    },
    {
      id: "check-6",
      category: "performance",
      label: "LCP משוער ברמה טובה",
      detail: "LCP משוער גבוה מהמומלץ.",
      status: "warning"
    }
  ],
  checksSummary: {
    total: 32,
    passed: 21,
    warnings: 8,
    critical: 3
  }
};
