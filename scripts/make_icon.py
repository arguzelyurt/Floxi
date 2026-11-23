from PIL import Image, ImageDraw, ImageFilter
S=4096  # 4x supersample of 1024
NAVY=(15,27,45); RAIL=(30,50,80); EDGE=(47,76,116); BOARD=(10,20,36)
COLORS=[(255,90,95),(255,159,28),(255,210,63),(59,206,122),(46,196,182),(58,134,255),(155,93,229),(241,91,181)]
def base(transparent=False, scale=1.0):
    img=Image.new('RGBA',(S,S),(0,0,0,0) if transparent else NAVY+(255,))
    d=ImageDraw.Draw(img)
    if not transparent:
        # yumuşak ışık
        glow=Image.new('RGBA',(S,S),(0,0,0,0)); g=ImageDraw.Draw(glow)
        g.ellipse([S*0.15,S*0.1,S*0.85,S*0.8],fill=(40,70,120,120))
        glow=glow.filter(ImageFilter.GaussianBlur(S*0.08)); img.alpha_composite(glow)
        d=ImageDraw.Draw(img)
    c=S/2; R=S*0.37*scale; T=S*0.085*scale
    # ray
    d.rounded_rectangle([c-R,c-R,c+R,c+R],radius=R*0.32,fill=RAIL,outline=EDGE,width=int(S*0.012*scale))
    bi=R-T
    d.rounded_rectangle([c-bi,c-bi,c+bi,c+bi],radius=bi*0.14,fill=BOARD)
    # mozaik 4x4
    grid=[[None,0,0,None],[2,5,5,7],[2,5,5,7],[None,3,3,None]]
    n=4; cell=(2*bi*0.86)/n; ox=c-cell*n/2; oy=c-cell*n/2; gap=cell*0.1
    for y in range(n):
        for x in range(n):
            k=grid[y][x]
            if k is None: continue
            x0=ox+x*cell+gap/2; y0=oy+y*cell+gap/2; x1=x0+cell-gap; y1=y0+cell-gap
            d.rounded_rectangle([x0,y0,x1,y1],radius=cell*0.2,fill=COLORS[k])
            ov=Image.new('RGBA',(S,S),(0,0,0,0)); od=ImageDraw.Draw(ov)
            od.rounded_rectangle([x0,y0,x1,y0+(y1-y0)*0.34],radius=cell*0.2,fill=(255,255,255,55))
            img.alpha_composite(ov); d=ImageDraw.Draw(img)
    # ray durakları
    for i in range(9):
        t=i/8; px=c-R+T/2+(2*R-T)*t
        d.ellipse([px-S*0.008,c+R-T/2-S*0.008,px+S*0.008,c+R-T/2+S*0.008],fill=(86,204,242,140))
    # flox + iz (alt kenarda, sağa doğru gidiyor)
    fy=c+R-T/2; fr=T*0.78
    ov=Image.new('RGBA',(S,S),(0,0,0,0)); od=ImageDraw.Draw(ov)
    for k,(off,a) in enumerate([(0.62,60),(0.44,100),(0.27,150)]):
        rr=fr*(0.45+0.12*k); fx=c+R*0.18-R*off
        od.ellipse([fx-rr,fy-rr,fx+rr,fy+rr],fill=(242,201,76,a))
    img.alpha_composite(ov); d=ImageDraw.Draw(img)
    fx=c+R*0.18
    d.ellipse([fx-fr,fy-fr,fx+fr,fy+fr],fill=(242,201,76),outline=(255,255,255),width=int(S*0.01*scale))
    ov=Image.new('RGBA',(S,S),(0,0,0,0)); od=ImageDraw.Draw(ov)
    od.ellipse([fx-fr*0.55,fy-fr*0.6,fx-fr*0.12,fy-fr*0.17],fill=(255,255,255,170))
    img.alpha_composite(ov)
    return img
def save(img,size,path,rgb=True):
    out=img.resize((size,size),Image.LANCZOS)
    if rgb: out=out.convert('RGB')
    out.save(path)
icon=base()
save(icon,1024,'icon.png')
save(icon,48,'favicon.png')
# Android adaptif ön plan: şeffaf, güvenli alana sığsın diye küçük
save(base(transparent=True,scale=0.72),1024,'android-icon-foreground.png',rgb=False)
# Açılış: şeffaf logo
save(base(transparent=True,scale=0.95),1024,'splash-icon.png',rgb=False)
print('ok')
