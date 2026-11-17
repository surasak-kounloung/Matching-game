import { STAGE } from './layout';

export function fitStage(viewportWidth: number, viewportHeight: number): { scale: number; left: number; top: number } {
  if (!(viewportWidth > 0) || !(viewportHeight > 0)) return { scale: 0, left: 0, top: 0 };
  const scale = Math.min(viewportWidth / STAGE.width, viewportHeight / STAGE.height);
  return {
    scale,
    left: (viewportWidth - STAGE.width * scale) / 2,
    top: (viewportHeight - STAGE.height * scale) / 2,
  };
}
