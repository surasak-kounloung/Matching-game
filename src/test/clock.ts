import { act } from '@testing-library/react';
import { vi } from 'vitest';
import type { Rng } from '../game/deck';

/** ตัวสุ่มที่ให้ลำดับเดิมทุกครั้งเมื่อใช้ seed เดิม */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** นาฬิกาจำลอง: advance() เลื่อนทั้ง now() ที่ฉีดเข้าเกมและ fake timers ของ vitest ไปพร้อมกัน */
export function createTestClock(startAt = 1_000) {
  let t = startAt;
  return {
    now: () => t,
    advance(ms: number) {
      act(() => {
        t += ms;
        vi.advanceTimersByTime(ms);
      });
    },
    /** จำลองเครื่องค้าง: เวลาเดินไป ms แต่ตัวจับเวลาได้ทำงานเพียงครั้งเดียวหลังจากนั้น */
    stall(ms: number) {
      act(() => {
        t += ms;
        vi.advanceTimersToNextTimer();
      });
    },
  };
}
