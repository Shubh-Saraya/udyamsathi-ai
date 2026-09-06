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

// Planning thresholds, deliberately kept in one place. They are UdyamSathi
// guidance only; a lender or a government scheme makes its own decision.
export const affordabilityThresholds={comfortable:0.20,caution:0.35};
const number=(value,name,{minimum=0,required=false}={})=>{
  if(value===null||value===undefined||value===''){if(required)throw Error('INVALID_'+name.toUpperCase());return null}
  const parsed=Number(value);
  if(!Number.isFinite(parsed)||parsed<minimum)throw Error('INVALID_'+name.toUpperCase());
  return parsed;
};

export function calculateLoan({amount,annualRate,years,monthlySales=null,monthlyExpenses=null,existingMonthlyLoans=0}={}){
  const principal=number(amount,'loan_amount',{minimum:1,required:true});
  const rate=number(annualRate,'interest_rate',{minimum:0,required:true});
  const duration=number(years,'loan_duration',{minimum:1,required:true});
  if(duration>40)throw Error('INVALID_LOAN_DURATION');
  const sales=number(monthlySales,'monthly_sales');
  const expenses=number(monthlyExpenses,'monthly_expenses');
  const existing=number(existingMonthlyLoans,'existing_monthly_loans')??0;
  const months=Math.round(duration*12);
  const monthlyEmi=emi(principal,rate,months);
  const totalRepayment=R(monthlyEmi*months);
  const totalInterest=R(totalRepayment-principal);
  const canAssess=sales!==null&&expenses!==null;
  const surplus=canAssess?R(sales-expenses-existing):null;
  const emiShare=surplus&&surplus>0?R(monthlyEmi/surplus):null;
  const affordability=!canAssess?'NEED_INCOME_INFO':surplus<=0?'TOO_HIGH':emiShare<=affordabilityThresholds.comfortable?'COMFORTABLE':emiShare<=affordabilityThresholds.caution?'CAUTION':'TOO_HIGH';
  return {amount:principal,annualRate:rate,years:duration,months,monthlyEmi,totalInterest,totalRepayment,monthlySales:sales,monthlyExpenses:expenses,existingMonthlyLoans:existing,surplus,emiShare,affordability,thresholds:affordabilityThresholds};
}
