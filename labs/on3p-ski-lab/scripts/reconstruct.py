"""Deterministic measurement of original ON3P image pixels; no generated imagery.
Usage: python scripts/reconstruct.py --sources <downloaded HTML/JSON directory>
Requires Pillow and numpy. Original reference images are never modified.
"""
import argparse, hashlib, json, re
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
MODELS = ['jeffrey-106', 'woodsman-108', 'jeffrey-112']

def smooth(a, size=21):
    a = np.asarray(a, dtype=float)
    x=np.linspace(-2,2,size); k=np.exp(-x*x/2); k/=k.sum()
    return np.convolve(np.pad(a,(size//2,size//2),mode='edge'), k, mode='valid')

def bounds(mask, x0, x1):
    part=mask[:,x0:x1]; valid=part.any(axis=1)
    y=np.flatnonzero(valid)
    l=part.argmax(axis=1)+x0
    r=x1-1-part[:,::-1].argmax(axis=1)
    return y, l, r

def sample(a, n=241):
    return np.interp(np.linspace(0,len(a)-1,n),np.arange(len(a)),a).round(5).tolist()

def profile_from_pair(mask):
    # Pair must be vertical, noses at the top. Both bases face the interior.
    ys,l,r=bounds(mask,0,mask.shape[1])
    y0,y1=int(ys[0]),int(ys[-1]); mid=(l+r)/2
    h=[]; t=[]; coords=[]
    for y in range(y0,y1+1):
        row=mask[y]; indices=np.flatnonzero(row)
        gaps=np.flatnonzero(np.diff(indices)>1)
        if len(gaps):
            k=gaps[np.argmax(np.diff(indices)[gaps])]
            il,ir=indices[k],indices[k+1]
            gap=max(0,ir-il-1)
            thickness=((il-indices[0]+1)+(indices[-1]-ir+1))/2
        else:
            il=ir=mid[y]; gap=0; thickness=len(indices)/2
        h.append(gap/2); t.append(thickness)
        coords.append([y,float(il),float(ir),int(l[y]),int(r[y])])
    # Prevent rounded end-cap pixels from being mistaken for zero construction thickness.
    height=smooth(h,25)
    thick=smooth(t,41)
    # The two rounded caps do not begin at the same row. Complete the last 1%
    # from the fully visible curve, rather than interpreting a missing mate as 0 rise.
    n=max(25,int(len(height)*.01))
    height[:n]=np.linspace(height[n]+height[n]-height[2*n],height[n],n)
    height[-n:]=np.linspace(height[-n-1],height[-n-1]+height[-n-1]-height[-2*n-1],n)
    return y0,y1,height,thick,coords

def main(src):
    data={'schemaVersion':1,'brand':'ON3P','season':'2026/27','retrieved':'2026-09-24','models':[]}
    for handle in MODELS:
        if (src/f'{handle}.html').exists():
            html=(src/f'{handle}.html').read_text(encoding='utf-8-sig')
            match=re.search(r'<script type="application/json" id="pd-fyl-model">(.*?)</script>',html,re.S)
            spec=json.loads(match.group(1))
            product=json.loads((src/f'{handle}-product.json').read_text(encoding='utf-8-sig'))['product']
        else:
            metadata=json.loads((src/f'{handle}.json').read_text(encoding='utf-8'))
            spec=metadata['spec'];product=metadata['product']
        image=Image.open(ROOT/'reference'/f'{handle}-composite.png')
        rgba=np.array(image); mask=rgba[:,:,3]>127
        ys,left,right=bounds(mask,610,910)
        y0,y1=int(ys[0]),int(ys[-1]); rows=np.arange(y0,y1+1)
        raw=smooth(right[rows]-left[rows]+1,31)
        a=int(np.argmax(raw[:len(raw)//3])); b=int(np.argmin(raw[len(raw)//3:2*len(raw)//3]))+len(raw)//3
        c=int(np.argmax(raw[2*len(raw)//3:]))+2*len(raw)//3
        ref=next(s for s in spec['lengths'] if s['length_cm']==186)
        factor=1860/(y1-y0)
        # Normalized stations preserve the photographed curve; three scalar constraints
        # define its widths for each size. The original unconstrained trace is retained.
        normalized=np.zeros_like(raw)
        knots=[a,b,c]
        raw[0]=raw[-1]=0
        t=np.linspace(0,1,len(raw))
        source_profile='product-composite'
        pmask=mask[:,1200:]
        py0,py1,h,th,coords=profile_from_pair(pmask)
        profile_width=pmask.shape[1]
        shared=handle=='jeffrey-112'
        if shared:
            # The model composite duplicates the 106 profile pixel for pixel. Use the
            # family-specific published diagram instead, recording its unknown scale.
            guide=np.array(Image.open(ROOT/'reference'/'signature-pow-profile-guide.png').convert('RGBA'))
            gm=guide[:,:,3]>127
            # Rotate so original right-hand nose becomes the top of a vertical pair.
            pmask=np.rot90(gm)
            py0,py1,h,th,coords=profile_from_pair(pmask)
            source_profile='signature-pow-profile-guide'
            profile_width=pmask.shape[1]
        pf=1860/(py1-py0)
        interior=coords[int(.05*len(coords)):int(.95*len(coords))]
        center_fit=np.polyfit([row[0] for row in interior],[(row[1]+row[2])/2 for row in interior],1)
        center_line=[float(np.polyval(center_fit,py0)),float(np.polyval(center_fit,py1))]
        height=h*pf
        gradient=np.gradient(height,1860/(len(h)-1))
        thickness=th*pf/np.sqrt(1+gradient*gradient)
        thickness=np.maximum(thickness,3.8)
        # Near the rounded caps, silhouette thickness includes end shape/projection.
        # Explicitly estimated 4 mm ends replace this unresolved portion.
        end=int(.08*len(thickness))
        blend=np.linspace(0,1,end); blend=blend*blend*(3-2*blend)
        thickness[:end]=4+(thickness[end]-4)*blend
        thickness[-end:]=thickness[-end-1]+(4-thickness[-end-1])*blend
        # Pixel variation near contact is a plateau: use its center as the transition.
        first=height[:int(.4*len(h))]; last=height[int(.6*len(h)):]
        ci=int(np.mean(np.flatnonzero(first<=first.min()+.20)))
        cj=int(.6*len(h))+int(np.mean(np.flatnonzero(last<=last.min()+.20)))
        base=float(min(height[ci],height[cj])); height=np.maximum(0,height-base)
        camber=float(max(height[ci:cj+1]))
        top=[]
        for lo,hi in [(0,315),(315,615),(610,910),(910,1180)]:
            yy,ll,rr=bounds(mask,lo,hi)
            v0,v1=int(yy[0]),int(yy[-1]); q=np.linspace(v0,v1,241)
            top.append({'y0':v0,'y1':v1,'left':np.interp(q,np.arange(len(ll)),ll).round(3).tolist(),'right':np.interp(q,np.arange(len(rr)),rr).round(3).tolist()})
        warnings=[
            '186 cm is printed on the topsheet; projected length is assumed equal to nominal length for calibration.',
            'The source is a manufacturer composite, not a calibrated orthographic photograph or CAD.',
            'Paired skis are assumed uncompressed at the contact zones; loading and compositing are unverified.',
            'Other sizes use their published widths with scaled reference curves; size-specific profiles are estimated.',
            'Central thickness comes from silhouette separation; the outer 8% at each end tapers to an estimated 4 mm. Layer boundaries and sidewall bevel are estimated.',
            'The outermost 1% of each rocker end is extrapolated to avoid incomplete paired-cap pixels.'
        ]
        if shared: warnings.insert(0,'Product-composite profile is pixel-identical to Jeffrey 106 despite a different rocker family. Using the Signature Pow family diagram, with assumed 186 cm calibration; absolute heights remain estimated.')
        model={**spec,'referenceLengthMm':1860,'referenceImage':f'reference/{handle}-composite.png',
            'sourceUrl':f'https://www.on3pskis.com/products/{handle}', 'imageUrl':product['images'][0]['src'],
            'imageSha256':hashlib.sha256((ROOT/'reference'/f'{handle}-composite.png').read_bytes()).hexdigest(),
            'outline':{'status':'image-derived, constrained to published widths','y0':y0,'y1':y1,'xRegion':[610,910],
                'widthPx':sample(raw),'landmarks':[round(k/(len(raw)-1),7) for k in knots],
                'rawWidthsMm':[round(float(raw[k]*factor),2) for k in knots],
                'publishedWidthsMm':[ref['tip_mm'],ref['waist_mm'],ref['tail_mm']],
                'maxWidthCorrectionPct':round(max(abs(ref[key]/(raw[k]*factor)-1)*100 for key,k in zip(['tip_mm','waist_mm','tail_mm'],knots)),2),
                'leftPx':sample(left[rows]),'rightPx':sample(right[rows])},
            'profile':{'status':'estimated from family diagram' if shared else 'image-derived; unloaded condition unverified',
                'source':source_profile,'y0':py0,'y1':py1,'cropX':0 if shared else 1200,
                'centerLinePx':center_line,
                'heightMm':sample(height),'thicknessMm':sample(thickness),
                'contactU':[round(ci/(len(h)-1),7),round(cj/(len(h)-1),7)],
                'tipRiseMm':round(float(height[0]),2),'tailRiseMm':round(float(height[-1]),2),'camberMm':round(camber,2),
                'underfootThicknessMm':round(float(thickness[len(h)//2]),2),
                'rawTracePx':coords[::10]},
            'construction':{'baseThicknessMm':1.8,'steelWidthMm':2.5,'steelHeightMm':2.5,
                'steelWrap':'Published 3/4 wrap; exact termination missing',
                'estimatedTipSteelStartU':.045,'estimatedShoulderMm':.45},
            'artBounds':top,'warnings':warnings}
        # Keep source metadata without repeated marketing copy.
        model.pop('description',None)
        data['models'].append(model)
        print(handle,json.dumps({'rawWidths':model['outline']['rawWidthsMm'],'constraintCorrectionPct':model['outline']['maxWidthCorrectionPct'],
            'profile':[model['profile'][k] for k in ['tipRiseMm','camberMm','tailRiseMm','underfootThicknessMm']]}))
    (ROOT/'data').mkdir(exist_ok=True)
    (ROOT/'data'/'on3p.json').write_text(json.dumps(data,indent=2),encoding='utf-8')
    (ROOT/'data'/'source-notes.json').write_text(json.dumps({'profilePixelsIdentical':['jeffrey-106','jeffrey-112'],
        'comparisonRegion':[1200,0,1667,3125],'comparison':'All RGBA pixel channels match exactly in this region.',
        'notIndependentValidation':'Fitting an image to published dimensions does not verify those same dimensions independently.'},indent=2),encoding='utf-8')

if __name__=='__main__':
    p=argparse.ArgumentParser(); p.add_argument('--sources',required=True); args=p.parse_args(); main(Path(args.sources))
