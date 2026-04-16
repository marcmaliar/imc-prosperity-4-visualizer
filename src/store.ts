import { MantineColorScheme } from '@mantine/core';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Algorithm } from './models.ts';

export interface State {
  colorScheme: MantineColorScheme;

  idToken: string;
  round: string;

  algorithm: Algorithm | null;
  timestamp: number;
  viewCenter: number;
  ticksWindow: number;

  setColorScheme: (colorScheme: MantineColorScheme) => void;
  setIdToken: (idToken: string) => void;
  setRound: (round: string) => void;
  setAlgorithm: (algorithm: Algorithm | null) => void;
  setTimestamp: (timestamp: number, isJump?: boolean) => void;
  setTicksWindow: (ticksWindow: number) => void;
}

export const useStore = create<State>()(
  persist(
    set => ({
      colorScheme: 'auto',

      idToken: '',
      round: 'ROUND0',

      algorithm: null,
      timestamp: 0,
      viewCenter: 0,
      ticksWindow: 50,

      setColorScheme: colorScheme => set({ colorScheme }),
      setIdToken: idToken => set({ idToken }),
      setRound: round => set({ round }),
      setAlgorithm: algorithm => set({ algorithm }),
      setTimestamp: (timestamp, isJump = false) => set(state => {
        if (state.ticksWindow === 0) {
          return { timestamp, viewCenter: timestamp };
        }

        const algorithm = state.algorithm;
        const timestampStep = algorithm && algorithm.data.length > 1
          ? algorithm.data[1].state.timestamp - algorithm.data[0].state.timestamp
          : 100;

        let newViewCenter = state.viewCenter;
        const windowRadius = state.ticksWindow * timestampStep;
        const padding = windowRadius / 2;

        if (isJump || Math.abs(timestamp - state.timestamp) > windowRadius) {
          newViewCenter = timestamp;
        } else {
          const rightTrigger = state.viewCenter + padding;
          const leftTrigger = state.viewCenter - padding;

          if (timestamp > rightTrigger) {
            newViewCenter = timestamp - padding;
          } else if (timestamp < leftTrigger) {
            newViewCenter = timestamp + padding;
          }
        }

        return { timestamp, viewCenter: newViewCenter };
      }),
      setTicksWindow: ticksWindow => set({ ticksWindow }),
    }),
    {
      name: 'imc-prosperity-3-visualizer',
      partialize: state => ({
        colorScheme: state.colorScheme,
        idToken: state.idToken,
        round: state.round,
        ticksWindow: state.ticksWindow,
      }),
    },
  ),
);
