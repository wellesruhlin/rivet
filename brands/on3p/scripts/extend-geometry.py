"""Add catalog coverage using public product silhouettes and disclosed family profiles.

Run with the bundled Python (Pillow/numpy): scripts/extend-geometry.py
Public product metadata/images are cached in ../../work/stock-2027.
The dependency-free Blender/browser kernel is unchanged.
"""
from pathlib import Path
import copy, hashlib, json
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
BRAND = ROOT
SOURCE = ROOT / '../../work/stock-2027'
catalog = json.loads((BRAND / 'src/catalog.json').read_text(encoding='utf-8'))
data = json.loads((BRAND / 'src/geometry/traced-models.json').read_text(encoding='utf-8'))
models = {m['handle']: m for m in data['models']}
originals = {'jeffrey-106', 'woodsman-108', 'jeffrey-112'}

def sample(values):
    return np.interp(np.linspace(0, len(values)-1, 241), np.arange(len(values)), values).round(5).tolist()

for spec in catalog['models']:
    handle = spec['handle']
    if handle in originals:
        continue
    donor = models['jeffrey-112' if spec['rocker'] == 'Signature Pow' else 'woodsman-108' if spec['family'] in ['Woodsman', 'Billy Goat'] else 'jeffrey-106']
    model = copy.deepcopy(donor)
    model.update(spec)
    model.pop('description', None)
    model['sourceUrl'] = f'https://www.on3pskis.com/products/{handle}'
    model['profile']['status'] = f"Estimated from {donor['name']} rocker family; not a model-specific trace"
    model['profile']['source'] = donor['handle'] + '-family-estimate'
    model['profileReference'] = donor['sourceUrl']
    model['warnings'] = ['Visualization only, not factory CAD.',
        f"Rocker, camber and thickness estimated from {donor['name']}; length and widths use this model's published specifications."]
    file = SOURCE / f'{handle}-composite.png'
    if file.exists():
        image = np.asarray(Image.open(file).convert('RGBA'))
        assert image.shape[:2] == (3125, 1667), (handle, image.shape)
        # The first base is a clean silhouette without the glow around the tops.
        mask = image[:, 610:910, 3] > 127
        rows = np.flatnonzero(mask.any(axis=1))
        assert len(rows) > 2700, handle
        left = mask.argmax(axis=1) + 610
        right = 909 - mask[:, ::-1].argmax(axis=1)
        raw = (right[rows] - left[rows] + 1).astype(float)
        kernel = np.exp(-np.linspace(-2, 2, 31)**2 / 2); kernel /= kernel.sum()
        raw = np.convolve(np.pad(raw, (15, 15), mode='edge'), kernel, mode='valid')
        raw[0] = raw[-1] = 0
        # Landmark constraints must use the final sampled curve; choosing peaks
        # before resampling can leave tiny widths outside the print UV bounds.
        widths = sample(raw)
        n = len(widths)
        stations = [int(np.argmax(widths[:n//3])), int(np.argmin(widths[n//3:2*n//3])) + n//3, int(np.argmax(widths[2*n//3:])) + 2*n//3]
        assert 0 < stations[0] < stations[1] < stations[2] < n-1, (handle, stations)
        model['outline'] = {'status': 'Public product-image trace, constrained to published dimensions',
            'y0': int(rows[0]), 'y1': int(rows[-1]), 'xRegion': [610, 910],
            'widthPx': widths, 'landmarks': [i/(n-1) for i in stations]}
        product = json.loads((SOURCE / f'{handle}.json').read_text(encoding='utf-8'))['product']
        model['imageUrl'] = product['images'][0]['src']
        model['imageSha256'] = hashlib.sha256(file.read_bytes()).hexdigest()
        model['referenceImage'] = f'work/stock-2027/{file.name}'
        model['geometryEvidence'] = 'outline-traced-profile-estimated'
    else:
        model['sourceUrl'] = 'https://www.on3pskis.com/products/custom-skis'
        model['outline']['status'] = 'Family outline estimate, constrained to this model’s published widths'
        model['geometryEvidence'] = 'family-estimate'
        model['warnings'].append('No current stock product image found; planform is a family estimate.')
    models[handle] = model

# Legacy/custom-only Billy Goats use the traced RES family outline, rather than
# borrowing a freestyle planform. Keep this substitution explicit in provenance.
for handle in ['billy-goat-102', 'billy-goat-108']:
    models[handle]['outline'] = copy.deepcopy(models['billy-goat-114']['outline'])
    models[handle]['outline']['status'] = 'Billy Goat 114 family outline estimate, constrained to published widths'
    models[handle]['outlineReference'] = models['billy-goat-114']['sourceUrl']
    models[handle]['imageUrl'] = models['billy-goat-114']['imageUrl']
    models[handle]['imageSha256'] = models['billy-goat-114']['imageSha256']

data['models'] = [models[m['handle']] for m in catalog['models']]
(BRAND / 'src/geometry/traced-models.json').write_text(json.dumps(data, indent=2), encoding='utf-8')
print('Geometry coverage:', len(data['models']), 'models')
