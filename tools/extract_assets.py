"""Extract the stage background and sprites from the designer's PSD.

Usage:
    python tools/extract_assets.py [--psd PATH] [--out src/assets/img]
                                   [--icons public/icons] [--refs docs/design-reference]

The Photoshop composite embedded in the PSD is the base of every image, because
psd-tools does not render Drop Shadow, Inner Shadow or Bevel effects. Layers are
rendered with psd-tools only where the composite cannot provide the pixels.

The script checks its own outputs and exits with status 1 on any failure.
"""

from __future__ import annotations

import argparse
import io
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter
from psd_tools import PSDImage

# Thai layer names must not crash the Windows console.
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

PROJECT_ROOT = Path(__file__).resolve().parent.parent
STAGE_SIZE = (1497, 2664)

Box = tuple[int, int, int, int]  # (left, top, right, bottom)


def rect(left: int, top: int, width: int, height: int) -> Box:
    """Convert a (left, top, width, height) stage area into a box."""
    return (left, top, left + width, top + height)


# Stage areas from the brief, given as (left, top, width, height).
CARDS_CLOSED = rect(75, 1360, 1356, 1165)
BOX1_ACTIVE = rect(90, 630, 662, 302)
BOX2_ACTIVE = rect(745, 630, 745, 362)
TIMER_NORMAL = rect(584, 996, 386, 216)
POPUP_CLOCK = rect(332, 1696, 191, 193)
POPUP_BREAD = rect(230, 2028, 192, 169)
POPUP_PEACH = rect(1058, 2036, 192, 161)
FIRST_CARD = rect(75, 1360, 187, 186)
ICON_RESTART_SIZE = (59, 63)
APP_ICON_SQUARE = 187
APP_ICON_SIZES = (192, 512)
# The square behind the first card matches the paper and the manifest background.
APP_ICON_BACKGROUND = (0xF7, 0xF7, 0xF7)

# Clean-paper patches for stage-bg: (description, box, paper group path).
# The board patch ends at x=1443 rather than the brief's 1446: in the composite,
# columns 1443-1446 are the paper's inner shadow, which psd-tools does not render,
# so the edge-ring check fails at 1446. The cards' own shadows end at x=1437.
PAPER_PATCHES: list[tuple[str, Box, tuple[str, ...]]] = [
    ("counter/timer/button row", (240, 996, 1262, 1212), ("Group 6",)),
    ("card board", (66, 1350, 1443, 2546), ("game", "Group 6 copy")),
]
PATCH_MIN_ALPHA = 250
RING_WIDTH = 3
RING_MAX_MEAN_DIFF = 2.0

# Prize boxes in their won state: (normal-state group, product sub-group, stage
# area, file name). The won-state group is the same name plus " active", and
# holds the same product sub-group: the picture, its white stroke and (box 2)
# the red tag, identical artwork in both states.
PRIZES: list[tuple[str, str, Box, str]] = [
    ("Box_1", "Group 10", BOX1_ACTIVE, "box1-active.webp"),
    ("Box_2", "Group 11", BOX2_ACTIVE, "box2-active.webp"),
]
# Inside the product's silhouette shrunk by this many px, an overlay must equal
# the composite to within this mean difference per channel.
PRODUCT_SHRINK = 2
PRODUCT_MAX_MEAN_DIFF = 1.0
# The product sub-group's Drop Shadow, which psd-tools does not draw. The PSD
# gives colour #67849d, opacity 43%, Normal blend, angle 90 (straight down),
# distance 3 px, size 3 px, spread 33%. Size and spread are drawn as a Gaussian
# blur and a gain on the blurred matte, fitted to the products' shadows on the
# white boxes in the composite: a mean error of 0.004 in shadow alpha.
PRODUCT_SHADOW_COLOUR = (0x67, 0x84, 0x9D)
PRODUCT_SHADOW_OPACITY = 0.43
PRODUCT_SHADOW_OFFSET = 3  # px down
PRODUCT_SHADOW_SIGMA = 1.2  # px
PRODUCT_SHADOW_GAIN = 2.0

STAGE_BG_MAX_BYTES = 3_000_000
WEBP_OPTIONS = {"quality": 95, "method": 6}
# Lossy WebP halves colour resolution, which smears the prize boxes' green
# border and coloured text; lossless keeps them sharp for a few kB more.
OVERLAY_WEBP_OPTIONS = {"lossless": True, "quality": 100, "method": 6}
# Layer renders carry a generated "sRGB built-in" profile whose bytes change on
# every run; the pixels are already sRGB, so leave it out to keep files stable.
PNG_OPTIONS = {"optimize": True, "icc_profile": None}


class ExtractError(Exception):
    """A check failed; the message says what and the measured values."""


def find_psd(root: Path) -> Path:
    candidates = sorted(root.glob("*.psd"))
    if len(candidates) != 1:
        raise ExtractError(
            f"expected exactly one *.psd in {root}, found {len(candidates)}; pass --psd"
        )
    return candidates[0]


def find_layer(container, path: tuple[str, ...], left: int | None = None):
    """Walk the layer tree by name, top level first.

    `left` disambiguates siblings that share the last name in the path.
    """
    for depth, name in enumerate(path):
        is_leaf = depth == len(path) - 1
        matches = [
            layer
            for layer in container
            if layer.name == name and (not is_leaf or left is None or layer.left == left)
        ]
        if len(matches) != 1:
            where = "/".join(path[: depth + 1])
            extra = f" with left={left}" if is_leaf and left is not None else ""
            raise ExtractError(f"expected one layer '{where}'{extra}, found {len(matches)}")
        container = matches[0]
    return container


def reveal(layer) -> None:
    """Make a layer and every group above it visible so it renders."""
    while layer is not None and not isinstance(layer, PSDImage):
        layer.visible = True
        layer = layer.parent


def render(layer, viewport: Box, label: str, force: bool = True) -> Image.Image:
    """Render a layer or group into an RGBA image the size of the viewport.

    Always pass a viewport: hidden groups report a zero-size bounding box.
    `force=False` builds each layer from the pixels Photoshop stored for it.
    """
    reveal(layer)
    image = layer.composite(viewport=viewport, force=force)
    expected = (viewport[2] - viewport[0], viewport[3] - viewport[1])
    if image is None or image.size != expected:
        got = None if image is None else image.size
        raise ExtractError(f"{label}: render returned {got}, expected {expected}")
    return image.convert("RGBA")


def overlay(base: Image.Image, box: Box, layer_image: Image.Image) -> Image.Image:
    """Crop `box` from the RGB base and alpha-composite an RGBA render over it."""
    crop = base.crop(box).convert("RGBA")
    return Image.alpha_composite(crop, layer_image).convert("RGB")


def ring_mean_diff(a: Image.Image, b: Image.Image, width: int) -> np.ndarray:
    """Mean absolute difference per RGB channel over the outer `width` px ring."""
    pa = np.asarray(a.convert("RGB"), dtype=np.float64)
    pb = np.asarray(b.convert("RGB"), dtype=np.float64)
    mask = np.zeros(pa.shape[:2], dtype=bool)
    mask[:width, :] = True
    mask[-width:, :] = True
    mask[:, :width] = True
    mask[:, -width:] = True
    return np.abs(pa[mask] - pb[mask]).mean(axis=0)


def apply_paper_patch(psd: PSDImage, stage: Image.Image, composite: Image.Image,
                      label: str, box: Box, group_path: tuple[str, ...]) -> None:
    paper = render(find_layer(psd, group_path), box, label)

    min_alpha = int(np.asarray(paper.getchannel("A")).min())
    if min_alpha < PATCH_MIN_ALPHA:
        raise ExtractError(
            f"patch '{label}' {box}: minimum alpha {min_alpha} < {PATCH_MIN_ALPHA}"
        )

    patched = overlay(composite, box, paper)
    diff = ring_mean_diff(patched, composite.crop(box), RING_WIDTH)
    values = ", ".join(f"{c}={d:.2f}" for c, d in zip("RGB", diff))
    if diff.max() > RING_MAX_MEAN_DIFF:
        raise ExtractError(
            f"patch '{label}' {box}: {RING_WIDTH}px edge ring differs from the composite "
            f"by mean {values} (limit {RING_MAX_MEAN_DIFF} per channel)"
        )
    print(f"patch '{label}' {box}: min alpha {min_alpha}, edge ring mean diff {values}")
    stage.paste(patched, box[:2])


def product_silhouette(psd: PSDImage, group_name: str, product_name: str,
                       box: Box) -> Image.Image:
    """Coverage (L) of a prize's product sub-group, stroke and tag included.

    Rendered from the pixels Photoshop stored: under force=True psd-tools traces
    the vial's stroke from its vector mask, a clipping quadrilateral, rather
    than from the vial, which cuts the vial's side and leaves gaps.
    """
    product = find_layer(psd, (group_name, product_name))
    return render(product, box, f"{group_name}/{product_name}", force=False).getchannel("A")


def product_shadow(silhouette: Image.Image) -> np.ndarray:
    """Alpha (0-1, height x width x 1) of the drop shadow the product casts."""
    width, height = silhouette.size
    moved = Image.new("L", silhouette.size, 0)
    moved.paste(silhouette.crop((0, 0, width, height - PRODUCT_SHADOW_OFFSET)),
                (0, PRODUCT_SHADOW_OFFSET))
    matte = np.asarray(moved.filter(ImageFilter.GaussianBlur(PRODUCT_SHADOW_SIGMA)),
                       dtype=np.float64) / 255
    return (PRODUCT_SHADOW_OPACITY * np.minimum(matte * PRODUCT_SHADOW_GAIN, 1.0))[..., None]


def prize_won_overlay(psd: PSDImage, composite: Image.Image, group_name: str,
                      product_name: str, box: Box) -> Image.Image:
    """A prize box in its won state, with the product as Photoshop drew it.

    The won-state group is rendered without its product, the product's drop
    shadow is painted onto it, and the result goes over the composite crop. The
    composite's own product pixels are then pasted through the product's exact
    silhouette, so none of the normal state's white fill comes with them.
    """
    active = find_layer(psd, (f"{group_name} active",))
    active_product = find_layer(active, (product_name,))
    was_visible = active_product.visible
    active_product.visible = False
    won = np.asarray(render(active, box, f"{group_name} active"), dtype=np.float64)
    active_product.visible = was_visible

    silhouette = product_silhouette(psd, group_name, product_name, box)
    shadow = product_shadow(silhouette)
    won[..., :3] = won[..., :3] * (1 - shadow) + np.array(PRODUCT_SHADOW_COLOUR) * shadow
    won_image = Image.fromarray(np.rint(won).astype(np.uint8), "RGBA")

    crop = composite.crop(box)
    image = Image.composite(crop, overlay(composite, box, won_image), silhouette)
    check_product(f"{group_name} active", image, crop, silhouette)
    return image


def check_product(label: str, image: Image.Image, composite_crop: Image.Image,
                  silhouette: Image.Image) -> None:
    """Inside the product's silhouette, shrunk a little, the overlay is the composite."""
    covered = silhouette.point(lambda v: 255 if v else 0)
    inner = np.asarray(covered.filter(ImageFilter.MinFilter(2 * PRODUCT_SHRINK + 1))) > 0
    if not inner.any():
        raise ExtractError(f"{label}: the product silhouette shrunk by {PRODUCT_SHRINK}px is empty")
    ours = np.asarray(image.convert("RGB"), dtype=np.float64)[inner]
    theirs = np.asarray(composite_crop.convert("RGB"), dtype=np.float64)[inner]
    diff = np.abs(ours - theirs).mean(axis=0)
    values = ", ".join(f"{c}={d:.2f}" for c, d in zip("RGB", diff))
    if diff.max() > PRODUCT_MAX_MEAN_DIFF:
        raise ExtractError(
            f"{label}: inside the product silhouette shrunk by {PRODUCT_SHRINK}px "
            f"({int(inner.sum())} px) the overlay differs from the composite by mean {values} "
            f"(limit {PRODUCT_MAX_MEAN_DIFF} per channel)"
        )
    print(f"{label}: product silhouette shrunk by {PRODUCT_SHRINK}px ({int(inner.sum())} px), "
          f"mean diff from the composite {values}")


class Writer:
    """Saves images, checks their pixel size and records what was written."""

    def __init__(self) -> None:
        self.written: list[tuple[Path, tuple[int, int], int]] = []

    def save(self, image: Image.Image, path: Path, expected_size: tuple[int, int],
             options: dict | None = None) -> int:
        if image.size != expected_size:
            raise ExtractError(f"{path.name}: size {image.size}, expected {expected_size}")
        path.parent.mkdir(parents=True, exist_ok=True)
        if options is None:
            options = WEBP_OPTIONS if path.suffix == ".webp" else PNG_OPTIONS
        image.save(path, **options)
        size = path.stat().st_size
        self.written.append((path, image.size, size))
        return size

    def report(self) -> None:
        print(f"wrote {len(self.written)} files:")
        for path, (w, h), size in self.written:
            try:
                shown = path.resolve().relative_to(PROJECT_ROOT)
            except ValueError:
                shown = path
            print(f"  {shown.as_posix():45} {w:>5}x{h:<5} {size:>10,} bytes")


def size_of(box: Box) -> tuple[int, int]:
    return (box[2] - box[0], box[3] - box[1])


def extract(psd_path: Path, out_dir: Path, icons_dir: Path, refs_dir: Path) -> None:
    writer = Writer()

    # 1. The Photoshop composite is ground truth for every image.
    psd = PSDImage.open(psd_path)
    composite = psd.topil().convert("RGB")
    if composite.size != STAGE_SIZE:
        raise ExtractError(f"composite size {composite.size}, expected {STAGE_SIZE}")

    # 2. Face-down cards, cut before the patches erase them.
    writer.save(composite.crop(CARDS_CLOSED), out_dir / "cards-closed.webp",
                size_of(CARDS_CLOSED))

    # 3-4. Stage background: clean paper over the parts the browser draws.
    stage = composite.copy()
    for label, box, group_path in PAPER_PATCHES:
        apply_paper_patch(psd, stage, composite, label, box, group_path)
    stage_bytes = writer.save(stage, out_dir / "stage-bg.webp", STAGE_SIZE)
    if stage_bytes > STAGE_BG_MAX_BYTES:
        raise ExtractError(f"stage-bg.webp is {stage_bytes:,} bytes, limit {STAGE_BG_MAX_BYTES:,}")

    # 5. Hidden groups drawn over the untouched composite: the prizes won, then
    #    the timer with time left.
    for group_name, product_name, box, file_name in PRIZES:
        image = prize_won_overlay(psd, composite, group_name, product_name, box)
        writer.save(image, out_dir / file_name, size_of(box), OVERLAY_WEBP_OPTIONS)
    timer = render(find_layer(psd, ("เวลา",)), TIMER_NORMAL, "เวลา")
    writer.save(overlay(composite, TIMER_NORMAL, timer), refs_dir / "timer-normal.png",
                size_of(TIMER_NORMAL))

    # 6. Transparent sprites.
    restart = find_layer(psd, ("BT เริ่มเกมส์ใหม่", "Vector Smart Object"))
    writer.save(render(restart, restart.bbox, "restart icon"), out_dir / "icon-restart.png",
                ICON_RESTART_SIZE)
    for name, layer_path, box, left in [
        ("popup-clock", ("Popup", "Halftone Analog Clock Face copy"), POPUP_CLOCK, None),
        ("popup-bread", ("Popup", "Vector Smart Object"), POPUP_BREAD, POPUP_BREAD[0]),
        ("popup-peach", ("Popup", "Vector Smart Object"), POPUP_PEACH, POPUP_PEACH[0]),
    ]:
        layer = find_layer(psd, layer_path, left=left)
        writer.save(render(layer, box, name), out_dir / f"{name}.png", size_of(box))

    # 7. App icons: the first face-down card centred on a square, then resized.
    card = composite.crop(FIRST_CARD)
    square = Image.new("RGB", (APP_ICON_SQUARE, APP_ICON_SQUARE), APP_ICON_BACKGROUND)
    square.paste(card, ((APP_ICON_SQUARE - card.width) // 2,
                        (APP_ICON_SQUARE - card.height) // 2))
    for px in APP_ICON_SIZES:
        icon = square.resize((px, px), Image.Resampling.LANCZOS)
        writer.save(icon, icons_dir / f"icon-{px}.png", (px, px))

    # 8. List what was written.
    writer.report()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--psd", type=Path, help="PSD file (default: the only *.psd in the project root)")
    parser.add_argument("--out", type=Path, default=PROJECT_ROOT / "src/assets/img")
    parser.add_argument("--icons", type=Path, default=PROJECT_ROOT / "public/icons")
    parser.add_argument("--refs", type=Path, default=PROJECT_ROOT / "docs/design-reference")
    args = parser.parse_args()
    try:
        psd_path = args.psd if args.psd is not None else find_psd(PROJECT_ROOT)
        if not psd_path.is_file():
            raise ExtractError(f"PSD not found: {psd_path}")
        extract(psd_path, args.out, args.icons, args.refs)
    except ExtractError as error:
        print(f"error: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
