"""Compare the game's screenshots with the designer's reference images.

Usage:
    python tools/compare_screens.py [--screens e2e/screens] [--refs docs/design-reference]
                                    [--out e2e/screens/compare]

1. Numeric check: for each region below, the mean absolute difference of each
   colour channel between screenshot and reference must not exceed the
   region's limit. Any failure ends the script with status 1.
2. Side-by-side images (reference left, screenshot right) are written to
   --out for a person to look at: whole stages, plus a crop per region.

If the reference folder does not exist (it is not in the repository), the
comparison is skipped and the script ends with status 0.
"""

from __future__ import annotations

import argparse
import sys
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageChops, ImageStat

PROJECT_ROOT = Path(__file__).resolve().parent.parent
STAGE_SIZE = (1497, 2664)
GUTTER = 8
GUTTER_COLOUR = (255, 0, 255)

Box = tuple[int, int, int, int]  # (left, top, right, bottom)


@dataclass(frozen=True)
class Check:
    name: str
    slug: str  # file name of the region's side-by-side
    screen: str
    ref: str
    box: Box
    limit: float


# The first three regions are Photoshop pixels on both sides and should differ
# by about 1; the last two hold text the browser draws.
CHECKS: list[Check] = [
    Check("ready: title", "check-title", "ready.png", "01-ready.jpg", (0, 0, 1497, 630), 2.5),
    Check("ready: prize row", "check-prizes", "ready.png", "01-ready.jpg",
          (90, 630, 1490, 992), 2.5),
    Check("ready: face-down board", "check-board", "ready.png", "01-ready.jpg",
          (75, 1360, 1431, 2525), 5.0),
    Check("timeup-popup: first prize won", "check-prize1-won", "timeup-popup.png",
          "03-timeup-popup.jpg", (90, 630, 752, 932), 5.0),
    Check("timeup-popup: timer out of time", "check-timer-expired", "timeup-popup.png",
          "03-timeup-popup.jpg", (584, 996, 970, 1212), 8.0),
]


@dataclass(frozen=True)
class Pair:
    name: str
    screen: str
    ref: str
    box: Box | None = None  # crop of the screenshot; None = whole stage
    ref_is_crop: bool = False  # the reference is already cut to `box`


TIMER_BOX: Box = (584, 996, 970, 1212)  # the area timer-normal.png was cut from
HUD_ROW: Box = (240, 996, 1262, 1212)
POPUP_AREA: Box = (180, 1625, 1320, 2265)
BOARD_TOP: Box = (66, 1350, 1443, 1950)
BOARD_BOTTOM: Box = (66, 1940, 1443, 2546)

PAIRS: list[Pair] = [
    # Whole stages, as the brief lists them.
    Pair("ready", "ready.png", "01-ready.jpg"),
    Pair("timeup-board", "timeup-board.png", "02-timeup-revealed.jpg"),
    Pair("timeup-popup", "timeup-popup.png", "03-timeup-popup.jpg"),
    Pair("won-popup", "won-popup.png", "03-timeup-popup.jpg"),
    Pair("playing-timer", "playing.png", "timer-normal.png", TIMER_BOX, ref_is_crop=True),
    # Crops for looking closely at what the browser draws.
    Pair("ready-hud", "ready.png", "01-ready.jpg", HUD_ROW),
    Pair("ready-board-top", "ready.png", "01-ready.jpg", BOARD_TOP),
    Pair("ready-board-bottom", "ready.png", "01-ready.jpg", BOARD_BOTTOM),
    Pair("timeup-board-top", "timeup-board.png", "02-timeup-revealed.jpg", BOARD_TOP),
    Pair("timeup-board-bottom", "timeup-board.png", "02-timeup-revealed.jpg", BOARD_BOTTOM),
    Pair("timeup-hud", "timeup-popup.png", "03-timeup-popup.jpg", HUD_ROW),
    Pair("timeup-popup-box", "timeup-popup.png", "03-timeup-popup.jpg", POPUP_AREA),
    Pair("won-popup-box", "won-popup.png", "03-timeup-popup.jpg", POPUP_AREA),
    Pair("won-prizes", "won-popup.png", "03-timeup-popup.jpg", (90, 630, 1490, 992)),
] + [Pair(c.slug, c.screen, c.ref, c.box) for c in CHECKS]


class CompareError(Exception):
    """An input is missing or has the wrong size."""


def load(path: Path, size: tuple[int, int] | None = STAGE_SIZE) -> Image.Image:
    if not path.is_file():
        raise CompareError(f"missing image: {path}")
    image = Image.open(path).convert("RGB")
    if size is not None and image.size != size:
        raise CompareError(f"{path.name}: size {image.size}, expected {size}")
    return image


def channel_means(a: Image.Image, b: Image.Image, box: Box) -> list[float]:
    """Mean absolute difference per RGB channel inside `box`."""
    diff = ImageChops.difference(a.crop(box), b.crop(box))
    return ImageStat.Stat(diff).mean


def side_by_side(ref: Image.Image, screen: Image.Image) -> Image.Image:
    width = ref.width + GUTTER + screen.width
    height = max(ref.height, screen.height)
    out = Image.new("RGB", (width, height), GUTTER_COLOUR)
    out.paste(ref, (0, 0))
    out.paste(screen, (ref.width + GUTTER, 0))
    return out


def run_checks(screens: Path, refs: Path) -> bool:
    ok = True
    for check in CHECKS:
        screen = load(screens / check.screen)
        ref = load(refs / check.ref)
        means = channel_means(screen, ref, check.box)
        worst = max(means)
        passed = worst <= check.limit
        ok = ok and passed
        per_channel = " ".join(f"{c}={m:.2f}" for c, m in zip("RGB", means))
        print(f"{'PASS' if passed else 'FAIL'}  {check.name:34} {check.box}  "
              f"mean diff {worst:5.2f} (limit {check.limit:.1f})  [{per_channel}]")
    return ok


def write_pairs(screens: Path, refs: Path, out: Path) -> None:
    out.mkdir(parents=True, exist_ok=True)
    for pair in PAIRS:
        screen = load(screens / pair.screen)
        if pair.box is None:
            ref = load(refs / pair.ref)
        else:
            screen = screen.crop(pair.box)
            if pair.ref_is_crop:
                ref = load(refs / pair.ref, size=screen.size)
            else:
                ref = load(refs / pair.ref).crop(pair.box)
        path = out / f"{pair.name}.png"
        side_by_side(ref, screen).save(path)
    print(f"wrote {len(PAIRS)} side-by-side images to {out}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--screens", type=Path, default=PROJECT_ROOT / "e2e/screens")
    parser.add_argument("--refs", type=Path, default=PROJECT_ROOT / "docs/design-reference")
    parser.add_argument("--out", type=Path, default=PROJECT_ROOT / "e2e/screens/compare")
    args = parser.parse_args()

    if not args.refs.is_dir():
        print(f"reference folder {args.refs} not found; skipping the comparison")
        return 0
    try:
        passed = run_checks(args.screens, args.refs)
        write_pairs(args.screens, args.refs, args.out)
    except CompareError as error:
        print(f"error: {error}", file=sys.stderr)
        return 1
    if not passed:
        print("some regions differ from the references by more than their limit")
        return 1
    print("all regions within their limits")
    return 0


if __name__ == "__main__":
    sys.exit(main())
