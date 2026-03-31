"use client";

import { Card, CardContent } from "@/components/ui/card";

export default function AdminOverviewPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-100">Admin overview</h1>
        <p className="mt-1 text-sm text-zinc-500">
          This admin summary page was restored as a placeholder so the navigation stays functional.
        </p>
      </div>

      <Card>
        <CardContent className="space-y-3 pt-6 text-sm text-zinc-400">
          <p>Available admin tools currently restored on this VPS:</p>
          <p>- Pending YouTube upload approvals</p>
          <p>- Google client management</p>
          <p>- YouTube connection management</p>
          <p>- Video profile management</p>
        </CardContent>
      </Card>
    </div>
  );
}
