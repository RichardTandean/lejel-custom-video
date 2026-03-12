"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  listGoogleClients,
  createGoogleClient,
  deleteGoogleClient,
  setGoogleClientEnabled,
  createYouTubeConnection,
  getGoogleAuthorizeUrl,
  listYouTubeConnections,
  disconnectYouTubeConnection,
} from "@/lib/api";
import { useAuth } from "@/context/auth-context";
import { toast } from "sonner";
import { Plus, Trash2, Unplug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";

export default function SettingsPage() {
  const t = useTranslations("settings");
  const { isAdmin } = useAuth();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [addingClient, setAddingClient] = useState(false);
  const [creating, setCreating] = useState(false);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [deletingClientId, setDeletingClientId] = useState<string | null>(null);
  const [togglingClientId, setTogglingClientId] = useState<string | null>(null);
  const [clientForm, setClientForm] = useState({
    clientId: "",
    clientSecret: "",
    label: "",
  });
  const [connectionForm, setConnectionForm] = useState({
    googleClientId: "",
    label: "",
  });

  const { data: clients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ["google-clients"],
    queryFn: listGoogleClients,
    enabled: isAdmin,
  });

  const { data: connections = [], isLoading: connectionsLoading } = useQuery({
    queryKey: ["youtube-connections"],
    queryFn: listYouTubeConnections,
    enabled: isAdmin,
  });

  useEffect(() => {
    const oauth = searchParams.get("oauth");
    const message = searchParams.get("message");

    if (oauth === "success") {
      toast.success(t("toastOAuthSuccess"));
      queryClient.invalidateQueries({ queryKey: ["youtube-connections"] });
    } else if (oauth === "error") {
      toast.error(decodeURIComponent(message || t("toastOAuthError")));
    }

    if (oauth) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [searchParams, queryClient, t]);

  async function handleAddClient(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin) return;
    if (!clientForm.clientId?.trim() || !clientForm.clientSecret?.trim()) {
      toast.error(t("toastFillFields"));
      return;
    }
    setAddingClient(true);
    try {
      await createGoogleClient({
        clientId: clientForm.clientId.trim(),
        clientSecret: clientForm.clientSecret.trim(),
        label: clientForm.label.trim() || undefined,
      });
      toast.success(t("toastClientAdded"));
      setClientForm({ clientId: "", clientSecret: "", label: "" });
      queryClient.invalidateQueries({ queryKey: ["google-clients"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("toastAddClientError"));
    } finally {
      setAddingClient(false);
    }
  }

  async function handleDeleteClient(id: string) {
    if (!isAdmin) return;
    setDeletingClientId(id);
    try {
      await deleteGoogleClient(id);
      toast.success(t("toastClientDeleted"));
      queryClient.invalidateQueries({ queryKey: ["google-clients"] });
      queryClient.invalidateQueries({ queryKey: ["youtube-connections"] });
      if (connectionForm.googleClientId === id) {
        setConnectionForm((f) => ({ ...f, googleClientId: "" }));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("toastDeleteClientError"));
    } finally {
      setDeletingClientId(null);
    }
  }

  async function handleToggleClientEnabled(id: string, enabled: boolean) {
    if (!isAdmin) return;
    setTogglingClientId(id);
    try {
      await setGoogleClientEnabled(id, enabled);
      queryClient.invalidateQueries({ queryKey: ["google-clients"] });
      queryClient.invalidateQueries({ queryKey: ["youtube-connections"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("toastAddClientError"));
    } finally {
      setTogglingClientId(null);
    }
  }

  async function handleCreateConnection(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin) return;
    if (!connectionForm.googleClientId) {
      toast.error(t("toastSelectClient"));
      return;
    }
    setCreating(true);
    try {
      const { id } = await createYouTubeConnection({
        googleClientId: connectionForm.googleClientId,
        label: connectionForm.label.trim() || undefined,
      });
      const successRedirect =
        typeof window !== "undefined"
          ? `${window.location.origin}${window.location.pathname}`
          : "";
      const { url } = await getGoogleAuthorizeUrl(id, successRedirect);
      window.location.href = url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("toastCreateError"));
      setCreating(false);
    }
  }

  async function handleDisconnect(id: string) {
    if (!isAdmin) return;
    setDisconnectingId(id);
    try {
      await disconnectYouTubeConnection(id);
      toast.success(t("toastDisconnectSuccess"));
      queryClient.invalidateQueries({ queryKey: ["youtube-connections"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("toastDisconnectError"));
    } finally {
      setDisconnectingId(null);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-100">{t("title")}</h1>
        <p className="mt-1 text-sm text-zinc-500">{t("description")}</p>
      </div>

      {!isAdmin && (
        <Card>
          <CardContent className="py-8 text-center text-zinc-500">
            Admin only.
          </CardContent>
        </Card>
      )}

      {/* Google clients: save Client ID + Secret */}
      {isAdmin && (
      <Card>
        <CardContent className="pt-6">
          <h2 className="mb-1 text-lg font-medium text-zinc-200">
            {t("googleClients")}
          </h2>
          <p className="mb-4 text-sm text-zinc-500">
            {t("googleClientsDescription")}
          </p>
          <form
            onSubmit={handleAddClient}
            className="mb-6 flex flex-col gap-4 sm:max-w-md"
          >
            <div className="space-y-2">
              <Label htmlFor="clientLabel">{t("label")}</Label>
              <Input
                id="clientLabel"
                placeholder={t("labelPlaceholder")}
                value={clientForm.label}
                onChange={(e) =>
                  setClientForm((f) => ({ ...f, label: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientId">{t("clientId")}</Label>
              <Input
                id="clientId"
                type="text"
                placeholder={t("clientIdPlaceholder")}
                value={clientForm.clientId}
                onChange={(e) =>
                  setClientForm((f) => ({ ...f, clientId: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientSecret">{t("clientSecret")}</Label>
              <Input
                id="clientSecret"
                type="password"
                placeholder="••••••••"
                value={clientForm.clientSecret}
                onChange={(e) =>
                  setClientForm((f) => ({ ...f, clientSecret: e.target.value }))
                }
              />
            </div>
            <Button type="submit" disabled={addingClient}>
              <Plus className="mr-2 h-4 w-4" />
              {addingClient ? t("submitting") : t("addClientSubmit")}
            </Button>
          </form>
          {clientsLoading ? (
            <div className="flex justify-center py-4">
              <Spinner />
            </div>
          ) : clients.length === 0 ? (
            <p className="text-sm text-zinc-500">{t("emptyClients")}</p>
          ) : (
            <ul className="space-y-2">
              {clients.map((client) => (
                <li
                  key={client.id}
                  className="flex items-center justify-between rounded-lg border border-zinc-700 bg-zinc-900/50 px-4 py-3"
                >
                  <div className="flex min-w-0 flex-col">
                    <span className="font-medium text-zinc-200">
                      {client.label || t("labelPlaceholder")}
                    </span>
                    <span className="text-xs text-zinc-500">
                      {client.enabled ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleToggleClientEnabled(client.id, !client.enabled)
                      }
                      disabled={togglingClientId === client.id}
                    >
                      {client.enabled ? "Disable" : "Enable"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-zinc-400 hover:text-red-400"
                      onClick={() => handleDeleteClient(client.id)}
                      disabled={deletingClientId === client.id}
                    >
                      <Trash2 className="mr-1 h-4 w-4" />
                      {t("deleteClient")}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      )}

      {/* Add connection: choose client + OAuth */}
      {isAdmin && (
      <Card>
        <CardContent className="pt-6">
          <h2 className="mb-1 text-lg font-medium text-zinc-200">
            {t("addConnection")}
          </h2>
          <p className="mb-4 text-sm text-zinc-500">
            {t("addConnectionDescription")}
          </p>
          <form
            onSubmit={handleCreateConnection}
            className="flex flex-col gap-4 sm:max-w-md"
          >
            <div className="space-y-2">
              <Label htmlFor="connectionClient">{t("selectClient")}</Label>
              <Select
                id="connectionClient"
                value={connectionForm.googleClientId}
                onChange={(e) =>
                  setConnectionForm((f) => ({
                    ...f,
                    googleClientId: e.target.value,
                  }))
                }
              >
                <option value="">{t("selectClientPlaceholder")}</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.label || client.id}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="connectionLabel">
                {t("connectionLabel")}
              </Label>
              <Input
                id="connectionLabel"
                placeholder={t("connectionLabelPlaceholder")}
                value={connectionForm.label}
                onChange={(e) =>
                  setConnectionForm((f) => ({ ...f, label: e.target.value }))
                }
              />
            </div>
            <Button type="submit" disabled={creating || clients.length === 0}>
              {creating ? t("submitting") : t("connectViaGoogle")}
            </Button>
          </form>
        </CardContent>
      </Card>
      )}

      {/* Connections list */}
      {isAdmin && (
      <div>
        <h2 className="mb-4 text-lg font-medium text-zinc-200">
          {t("connectionList")}
        </h2>
        {connectionsLoading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : connections.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-zinc-500">
              {t("empty")}
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
                        <span className="text-emerald-400">
                          {t("connected")}
                        </span>
                      ) : (
                        <span className="text-amber-400">
                          {t("notConnected")}
                        </span>
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
                    {disconnectingId === conn.id
                      ? t("disconnecting")
                      : t("disconnect")}
                  </Button>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
      )}
    </div>
  );
}
