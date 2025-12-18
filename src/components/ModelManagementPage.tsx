import { createSignal, Show, For, onMount } from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Loader2, 
  Download, 
  Search, 
  RefreshCw, 
  HardDrive,
  AlertCircle,
  CheckCircle2
} from "lucide-solid";
import { useI18n } from "@/lib/i18n";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";

interface LocalModelInfo {
  name: string;
  path: string;
  size: number;
  model_type: string;
  modified_time?: string;
}

interface RemoteModelInfo {
  id: string;
  author: string;
  downloads?: number;
  likes?: number;
  tags: string[];
  model_type?: string;
  files: ModelFileInfo[];
}

interface ModelFileInfo {
  filename: string;
  size?: number;
  type: string;
}

interface SearchRemoteModelsRequest {
  query: string;
  limit?: number;
  model_type?: string;
}

interface DownloadModelRequest {
  repo_id: string;
  filename: string;
  save_path?: string;
}

export default function ModelManagementPage() {
  const { t } = useI18n();
  const [localModels, setLocalModels] = createSignal<LocalModelInfo[]>([]);
  const [remoteModels, setRemoteModels] = createSignal<RemoteModelInfo[]>([]);
  const [loading, setLoading] = createSignal(false);
  const [searchLoading, setSearchLoading] = createSignal(false);
  const [searchQuery, setSearchQuery] = createSignal("");
  const [searchModelType, setSearchModelType] = createSignal<string>("");
  const [message, setMessage] = createSignal("");
  const [downloading, setDownloading] = createSignal<Set<string>>(new Set());
  const [downloadProgress, setDownloadProgress] = createSignal<Map<string, number>>(new Map());

  // 格式化文件大小
  function formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  }

  // 获取本地模型列表
  async function loadLocalModels() {
    setLoading(true);
    setMessage("");
    try {
      const models = await invoke<LocalModelInfo[]>("get_local_models");
      setLocalModels(models);
      setMessage(`${t("models.localModelsLoaded")}: ${models.length}`);
    } catch (error) {
      console.error("获取本地模型失败:", error);
      setMessage(`${t("models.error")}: ${error}`);
    } finally {
      setLoading(false);
    }
  }

  // 搜索远程模型
  async function searchRemoteModels() {
    const query = searchQuery().trim();
    if (!query) {
      setMessage(t("models.pleaseEnterSearchQuery"));
      return;
    }

    setSearchLoading(true);
    setMessage("");
    try {
      const request: SearchRemoteModelsRequest = {
        query,
        limit: 20,
        model_type: searchModelType() || undefined,
      };
      const response = await invoke<{
        models: RemoteModelInfo[];
        success: boolean;
        error?: string;
      }>("search_remote_models", { request });

      if (response.success) {
        setRemoteModels(response.models);
        setMessage(`${t("models.searchComplete")}: ${response.models.length}`);
      } else {
        setMessage(response.error || t("models.searchFailed"));
      }
    } catch (error) {
      console.error("搜索远程模型失败:", error);
      setMessage(`${t("models.error")}: ${error}`);
    } finally {
      setSearchLoading(false);
    }
  }

  // 下载模型
  async function downloadModel(repoId: string, filename: string) {
    const downloadKey = `${repoId}/${filename}`;
    
    if (downloading().has(downloadKey)) {
      setMessage(t("models.downloadInProgress"));
      return;
    }

    setDownloading((prev) => new Set(prev).add(downloadKey));
    setMessage(`${t("models.downloading")}: ${filename}`);

    try {
      const request: DownloadModelRequest = {
        repo_id: repoId,
        filename,
      };
      
      const response = await invoke<{
        success: boolean;
        message: string;
        local_path?: string;
        error?: string;
      }>("download_model", { request });

      if (response.success) {
        setMessage(`${t("models.downloadSuccess")}: ${filename}`);
        // 重新加载本地模型列表
        await loadLocalModels();
      } else {
        setMessage(response.error || t("models.downloadFailed"));
      }
    } catch (error) {
      console.error("下载模型失败:", error);
      setMessage(`${t("models.error")}: ${error}`);
    } finally {
      setDownloading((prev) => {
        const next = new Set(prev);
        next.delete(downloadKey);
        return next;
      });
      setDownloadProgress((prev) => {
        const next = new Map(prev);
        next.delete(downloadKey);
        return next;
      });
    }
  }

  // 获取模型文件（仅 GGUF 或 safetensors）
  function getModelFiles(model: RemoteModelInfo): ModelFileInfo[] {
    return model.files.filter(
      (file) => file.type === "gguf" || file.type === "safetensors"
    );
  }

  // 页面加载时获取本地模型
  onMount(() => {
    loadLocalModels();
  });

  return (
    <div class="space-y-6">
      <h1 class="text-3xl font-bold mb-6">{t("models.title")}</h1>

      <Tabs defaultValue="local" class="w-full">
        <TabsList class="grid w-full grid-cols-2">
          <TabsTrigger value="local">{t("models.localModels")}</TabsTrigger>
          <TabsTrigger value="remote">{t("models.remoteModels")}</TabsTrigger>
        </TabsList>

        {/* 本地模型标签页 */}
        <TabsContent value="local" class="space-y-4">
          <Card>
            <CardHeader>
              <div class="flex items-center justify-between">
                <CardTitle>{t("models.localModels")}</CardTitle>
                <Button
                  onClick={loadLocalModels}
                  disabled={loading()}
                  variant="outline"
                  size="sm"
                >
                  <Show when={loading()} fallback={<RefreshCw class="h-4 w-4 mr-2" />}>
                    <Loader2 class="h-4 w-4 mr-2 animate-spin" />
                  </Show>
                  {t("models.refresh")}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Show
                when={!loading() && localModels().length > 0}
                fallback={
                  <div class="text-center py-8 text-muted-foreground">
                    <HardDrive class="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>{t("models.noLocalModels")}</p>
                  </div>
                }
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("models.name")}</TableHead>
                      <TableHead>{t("models.type")}</TableHead>
                      <TableHead>{t("models.size")}</TableHead>
                      <TableHead>{t("models.path")}</TableHead>
                      <TableHead>{t("models.modifiedTime")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <For each={localModels()}>
                      {(model) => (
                        <TableRow>
                          <TableCell class="font-medium">{model.name}</TableCell>
                          <TableCell>
                            <Badge variant={model.model_type === "gguf" ? "default" : "secondary"}>
                              {model.model_type.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatFileSize(model.size)}</TableCell>
                          <TableCell class="text-sm text-muted-foreground max-w-xs truncate">
                            {model.path}
                          </TableCell>
                          <TableCell class="text-sm text-muted-foreground">
                            {model.modified_time || "-"}
                          </TableCell>
                        </TableRow>
                      )}
                    </For>
                  </TableBody>
                </Table>
              </Show>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 远程模型标签页 */}
        <TabsContent value="remote" class="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("models.searchRemoteModels")}</CardTitle>
            </CardHeader>
            <CardContent class="space-y-4">
              <div class="flex gap-2">
                <Input
                  type="text"
                  value={searchQuery()}
                  onInput={(e) => setSearchQuery(e.currentTarget.value)}
                  placeholder={t("models.searchPlaceholder")}
                  class="flex-1"
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      searchRemoteModels();
                    }
                  }}
                />
                <select
                  value={searchModelType()}
                  onChange={(e) => setSearchModelType(e.currentTarget.value)}
                  class="px-3 py-2 border border-input rounded-md bg-background"
                >
                  <option value="">{t("models.allTypes")}</option>
                  <option value="gguf">GGUF</option>
                  <option value="safetensors">Safetensors</option>
                </select>
                <Button
                  onClick={searchRemoteModels}
                  disabled={searchLoading()}
                  variant="default"
                >
                  <Show
                    when={searchLoading()}
                    fallback={<Search class="h-4 w-4 mr-2" />}
                  >
                    <Loader2 class="h-4 w-4 mr-2 animate-spin" />
                  </Show>
                  {t("models.search")}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Show when={remoteModels().length > 0}>
            <Card>
              <CardHeader>
                <CardTitle>
                  {t("models.searchResults")} ({remoteModels().length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div class="space-y-4">
                  <For each={remoteModels()}>
                    {(model) => {
                      const modelFiles = getModelFiles(model);
                      return (
                        <Card class="border">
                          <CardHeader>
                            <div class="flex items-start justify-between">
                              <div class="flex-1">
                                <CardTitle class="text-lg">{model.id}</CardTitle>
                                <p class="text-sm text-muted-foreground mt-1">
                                  {t("models.author")}: {model.author}
                                </p>
                                <div class="flex gap-2 mt-2">
                                  <Show when={model.downloads}>
                                    <Badge variant="outline">
                                      <Download class="h-3 w-3 mr-1" />
                                      {model.downloads?.toLocaleString()}
                                    </Badge>
                                  </Show>
                                  <Show when={model.likes}>
                                    <Badge variant="outline">
                                      {model.likes?.toLocaleString()} {t("models.likes")}
                                    </Badge>
                                  </Show>
                                </div>
                                <Show when={model.tags.length > 0}>
                                  <div class="flex flex-wrap gap-1 mt-2">
                                    <For each={model.tags.slice(0, 5)}>
                                      {(tag) => (
                                        <Badge variant="secondary" class="text-xs">
                                          {tag}
                                        </Badge>
                                      )}
                                    </For>
                                  </div>
                                </Show>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <Show
                              when={modelFiles.length > 0}
                              fallback={
                                <p class="text-sm text-muted-foreground">
                                  {t("models.noModelFiles")}
                                </p>
                              }
                            >
                              <div class="space-y-2">
                                <p class="text-sm font-medium">{t("models.availableFiles")}:</p>
                                <For each={modelFiles}>
                                  {(file) => {
                                    const downloadKey = `${model.id}/${file.filename}`;
                                    const isDownloading = downloading().has(downloadKey);
                                    return (
                                      <div class="flex items-center justify-between p-2 border rounded-md">
                                        <div class="flex-1">
                                          <p class="text-sm font-medium">{file.filename}</p>
                                          <div class="flex gap-2 mt-1">
                                            <Badge variant="outline" class="text-xs">
                                              {file.type.toUpperCase()}
                                            </Badge>
                                            <Show when={file.size}>
                                              <span class="text-xs text-muted-foreground">
                                                {formatFileSize(file.size!)}
                                              </span>
                                            </Show>
                                          </div>
                                          <Show when={isDownloading}>
                                            <Progress
                                              value={downloadProgress().get(downloadKey) || 0}
                                              class="mt-2"
                                            />
                                          </Show>
                                        </div>
                                        <Button
                                          onClick={() => downloadModel(model.id, file.filename)}
                                          disabled={isDownloading}
                                          variant="outline"
                                          size="sm"
                                          class="ml-2"
                                        >
                                          <Show
                                            when={isDownloading}
                                            fallback={<Download class="h-4 w-4 mr-2" />}
                                          >
                                            <Loader2 class="h-4 w-4 mr-2 animate-spin" />
                                          </Show>
                                          {t("models.download")}
                                        </Button>
                                      </div>
                                    );
                                  }}
                                </For>
                              </div>
                            </Show>
                          </CardContent>
                        </Card>
                      );
                    }}
                  </For>
                </div>
              </CardContent>
            </Card>
          </Show>
        </TabsContent>
      </Tabs>

      {/* 消息提示 */}
      <Show when={message()}>
        <Alert>
          <Show
            when={message().includes(t("models.error")) || message().includes("失败")}
            fallback={<CheckCircle2 class="h-4 w-4" />}
          >
            <AlertCircle class="h-4 w-4" />
          </Show>
          <AlertTitle>
            <Show
              when={message().includes(t("models.error")) || message().includes("失败")}
              fallback={t("models.success")}
            >
              {t("models.error")}
            </Show>
          </AlertTitle>
          <AlertDescription>{message()}</AlertDescription>
        </Alert>
      </Show>
    </div>
  );
}

