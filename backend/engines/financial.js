export const R=n=>Math.round(n*100)/100;
export const projectCost=(margin,contribution=.1)=>{if(contribution<=0||contribution>1)throw Error('Invalid contribution');return R(margin/contribution)};
export const loanAmount=(cost,contribution=.1)=>R(cost*(1-contribution));
export const emi=(p,rate,months)=>{if(months<=0)throw Error('Tenure must be positive');let r=rate/1200;return R(r?p*r*(1+r)**months/((1+r)**months-1):p/months)};
export function schedule(principal,rate,months,moratorium=0,capitalise=true){let b=principal,r=rate/1200,a=[];for(let m=1;m<=moratorium;m++){let i=R(b*r),o=b;if(capitalise)b=R(b+i);a.push({month:m,opening:o,principal:0,interest:i,payment:capitalise?0:i,closing:b,moratorium:true})}let e=emi(b,rate,months);for(let k=1;k<=months;k++){let o=b,i=R(o*r),q=k===months?o:R(e-i),pay=R(q+i);b=R(o-q);a.push({month:moratorium+k,opening:o,principal:q,interest:i,payment:pay,closing:Math.max(0,b),moratorium:false})}return a}
export const cashSurplus=(revenue,ratio,fixed)=>R(revenue*(1-ratio)-fixed);
export const breakEven=(fixed,price,variable)=>price>variable?Math.ceil(fixed/(price-variable)):null;
export const dscr=(monthly,annualDebt)=>annualDebt?R(monthly*12/annualDebt):null;
export const recommended=(max,surplus,debt)=>R(max*Math.min(.85,Math.max(.45,surplus/debt>=1.5?.8:surplus/debt>=1.2?.65:.5)));
export const viability=({market,dscr,risk,capital})=>Math.max(0,Math.min(100,Math.round(market*.32+Math.min(dscr/2,1)*28+(100-risk)*.22+capital*.18)));