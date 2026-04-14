import type { RealtimeChannel } from '@supabase/supabase-js';
import { applyPatches, type Patch } from 'immer';
import { useEffect, useRef } from 'react';
import { loglev } from '@/core/logger/log';
import { supabaseClient } from '@/core/supabase';
import { useStore } from '@/core/zustand';
import { onPatches } from '@/core/zustand-helpers/immer';
import type { GameRemoteData } from '@/games/Game';
import {
  type SerializedGame,
  serializeGame,
} from '@/games/store/gameFactoriesActions';

const logger = loglev.getLogger('games:realtime-sync');

const SENDER_ID = crypto.randomUUID();
const PATCH_DEBOUNCE_MS = 150;
const BROADCAST_EVENT = 'game:patch';
const BROADCAST_FULL_REQUEST = 'game:full-request';
const BROADCAST_FULL_RESPONSE = 'game:full-response';

const GAME_SLICES = new Set(['games', 'factories', 'solvers']);

function isGamePatch(patch: Patch): boolean {
  return (
    patch.path.length > 0 &&
    typeof patch.path[0] === 'string' &&
    GAME_SLICES.has(patch.path[0])
  );
}

interface PatchBroadcastPayload {
  senderId: string;
  seq: number;
  patches: Patch[];
}

interface FullStateRequestPayload {
  senderId: string;
}

interface FullStateResponsePayload {
  senderId: string;
  seq: number;
  serialized: SerializedGame;
  remoteData: Partial<GameRemoteData>;
}

export function useRealtimeGameSync() {
  const session = useStore(s => s.auth.session);
  const selectedGameId = useStore(s => s.games.selected);
  const game = useStore(s =>
    selectedGameId ? s.games.games[selectedGameId] : null,
  );
  const savedId = game?.savedId;

  const channelRef = useRef<RealtimeChannel | null>(null);
  const isApplyingRemoteRef = useRef(false);
  const seqRef = useRef(0);

  useEffect(() => {
    if (!session || !savedId || !selectedGameId) {
      if (channelRef.current) {
        logger.info('Leaving realtime channel (preconditions lost)');
        supabaseClient.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      return;
    }

    const channelName = `game:${savedId}`;
    logger.info(`Joining realtime channel: ${channelName}`);

    const channel = supabaseClient.channel(channelName);
    const gameId = selectedGameId;
    let remoteSeq = -1;

    channel
      .on('broadcast', { event: BROADCAST_EVENT }, ({ payload }) => {
        const data = payload as PatchBroadcastPayload;
        if (data.senderId === SENDER_ID) return;

        if (data.seq <= remoteSeq) {
          logger.debug(
            `Ignoring out-of-order patch (seq=${data.seq}, expected>${remoteSeq})`,
          );
          return;
        }

        if (remoteSeq >= 0 && data.seq !== remoteSeq + 1) {
          logger.info(
            `Missed patches (got seq=${data.seq}, expected=${remoteSeq + 1}), requesting full state`,
          );
          channel.send({
            type: 'broadcast',
            event: BROADCAST_FULL_REQUEST,
            payload: { senderId: SENDER_ID } satisfies FullStateRequestPayload,
          });
          remoteSeq = data.seq;
          return;
        }

        remoteSeq = data.seq;
        logger.debug(
          `Applying ${data.patches.length} remote patches (seq=${data.seq})`,
        );
        isApplyingRemoteRef.current = true;
        try {
          const currentState = useStore.getState();
          const nextState = applyPatches(currentState, data.patches);
          useStore.setState(nextState);
        } catch (err) {
          logger.error('Failed to apply patches, requesting full state', err);
          channel.send({
            type: 'broadcast',
            event: BROADCAST_FULL_REQUEST,
            payload: { senderId: SENDER_ID } satisfies FullStateRequestPayload,
          });
        } finally {
          isApplyingRemoteRef.current = false;
        }
      })
      .on('broadcast', { event: BROADCAST_FULL_REQUEST }, ({ payload }) => {
        const data = payload as FullStateRequestPayload;
        if (data.senderId === SENDER_ID) return;

        logger.info('Peer requested full state, sending');
        try {
          const latestGame = useStore.getState().games.games[gameId];
          if (!latestGame?.savedId) return;

          const serialized = serializeGame(gameId);
          const remoteData: Partial<GameRemoteData> = {
            id: latestGame.savedId,
            author_id: latestGame.authorId,
            created_at: latestGame.createdAt,
            updated_at: latestGame.updatedAt,
            share_token: latestGame.shareToken,
          };

          channel.send({
            type: 'broadcast',
            event: BROADCAST_FULL_RESPONSE,
            payload: {
              senderId: SENDER_ID,
              seq: seqRef.current,
              serialized,
              remoteData,
            } satisfies FullStateResponsePayload,
          });
        } catch (err) {
          logger.error('Failed to send full state response', err);
        }
      })
      .on('broadcast', { event: BROADCAST_FULL_RESPONSE }, ({ payload }) => {
        const data = payload as FullStateResponsePayload;
        if (data.senderId === SENDER_ID) return;

        logger.info(`Received full state response (seq=${data.seq}), applying`);
        remoteSeq = data.seq;
        isApplyingRemoteRef.current = true;
        try {
          useStore.getState().loadRemoteGame(data.serialized, data.remoteData, {
            override: true,
          });
        } finally {
          isApplyingRemoteRef.current = false;
        }
      })
      .subscribe(status => {
        logger.info(`Realtime channel status: ${status}`);
        useStore.getState().setRealtimeSyncConnected(status === 'SUBSCRIBED');

        if (status === 'SUBSCRIBED') {
          channel.send({
            type: 'broadcast',
            event: BROADCAST_FULL_REQUEST,
            payload: { senderId: SENDER_ID } satisfies FullStateRequestPayload,
          });
        }
      });

    channelRef.current = channel;

    let pendingPatches: Patch[] = [];
    let flushTimer: ReturnType<typeof setTimeout> | null = null;

    function flushPatches() {
      flushTimer = null;
      if (!channelRef.current || pendingPatches.length === 0) return;

      seqRef.current += 1;
      const seq = seqRef.current;
      const batch = pendingPatches;
      pendingPatches = [];

      try {
        channelRef.current.send({
          type: 'broadcast',
          event: BROADCAST_EVENT,
          payload: {
            senderId: SENDER_ID,
            seq,
            patches: batch,
          } satisfies PatchBroadcastPayload,
        });
        logger.debug(`Broadcasted ${batch.length} patches (seq=${seq})`);
      } catch (err) {
        logger.error('Failed to broadcast patches', err);
      }
    }

    const unsubscribePatches = onPatches(patches => {
      if (isApplyingRemoteRef.current) return;
      if (!channelRef.current) return;

      const gamePatches = patches.filter(isGamePatch);
      if (gamePatches.length === 0) return;

      pendingPatches.push(...gamePatches);

      if (flushTimer !== null) clearTimeout(flushTimer);
      flushTimer = setTimeout(flushPatches, PATCH_DEBOUNCE_MS);
    });

    return () => {
      unsubscribePatches();
      if (flushTimer !== null) {
        clearTimeout(flushTimer);
        flushPatches();
      }

      if (channelRef.current) {
        logger.info(`Leaving realtime channel: ${channelName}`);
        supabaseClient.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      useStore.getState().setRealtimeSyncConnected(false);
    };
  }, [session, savedId, selectedGameId]);
}
