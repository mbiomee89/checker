from model import *
FOOD=0.32; PKG=2.0; SUB=200.0; PRN=500.0; PRN_M=PRN/12
BASK=[30,40,50,60,80,100,120,150,200]
MARK=[0.10,0.15,0.20,0.25,0.30,0.35,0.40]
KB=(1-PCT)/(1+VAT)   # variant B: fees on ex-VAT base
def cls(pct): return 'RED' if pct<0.15 else ('YELLOW' if pct<0.30 else 'GREEN')
def cost(p,food=FOOD,pkg=PKG): return food*p/(1+VAT)+pkg
def hs(P,markup,h=0,food=FOOD,pkg=PKG,k=K):
    p=P/(1+markup); n=P*k-D(P)-HP*h; c=cost(p,food,pkg); return dict(P=P,p=p,net=n,cost=c,cm=n-c,cmp=(n-c)/(P/(1+VAT)),dcm=p/(1+VAT)-c)
def be_pick_price(p):
    P=p/1.15/K
    for _ in range(50): P=(p/1.15+min(2.5,0.2*P))/K
    return P
def retention(p,m,kind):
    P=p*(1+m)
    n={'del':net_del(P,0),'hp':net_del(P,1),'pick':net_pick(P)}[kind]
    return n/(p/1.15)
def scan_threshold(pred,lo=20,hi=400,step=0.5):
    x=lo
    while x<=hi:
        if pred(x): return x
        x+=step
def volume(P,markup,orders_day,h,food=FOOD,pkg=PKG):
    N=orders_day*30; gmv=N*P; com=COM*gmv; pay=PAY*gmv; dl=N*D(P); hpc=N*h*HP; vat=gmv*VAT/(1+VAT)
    rev=gmv-vat-com-pay-dl-hpc; p=P/(1+markup); fc=N*food*p/(1+VAT); pk=N*pkg
    contrib=rev-fc-pk-SUB-PRN_M
    return dict(N=N,gmv=gmv,vat=vat,com=com,pay=pay,dl=dl,hpc=hpc,sub=SUB,prn=PRN_M,rev=rev,fc=fc,pk=pk,contrib=contrib,cmp=contrib/(gmv/(1+VAT)))
