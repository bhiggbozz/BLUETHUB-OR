import { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";
import {
  ConnectionQuality,
  Room,
  RoomEvent,
  Track,
  type Participant,
  type RemoteParticipant,
  type RemoteTrack,
} from "livekit-client";
import { setAudioStatus } from "@/store/live-class-slice";

export type LiveClassAudioStatus = "disconnected" | "connecting" | "connected" | "error";

/**
 * Owns one LiveKit `Room` for the lifetime of the live-class room screen.
 *
 * Mic publish permission is server-enforced (token-level), but the UI must
 * still track it client-side so it never even attempts to publish when not
 * allowed — `canPublishMic` is seeded from the join response and kept in
 * sync by LiveKit's own `ParticipantPermissionsChanged` event, with
 * `applySpeakHint` letting the room reflect the board hub's `SpeakChanged`
 * event immediately (faster perceived response than waiting on LiveKit).
 *
 * `room.startAudio()` must run from a user gesture (browser autoplay rule) —
 * call `startAudio()` from the Join button's click handler, not from an effect.
 */
export function useLiveClassAudio() {
  const dispatch = useDispatch();
  const roomRef = useRef<Room | null>(null);
  // `Room` never attaches remote audio tracks to the DOM on its own — a
  // subscribed track is just data until something calls `track.attach()`
  // and mounts the element it returns. Keyed by track sid (not just
  // collected in a Set) so a track that fires `TrackSubscribed` more than
  // once — e.g. a brief resubscribe around a connection blip — reuses its
  // existing element instead of stacking a second one playing the same
  // stream on top, which is what actually produces a crackling/doubled
  // sound rather than a clean single playback.
  const audioElementsRef = useRef<Map<string, HTMLMediaElement>>(new Map());
  const dataListenersRef = useRef<Set<(payload: Uint8Array, senderId: string) => void>>(new Set());
  const reconnectedListenersRef = useRef<Set<() => void>>(new Set());
  const mediaListenersRef = useRef<Set<(payload: Uint8Array, senderId: string) => void>>(new Set());
  const participantConnectedListenersRef = useRef<Set<(identity: string) => void>>(new Set());

  const [status, setStatusState] = useState<LiveClassAudioStatus>("disconnected");
  const [canPublishMic, setCanPublishMicState] = useState(false);
  // The teacher room's join effect intentionally runs once (deps `[id]` only,
  // never re-running on every new `audio` object) and calls
  // `audio.setMicEnabled(true)` right after connecting — that call closes
  // over whatever `canPublishMic` was AT MOUNT TIME (always `false`, the
  // initial state), so reading the plain state value here would silently
  // reject the teacher's own auto-enable forever, even though their
  // permission is actually `true` by the time the call runs. A ref sidesteps
  // that: whoever calls `setMicEnabled`, stale closure or not, always reads
  // the current value.
  const canPublishMicRef = useRef(false);
  const setCanPublishMic = useCallback((next: boolean) => {
    canPublishMicRef.current = next;
    setCanPublishMicState(next);
  }, []);
  const [micEnabled, setMicEnabledState] = useState(false);
  const [activeSpeakerIds, setActiveSpeakerIds] = useState<Set<string>>(new Set());
  const [connectionQuality, setConnectionQuality] = useState<ConnectionQuality>(ConnectionQuality.Unknown);

  const updateStatus = useCallback(
    (next: LiveClassAudioStatus) => {
      setStatusState(next);
      dispatch(setAudioStatus(next));
    },
    [dispatch]
  );

  const teardown = useCallback(async () => {
    const room = roomRef.current;
    roomRef.current = null;
    audioElementsRef.current.forEach((el) => el.remove());
    audioElementsRef.current.clear();
    if (room) {
      room.removeAllListeners();
      try {
        await room.disconnect();
      } catch {
        // already disconnected — nothing to do
      }
    }
    setActiveSpeakerIds(new Set());
    setCanPublishMic(false);
    setMicEnabledState(false);
    setConnectionQuality(ConnectionQuality.Unknown);
  }, []);

  useEffect(() => {
    return () => {
      void teardown();
    };
  }, [teardown]);

  const connect = useCallback(
    async (url: string, accessToken: string, initialCanSpeak: boolean) => {
      await teardown();
      updateStatus("connecting");

      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
        audioCaptureDefaults: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      roomRef.current = room;

      room.on(RoomEvent.ActiveSpeakersChanged, (speakers: Participant[]) => {
        setActiveSpeakerIds(new Set(speakers.map((p) => p.identity)));
      });
      room.on(RoomEvent.ConnectionQualityChanged, (quality: ConnectionQuality, participant: Participant) => {
        if (participant.isLocal) setConnectionQuality(quality);
      });
      room.on(RoomEvent.ParticipantPermissionsChanged, () => {
        const allowed = !!room.localParticipant.permissions?.canPublish;
        setCanPublishMic(allowed);
        if (!allowed) {
          void room.localParticipant.setMicrophoneEnabled(false);
          setMicEnabledState(false);
        }
      });
      room.on(RoomEvent.Disconnected, () => updateStatus("disconnected"));
      room.on(RoomEvent.Reconnecting, () => updateStatus("connecting"));
      room.on(RoomEvent.Reconnected, () => {
        updateStatus("connected");
        // The data channel may have missed messages during the drop — callers
        // (the main board) use this to force a fresh hub JoinClass/snapshot.
        reconnectedListenersRef.current.forEach((handler) => handler());
      });
      room.on(RoomEvent.DataReceived, (payload, participant, _kind, topic) => {
        if (topic === "board") {
          dataListenersRef.current.forEach((handler) => handler(payload, participant?.identity ?? ""));
          return;
        }
        if (topic === "media") {
          mediaListenersRef.current.forEach((handler) => handler(payload, participant?.identity ?? ""));
        }
      });
      room.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
        participantConnectedListenersRef.current.forEach((handler) => handler(participant.identity));
      });
      // The actual missing piece for hearing anyone: LiveKit hands you the
      // subscribed track, but never attaches it to anything playable itself.
      room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
        if (track.kind !== Track.Kind.Audio) return;
        if (audioElementsRef.current.has(track.sid)) return; // already playing — don't stack a second element on the same stream
        const el = track.attach();
        el.autoplay = true;
        document.body.appendChild(el);
        audioElementsRef.current.set(track.sid, el);
      });
      room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
        if (track.kind !== Track.Kind.Audio) return;
        track.detach().forEach((el) => el.remove());
        audioElementsRef.current.delete(track.sid);
      });

      try {
        await room.connect(url, accessToken);
      } catch {
        updateStatus("error");
        toast.error("Could not open the audio room. Please try again in a moment.");
        return;
      }

      updateStatus("connected");
      setCanPublishMic(!!room.localParticipant.permissions?.canPublish || initialCanSpeak);
    },
    [teardown, updateStatus]
  );

  /** Must be called from the Join button's own click handler — browsers
   * block audio playback that isn't initiated by a user gesture. */
  const startAudio = useCallback(async () => {
    try {
      await roomRef.current?.startAudio();
    } catch {
      // Autoplay still blocked — audio resumes on the next user interaction;
      // nothing actionable to show the user here.
    }
  }, []);

  const setMicEnabled = useCallback(async (enabled: boolean) => {
    const room = roomRef.current;
    if (!room) return;
    if (enabled && !canPublishMicRef.current) {
      toast.error("Your teacher hasn't allowed you to speak yet.");
      return;
    }
    try {
      await room.localParticipant.setMicrophoneEnabled(enabled);
      setMicEnabledState(enabled);
    } catch {
      toast.error("Could not access your microphone. Check your browser's mic permission.");
    }
  }, []);

  /** Reflects the board hub's `SpeakChanged` event immediately, ahead of
   * LiveKit's own permission-change event landing — purely a UI nicety. */
  const applySpeakHint = useCallback((allow: boolean) => {
    setCanPublishMic(allow);
    if (!allow) {
      void roomRef.current?.localParticipant.setMicrophoneEnabled(false);
      setMicEnabledState(false);
    }
  }, []);

  const disconnect = useCallback(() => teardown(), [teardown]);

  /** Publishes a main-board message on the "board" topic — reliable, same
   * connection as the audio. Teacher-only in practice (the token's
   * `canPublishData` is false for students); a failure here is silent since
   * the hub write alongside it still keeps the snapshot current. */
  const sendBoardData = useCallback((bytes: Uint8Array) => {
    const room = roomRef.current;
    if (!room) return;
    // `publishData` wants a plain-ArrayBuffer-backed Uint8Array; ours always
    // comes from `TextEncoder.encode` (never a SharedArrayBuffer) so this
    // narrows a type-only mismatch, not a real runtime concern.
    void room.localParticipant
      .publishData(bytes as Uint8Array<ArrayBuffer>, { reliable: true, topic: "board" })
      .catch(() => {
        // best-effort — see docstring above
      });
  }, []);

  /** Registers a handler for "board"-topic data messages, already filtered
   * to that topic — callers still must check `senderId` themselves (that
   * check, not anything LiveKit enforces, is the actual security rule). */
  const onBoardData = useCallback((handler: (payload: Uint8Array, senderId: string) => void) => {
    dataListenersRef.current.add(handler);
    return () => dataListenersRef.current.delete(handler);
  }, []);

  /** Fires after LiveKit's own reconnect completes — the main board uses
   * this to force a fresh hub JoinClass/snapshot, since the data channel may
   * have missed messages during the drop. */
  const onReconnected = useCallback((handler: () => void) => {
    reconnectedListenersRef.current.add(handler);
    return () => reconnectedListenersRef.current.delete(handler);
  }, []);

  /** Publishes a "teacher is showing this media" message on the "media"
   * topic — a sibling of `sendBoardData`, entirely independent of it.
   * `destinationIdentities`, when given, sends only to that participant (the
   * late-joiner catch-up case); omitted, it broadcasts to everyone. */
  const sendMediaData = useCallback((bytes: Uint8Array, destinationIdentities?: string[]) => {
    const room = roomRef.current;
    if (!room) return;
    void room.localParticipant
      .publishData(bytes as Uint8Array<ArrayBuffer>, { reliable: true, topic: "media", destinationIdentities })
      .catch(() => {
        // best-effort — a missed media-sync message just means a viewer's
        // "now showing" indicator is stale, nothing is lost permanently
      });
  }, []);

  /** Registers a handler for "media"-topic data messages, already filtered
   * to that topic — callers still must check `senderId` themselves. */
  const onMediaData = useCallback((handler: (payload: Uint8Array, senderId: string) => void) => {
    mediaListenersRef.current.add(handler);
    return () => mediaListenersRef.current.delete(handler);
  }, []);

  /** Fires when any other participant joins the room — the teacher uses
   * this to send that one late joiner the media-state catch-up message. */
  const onParticipantConnected = useCallback((handler: (identity: string) => void) => {
    participantConnectedListenersRef.current.add(handler);
    return () => participantConnectedListenersRef.current.delete(handler);
  }, []);

  return {
    status,
    canPublishMic,
    micEnabled,
    activeSpeakerIds,
    connectionQuality,
    connect,
    startAudio,
    setMicEnabled,
    applySpeakHint,
    disconnect,
    sendBoardData,
    onBoardData,
    onReconnected,
    sendMediaData,
    onMediaData,
    onParticipantConnected,
  };
}
