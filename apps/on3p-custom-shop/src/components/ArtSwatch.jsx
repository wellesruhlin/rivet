import {useId} from 'react';
import {CROPS, PAIR_LEFTS, SKI_TOP, pairBox, skiPath, thumbArt, waistInset} from '../art-geometry.js';

// The tips of the pair, as a ski wall would show them. Uses the small thumbnail
// crop, placed in the same canvas coordinates as the full artwork.
export default function ArtSwatch({graphic, kind, className = 'art-swatch'}) {
  const id = useId().replace(/:/g, '');
  const box = pairBox(kind);
  const outline = PAIR_LEFTS[kind].map(left => skiPath(left, waistInset(106))).join(' ');
  const crop = CROPS.thumb[kind];
  const width = box.w / 0.6;
  const height = (width * 7) / 5;
  const x = box.x + box.w / 2 - width / 2;
  return (
    <svg className={className} viewBox={`${x} ${SKI_TOP - 34} ${width} ${height}`} aria-hidden="true">
      <defs>
        <clipPath id={`${id}-clip`}>
          <path d={outline} />
        </clipPath>
      </defs>
      <path d={outline} fill="#0d0e10" />
      <image href={thumbArt(graphic)} x={crop.x} y={crop.y} width={crop.w} height={crop.h} preserveAspectRatio="none" clipPath={`url(#${id}-clip)`} />
    </svg>
  );
}
