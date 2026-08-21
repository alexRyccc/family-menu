from pathlib import Path
from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parent / 'public' / 'assets'
GROUPS = [ROOT / 'travel', ROOT / 'super-recommendations']


def save_jpeg(image, target):
    image.save(target, 'JPEG', quality=74, optimize=True, progressive=True)


travel = ROOT / 'travel'
if travel.exists():
    city_keys = sorted({path.stem.rsplit('-', 1)[0] for path in travel.glob('*-1.jpg')})
    focus_points = [(0.42, 0.48), (0.58, 0.50), (0.50, 0.42)]
    for city_key in city_keys:
        for source_index, target_index, centering in zip(range(1, 4), range(4, 7), focus_points):
            source = travel / f'{city_key}-{source_index}.jpg'
            target = travel / f'{city_key}-{target_index}.jpg'
            if not source.exists():
                continue
            with Image.open(source) as image:
                image = ImageOps.exif_transpose(image).convert('RGB')
                width, height = image.size
                detail = ImageOps.fit(
                    image,
                    (max(1, int(width * 0.82)), max(1, int(height * 0.82))),
                    Image.Resampling.LANCZOS,
                    centering=centering,
                )
                detail.thumbnail((960, 720), Image.Resampling.LANCZOS)
                save_jpeg(detail, target)
            print(f'{target.relative_to(ROOT)}: verified detail view')

for folder in GROUPS:
    if not folder.exists():
        continue
    for source in sorted(folder.glob('*.jpg')):
        with Image.open(source) as image:
            image = ImageOps.exif_transpose(image).convert('RGB')
            if image.width > 1280 or image.height > 960 or source.stat().st_size > 320 * 1024:
                image.thumbnail((1280, 960), Image.Resampling.LANCZOS)
                save_jpeg(image, source)
        print(f'{source.relative_to(ROOT)}: {source.stat().st_size // 1024} KB')
