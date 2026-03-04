"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import {
  createYouTubeConnection,
  getGoogleAuthorizeUrl,
  listYouTubeConnections,
  disconnectYouTubeConnection,
} from "@/lib/api";
import { toast } from "sonner";
import { Plus, Unplug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({
    clientId: "",
    clientSecret: "",
    label: "",
  });

  const { data: connections = [], isLoading } = useQuery({
    queryKey: ["youtube-connections"],
    queryFn: listYouTubeConnections,
  });

  // Handle OAuth callback: oauth=success&connectionId= or oauth=error&message=
  useEffect(() => {
    const oauth = searchParams.get("oauth");
    const connectionId = searchParams.get("connectionId");
    const message = searchParams.get("message");

    if (oauth === "success") {
      toast.success("YouTube berhasil terhubung");
      queryClient.invalidateQueries({ queryKey: ["youtube-connections"] });
    } else if (oauth === "error") {
      toast.error(decodeURIComponent(message || "OAuth gagal"));
    }

    if (oauth) {
      window.history.replaceState({}, "", "/settings");
    }
  }, [searchParams, queryClient]);

  async function handleCreateConnection(e: React.FormEvent) {
    e.preventDefault();
    if (!createForm.clientId || !createForm.clientSecret || !createForm.label) {
      toast.error("Isi Client ID, Client Secret, dan Label");
      return;
    }
    setCreating(true);
    try {
      const { id } = await createYouTubeConnection(createForm);
      const successRedirect =
        typeof window !== "undefined"
          ? `${window.location.origin}/settings`
          : "http://localhost:3002/settings";
      const { url } = await getGoogleAuthorizeUrl(id, successRedirect);
      window.location.href = url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal membuat connection");
      setCreating(false);
    }
  }

  async function handleDisconnect(id: string) {
    setDisconnectingId(id);
    try {
      await disconnectYouTubeConnection(id);
      toast.success("Connection diputus");
      queryClient.invalidateQueries({ queryKey: ["youtube-connections"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memutus");
    } finally {
      setDisconnectingId(null);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-100">
          Channel YouTube
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Buat connection dengan Google Client ID & Secret. Setelah OAuth,
          Anda bisa mengunggah video ke YouTube dari halaman Upload.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <h2 className="mb-4 text-lg font-medium text-zinc-200">
            Tambah connection baru
          </h2>
          <form
            onSubmit={handleCreateConnection}
            className="flex flex-col gap-4 sm:max-w-md"
          >
            <div className="space-y-2">
              <Label htmlFor="label">Label (nama channel)</Label>
              <Input
                id="label"
                placeholder="My Channel"
                value={createForm.label}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, label: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientId">Google Client ID</Label>
              <Input
                id="clientId"
                type="text"
                placeholder="xxx.apps.googleusercontent.com"
                value={createForm.clientId}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, clientId: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientSecret">Google Client Secret</Label>
              <Input
                id="clientSecret"
                type="password"
                placeholder="••••••••"
                value={createForm.clientSecret}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, clientSecret: e.target.value }))
                }
              />
            </div>
            <Button type="submit" disabled={creating}>
              <Plus className="mr-2 h-4 w-4" />
              {creating ? "Mengalihkan ke Google..." : "Buat & connect via Google"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-4 text-lg font-medium text-zinc-200">
          Daftar connection
        </h2>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : connections.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-zinc-500">
              Belum ada connection. Isi form di atas untuk menambahkan.
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-3">
            {connections.map((conn) => (
              <li key={conn.id}>
                <Card className="flex flex-wrap items-center justify-between gap-4 p-4">
                  <div>
                    <p className="font-medium text-zinc-200">{conn.label}</p>
                    <p className="text-sm text-zinc-500">
                      {conn.connected ? (
                        <span className="text-emerald-400">Terhubung</span>
                      ) : (
                        <span className="text-amber-400">Belum OAuth</span>
                      )}
                      {conn.expiresAt && (
                        <> · Expires: {conn.expiresAt}</>
                      )}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                    onClick={() => handleDisconnect(conn.id)}
                    disabled={disconnectingId === conn.id}
                  >
                    <Unplug className="mr-2 h-4 w-4" />
                    {disconnectingId === conn.id ? "Memutus..." : "Putus"}
                  </Button>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
