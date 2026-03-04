"use client";

import { Globe, ScanSearch } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onStart: () => void;
  loading?: boolean;
};

export function UrlInputStage({ value, onChange, onStart, loading }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl">
          <Globe className="h-5 w-5 text-blue-400" />
          ביקורת UI/UX אוטומטית
        </CardTitle>
        <CardDescription>
          הזן כתובת אתר ציבורית. UX-Lens תצלם מסכים רספונסיביים ותבדוק עקרונות שימושיות מרכזיים.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          placeholder="https://example.co.il"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <Button size="lg" className="w-full" onClick={onStart} disabled={loading || !value}>
          <ScanSearch className="mr-2 h-4 w-4" />
          {loading ? "מבצע סריקה לאתר..." : "התחל ביקורת"}
        </Button>
      </CardContent>
    </Card>
  );
}
