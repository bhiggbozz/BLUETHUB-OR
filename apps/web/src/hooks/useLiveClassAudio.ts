import { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";
import {
  ConnectionQuality,
  Room,
  RoomEvent,
  type Participant,
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
  const dataListenersRef = useRef<Set<(payload: Uint8Array, senderId: string) => void>>(new Set());
  const reconnectedListenersRef = useRef<Set<() => void>>(new Set());

  const [status, setStatusState] = useState<LiveClassAudioStatus>("disconnected");
  const [canPublishMic, setCanPublishMic] = useState(false);
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
        if (topic !== "board") return;
        dataListenersRef.current.forEach((handler) => handler(payload, participant?.identity ?? ""));
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

  const setMicEnabled = useCallback(
    async (enabled: boolean) => {
      const room = roomRef.current;
      if (!room) return;
      if (enabled && !canPublishMic) {
        toast.error("Your teacher hasn't allowed you to speak yet.");
        return;
      }
      try {
        await room.localParticipant.setMicrophoneEnabled(enabled);
        setMicEnabledState(enabled);
      } catch {
        toast.error("Could not access your microphone. Check your browser's mic permission.");
      }
    },
    [canPublishMic]
  );

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
  };
}
