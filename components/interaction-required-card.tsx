"use client";

import { Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Props = {
  message: string;
  onUpload: (file: File | null) => void;
  loading?: boolean;
};

export function InteractionRequiredCard({ message, onUpload, loading }: Props) {
  return (
    <Card className="border-amber-300">
      <CardHeader>
        <CardTitle className="text-amber-700">נדרשת פעולה להמשך</CardTitle>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input
          type="file"
          onChange={(event) => onUpload(event.target.files?.[0] ?? null)}
          disabled={loading}
        />
        <Button variant="secondary" className="w-full" disabled={loading}>
          <Upload className="mr-2 h-4 w-4" />
          {loading ? "מעלה קובץ..." : "העלה קובץ לדוגמה"}
        </Button>
      </CardContent>
    </Card>
  );
}
