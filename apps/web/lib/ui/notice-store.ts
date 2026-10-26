'use client';

import { create } from 'zustand';
export type NoticeTone = 'info' | 'success' | 'error';
export interface Notice {
  id: number;
  message: string;
  tone: NoticeTone;
}
let nextId = 0;
export const useNoticeStore = create<{
  notices: Notice[];
  show: (message: string, tone?: NoticeTone) => void;
  dismiss: (id: number) => void;
}>((set) => ({
  notices: [],
  show: (message, tone = 'info') =>
    set((state) => ({
      notices: [
        ...state.notices.filter((notice) => notice.message !== message),
        { id: ++nextId, message, tone },
      ].slice(-3),
    })),
  dismiss: (id) =>
    set((state) => ({ notices: state.notices.filter((notice) => notice.id !== id) })),
}));
export const showNotice = (message: string, tone: NoticeTone = 'info') =>
  useNoticeStore.getState().show(message, tone);
