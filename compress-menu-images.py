from pathlib import Path
from PIL import Image


UPLOADS = Path(__file__).resolve().parent / 'uploads'

for source in sorted(UPLOADS.glob('menu-*.png')):
    target = source.with_suffix('.webp')
    with Image.open(source) as image:
        image = image.convert('RGB')
        image.thumbnail((960, 640), Image.Resampling.LANCZOS)
        image.save(target, 'WEBP', quality=78, method=6)
    print(f'{source.name} -> {target.name}')
