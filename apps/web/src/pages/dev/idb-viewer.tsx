import { useEffect, useState } from "react";
import { getClass, getAudio, getAllSessions, getAudioChunksBySession, getStrokeBatchesBySession } from "@/utils/db";
import type { CompressedStroke, AudioBatch, IActions, LocalSession, LocalAudioChunk, LocalStrokeBatch } from "@/utils/constant";
import { ChevronDown, ChevronRight, Database, FileAudio, Pencil, FileJson, RefreshCw, Upload} from "lucide-react";

interface DecompressedStroke extends Omit<CompressedStroke, 'data'> {
  decompressedData?: number[] | Record<string, unknown>;
  rawData: string;
}

async function gzipDecompress(compressed: Uint8Array): Promise<string> {
  const ds = new DecompressionStream('gzip');
  const writer = ds.writable.getWriter();
  writer.write(new Uint8Array(compressed.buffer) as BufferSource);
  writer.close();
  return new Response(ds.readable).text();
}

async function decompressStroke(stroke: CompressedStroke): Promise<DecompressedStroke> {
  try {
    const bytes = Uint8Array.from(atob(stroke.data), c => c.charCodeAt(0));
    const json = await gzipDecompress(bytes);
    return {
      ...stroke,
      decompressedData: JSON.parse(json),
      rawData: stroke.data.slice(0, 50) + "...",
    };
  } catch {
    return { ...stroke, rawData: stroke.data.slice(0, 50) + "..." };
  }
}

// Stats for sync architecture stores
interface SyncStats {
  sessions: LocalSession[];
  audioChunks: LocalAudioChunk[];
  strokeBatches: LocalStrokeBatch[];
  totalAudioSize: number;
  totalStrokeSize: number;
}

const IdbViewer = () => {
  const [manifest, setManifest] = useState<IActions | null>(null);
  const [strokes, setStrokes] = useState<DecompressedStroke[]>([]);
  const [audio, setAudio] = useState<AudioBatch[]>([]);
  const [syncStats, setSyncStats] = useState<SyncStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState({
    manifest: true,
    strokes: true,
    audio: true,
    syncStores: true,
  });
  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set());
  const [expandedStrokes, setExpandedStrokes] = useState<Set<string>>(new Set());

  const loadData = async () => {
    setLoading(true);
    try {
      // Load manifest from localStorage
      const raw = localStorage.getItem("currentBatches");
      if (raw) {
        setManifest(JSON.parse(raw));
      }

      // Load strokes from IndexedDB (legacy)
      const allStrokes = await getClass();
      const decompressed = await Promise.all(
        allStrokes.slice(0, 50).map(decompressStroke) // Limit to 50 for performance
      );
      setStrokes(decompressed);

      // Load audio from IndexedDB (legacy)
      const allAudio = await getAudio();
      setAudio(allAudio.slice(0, 20)); // Limit to 20

      // Load sync architecture stores
      const sessions = await getAllSessions();
      let allAudioChunks: LocalAudioChunk[] = [];
      let allStrokeBatches: LocalStrokeBatch[] = [];

      for (const session of sessions) {
        const chunks = await getAudioChunksBySession(session.id);
        const batches = await getStrokeBatchesBySession(session.id);
        allAudioChunks = [...allAudioChunks, ...chunks];
        allStrokeBatches = [...allStrokeBatches, ...batches];
      }

      const totalAudioSize = allAudioChunks.reduce((sum, c) => sum + c.sizeBytes, 0);
      const totalStrokeSize = allStrokeBatches.reduce((sum, b) => sum + b.sizeBytes, 0);

      setSyncStats({
        sessions,
        audioChunks: allAudioChunks,
        strokeBatches: allStrokeBatches,
        totalAudioSize,
        totalStrokeSize,
      });
    } catch (err) {
      console.error("Failed to load IDB data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleBatch = (id: string) => {
    setExpandedBatches(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleStroke = (id: string) => {
    setExpandedStrokes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Loading IndexedDB data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6 font-mono text-sm">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Database className="w-6 h-6 text-blue-400" />
            <h1 className="text-xl font-bold">IndexedDB Viewer</h1>
          </div>
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-xs font-semibold transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>

        {/* Stats - Legacy */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Manifest Batches</p>
            <p className="text-2xl font-bold text-blue-400">{manifest?.totalBatches ?? 0}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Strokes (Legacy)</p>
            <p className="text-2xl font-bold text-emerald-400">{strokes.length}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Audio (Legacy)</p>
            <p className="text-2xl font-bold text-amber-400">{audio.length}</p>
          </div>
        </div>

        {/* Stats - Sync Architecture */}
        {syncStats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-purple-900/50 to-purple-800/30 rounded-lg p-4 border border-purple-700">
              <p className="text-purple-300 text-xs uppercase tracking-wider mb-1">Sessions</p>
              <p className="text-2xl font-bold text-purple-200">{syncStats.sessions.length}</p>
            </div>
            <div className="bg-gradient-to-br from-cyan-900/50 to-cyan-800/30 rounded-lg p-4 border border-cyan-700">
              <p className="text-cyan-300 text-xs uppercase tracking-wider mb-1">Audio Chunks (10s)</p>
              <p className="text-2xl font-bold text-cyan-200">{syncStats.audioChunks.length}</p>
              <p className="text-cyan-400 text-xs mt-1">{formatBytes(syncStats.totalAudioSize)}</p>
            </div>
            <div className="bg-gradient-to-br from-green-900/50 to-green-800/30 rounded-lg p-4 border border-green-700">
              <p className="text-green-300 text-xs uppercase tracking-wider mb-1">Stroke Batches (60s)</p>
              <p className="text-2xl font-bold text-green-200">{syncStats.strokeBatches.length}</p>
              <p className="text-green-400 text-xs mt-1">{formatBytes(syncStats.totalStrokeSize)}</p>
            </div>
            <div className="bg-gradient-to-br from-orange-900/50 to-orange-800/30 rounded-lg p-4 border border-orange-700">
              <p className="text-orange-300 text-xs uppercase tracking-wider mb-1">Total Memory</p>
              <p className="text-2xl font-bold text-orange-200">{formatBytes(syncStats.totalAudioSize + syncStats.totalStrokeSize)}</p>
              <p className="text-orange-400 text-xs mt-1">Audio + Board</p>
            </div>
          </div>
        )}

        {/* Sync Architecture Details */}
        {syncStats && syncStats.sessions.length > 0 && (
          <div className="bg-gray-800 rounded-lg border border-gray-700 mb-4 overflow-hidden">
            <button
              onClick={() => toggleSection("syncStores")}
              className="w-full flex items-center gap-2 px-4 py-3 bg-gray-750 hover:bg-gray-700 transition-colors"
            >
              {expandedSections.syncStores ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              <Upload className="w-4 h-4 text-purple-400" />
              <span className="font-semibold">Sync Architecture Stores</span>
              <span className="text-gray-500 text-xs ml-auto">
                {syncStats.sessions.length} session(s) | {formatBytes(syncStats.totalAudioSize + syncStats.totalStrokeSize)} total
              </span>
            </button>

            {expandedSections.syncStores && (
              <div className="p-4 border-t border-gray-700 space-y-4">
                {syncStats.sessions.map((session) => {
                  const sessionAudio = syncStats.audioChunks.filter(c => c.sessionId === session.id);
                  const sessionStrokes = syncStats.strokeBatches.filter(b => b.sessionId === session.id);
                  const audioSize = sessionAudio.reduce((sum, c) => sum + c.sizeBytes, 0);
                  const strokeSize = sessionStrokes.reduce((sum, b) => sum + b.sizeBytes, 0);

                  return (
                    <div key={session.id} className="bg-gray-900 rounded-lg border border-gray-700 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <span className="text-purple-300 font-semibold">{session.lesson.topic}</span>
                          <span className="text-gray-500 text-xs ml-2">({session.status})</span>
                        </div>
                        <span className="text-xs text-gray-500">{session.id.slice(0, 8)}...</span>
                      </div>

                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                        <div className="bg-gray-800 rounded p-2">
                          <p className="text-gray-400">Audio Chunks</p>
                          <p className="text-cyan-300 font-bold">{sessionAudio.length} × 10s</p>
                          <p className="text-cyan-500">{formatBytes(audioSize)}</p>
                        </div>
                        <div className="bg-gray-800 rounded p-2">
                          <p className="text-gray-400">Stroke Batches</p>
                          <p className="text-green-300 font-bold">{sessionStrokes.length} × 60s</p>
                          <p className="text-green-500">{formatBytes(strokeSize)}</p>
                        </div>
                        <div className="bg-gray-800 rounded p-2">
                          <p className="text-gray-400">Duration</p>
                          <p className="text-white font-bold">{Math.round(session.recording.totalDurationMs / 1000)}s</p>
                          <p className="text-gray-500">{(session.recording.totalDurationMs / 60000).toFixed(1)} min</p>
                        </div>
                        <div className="bg-gray-800 rounded p-2">
                          <p className="text-gray-400">Total Size</p>
                          <p className="text-orange-300 font-bold">{formatBytes(audioSize + strokeSize)}</p>
                          <p className="text-gray-500">Audio + Board</p>
                        </div>
                      </div>

                      {/* Sync Status */}
                      <div className="mt-3 flex gap-2 text-xs">
                        <span className={`px-2 py-1 rounded ${
                          sessionAudio.filter(c => c.syncStatus === 'pending').length > 0
                            ? 'bg-amber-900/50 text-amber-300'
                            : 'bg-green-900/50 text-green-300'
                        }`}>
                          Audio: {sessionAudio.filter(c => c.syncStatus === 'sent').length}/{sessionAudio.length} sent
                        </span>
                        <span className={`px-2 py-1 rounded ${
                          sessionStrokes.filter(b => b.syncStatus === 'pending').length > 0
                            ? 'bg-amber-900/50 text-amber-300'
                            : 'bg-green-900/50 text-green-300'
                        }`}>
                          Strokes: {sessionStrokes.filter(b => b.syncStatus === 'sent').length}/{sessionStrokes.length} sent
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Manifest Section */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 mb-4 overflow-hidden">
          <button
            onClick={() => toggleSection("manifest")}
            className="w-full flex items-center gap-2 px-4 py-3 bg-gray-750 hover:bg-gray-700 transition-colors"
          >
            {expandedSections.manifest ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            <FileJson className="w-4 h-4 text-blue-400" />
            <span className="font-semibold">Manifest (localStorage)</span>
            <span className="text-gray-500 text-xs ml-auto">
              {manifest ? `${manifest.totalBatches} batches, ${manifest.totalDuration}ms total` : "No manifest"}
            </span>
          </button>

          {expandedSections.manifest && manifest && (
            <div className="p-4 border-t border-gray-700">
              <div className="mb-3 text-xs text-gray-400">
                Total Duration: <span className="text-white">{manifest.totalDuration}ms</span> |
                Total Batches: <span className="text-white">{manifest.totalBatches}</span>
              </div>

              <div className="space-y-2">
                {manifest.batches.slice(0, 5).map((batch, idx) => (
                  <div key={batch.id} className="bg-gray-900 rounded border border-gray-700">
                    <button
                      onClick={() => toggleBatch(batch.id)}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-800 transition-colors text-left"
                    >
                      {expandedBatches.has(batch.id) ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                      <span className="text-blue-300">Batch {idx}</span>
                      <span className="text-gray-500 text-xs">
                        {batch.startTime}s → {batch.endTime}s
                      </span>
                      <div className="flex gap-2 ml-auto">
                        {batch.hasAudio && <span className="text-xs bg-amber-900/50 text-amber-300 px-1.5 py-0.5 rounded">Audio</span>}
                        {batch.hasBoard && <span className="text-xs bg-emerald-900/50 text-emerald-300 px-1.5 py-0.5 rounded">Board</span>}
                        {batch.mediaAction?.length && (
                          <span className="text-xs bg-purple-900/50 text-purple-300 px-1.5 py-0.5 rounded">
                            {batch.mediaAction.length} Media
                          </span>
                        )}
                      </div>
                    </button>

                    {expandedBatches.has(batch.id) && (
                      <pre className="px-3 py-2 text-xs bg-gray-950 border-t border-gray-700 overflow-x-auto">
                        {JSON.stringify(batch, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
                {manifest.batches.length > 5 && (
                  <p className="text-gray-500 text-xs text-center py-2">
                    ... and {manifest.batches.length - 5} more batches
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Strokes Section */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 mb-4 overflow-hidden">
          <button
            onClick={() => toggleSection("strokes")}
            className="w-full flex items-center gap-2 px-4 py-3 bg-gray-750 hover:bg-gray-700 transition-colors"
          >
            {expandedSections.strokes ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            <Pencil className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold">Board Updates (STORE_CLASS)</span>
            <span className="text-gray-500 text-xs ml-auto">{strokes.length} strokes</span>
          </button>

          {expandedSections.strokes && strokes.length > 0 && (
            <div className="p-4 border-t border-gray-700">
              <div className="space-y-2">
                {strokes.slice(0, 10).map((stroke, idx) => (
                  <div key={stroke.id} className="bg-gray-900 rounded border border-gray-700">
                    <button
                      onClick={() => toggleStroke(stroke.id)}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-800 transition-colors text-left"
                    >
                      {expandedStrokes.has(stroke.id) ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                      <span className="text-emerald-300">#{idx}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        stroke.type === 'stroke' ? 'bg-blue-900/50 text-blue-300' :
                        stroke.type === 'eraser' ? 'bg-red-900/50 text-red-300' :
                        'bg-purple-900/50 text-purple-300'
                      }`}>
                        {stroke.type}
                      </span>
                      <span className="text-gray-500 text-xs">
                        Board {stroke.currentBoard} | {stroke.timestamp}ms
                      </span>
                      <span className="text-gray-600 text-xs ml-auto truncate max-w-[200px]">
                        {stroke.id.slice(0, 8)}...
                      </span>
                    </button>

                    {expandedStrokes.has(stroke.id) && (
                      <div className="px-3 py-2 text-xs bg-gray-950 border-t border-gray-700 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div><span className="text-gray-500">ID:</span> {stroke.id}</div>
                          <div><span className="text-gray-500">Session:</span> {stroke.sessionId?.slice(0, 8) ?? 'null'}...</div>
                          <div><span className="text-gray-500">Type:</span> {stroke.type}</div>
                          <div><span className="text-gray-500">Board:</span> {stroke.currentBoard}</div>
                          <div><span className="text-gray-500">Color:</span> <span style={{ color: stroke.color }}>{stroke.color}</span></div>
                          <div><span className="text-gray-500">Width:</span> {stroke.width}</div>
                          <div><span className="text-gray-500">Timestamp:</span> {stroke.timestamp}ms</div>
                          <div><span className="text-gray-500">Duration:</span> {stroke.duration}ms</div>
                          <div><span className="text-gray-500">Start:</span> {stroke.startTime}</div>
                          <div><span className="text-gray-500">End:</span> {stroke.endTime}</div>
                        </div>
                        {stroke.decompressedData && (
                          <div className="mt-2">
                            <p className="text-gray-500 mb-1">Decompressed Data (points/shape):</p>
                            <pre className="bg-gray-900 p-2 rounded overflow-x-auto max-h-32">
                              {JSON.stringify(stroke.decompressedData, null, 2).slice(0, 500)}
                              {JSON.stringify(stroke.decompressedData).length > 500 && '...'}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                {strokes.length > 10 && (
                  <p className="text-gray-500 text-xs text-center py-2">
                    ... and {strokes.length - 10} more strokes
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Audio Section */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <button
            onClick={() => toggleSection("audio")}
            className="w-full flex items-center gap-2 px-4 py-3 bg-gray-750 hover:bg-gray-700 transition-colors"
          >
            {expandedSections.audio ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            <FileAudio className="w-4 h-4 text-amber-400" />
            <span className="font-semibold">Audio Batches (STORE_AUDIO)</span>
            <span className="text-gray-500 text-xs ml-auto">{audio.length} batches</span>
          </button>

          {expandedSections.audio && audio.length > 0 && (
            <div className="p-4 border-t border-gray-700">
              <div className="space-y-2">
                {audio.slice(0, 10).map((batch) => (
                  <div key={batch.id} className="bg-gray-900 rounded border border-gray-700 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-amber-300">Batch #{batch.batchId}</span>
                      <span className="text-xs text-gray-500">{batch.id.slice(0, 8)}...</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div><span className="text-gray-500">Duration:</span> {batch.duration.toFixed(2)}s</div>
                      <div><span className="text-gray-500">Size:</span> {formatBytes(batch.size)}</div>
                      <div><span className="text-gray-500">Type:</span> {batch.blob?.type ?? 'unknown'}</div>
                    </div>
                    {batch.blob && (
                      <audio
                        controls
                        className="w-full mt-2 h-8"
                        src={URL.createObjectURL(batch.blob)}
                      />
                    )}
                  </div>
                ))}
                {audio.length > 10 && (
                  <p className="text-gray-500 text-xs text-center py-2">
                    ... and {audio.length - 10} more audio batches
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Raw JSON Export */}
        <div className="mt-6 text-center">
          <button
            onClick={() => {
              const data = {
                manifest,
                strokeCount: strokes.length,
                audioCount: audio.length,
                sampleStrokes: strokes.slice(0, 5),
              };
              //console.log("IDB Data Export:", data);
              navigator.clipboard.writeText(JSON.stringify(data, null, 2));
              alert("Data copied to clipboard and logged to console!");
            }}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-xs transition-colors"
          >
            Export to Console & Clipboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default IdbViewer;
