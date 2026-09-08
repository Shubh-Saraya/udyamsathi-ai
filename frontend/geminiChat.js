(()=>{
  const postJson=(url,value)=>fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(value)}).then(async response=>{const data=await response.json();if(!response.ok)throw Error(data.error||'Request failed');return data});
  const money=value=>'₹'+Math.round(Number(value)||0).toLocaleString('en-IN');
  const escape=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  let history=[];
  function contextFromAssessment(x){
    return {language:x?.profile?.language||document.getElementById('lang')?.value||'en',business:x?.profile?.business,village:x?.profile?.village,district:x?.profile?.district,capital:x?.profile?.capital,experience:x?.profile?.experience,businessScore:x?.viability,borrowDecision:x?.borrow?.decision,reserve:x?.financial?.reserve?money(x.financial.reserve):null,recommendedProjectSize:x?.financial?.recommendedCost?money(x.financial.recommendedCost):null,recommendedLoan:x?.financial?.recommendedLoan?money(x.financial.recommendedLoan):null,monthlySurplus:x?.financial?.surplus?money(x.financial.surplus):null,emi:x?.financial?.repayment?money(x.financial.repayment):null,dscr:x?.financial?.dscr,risks:(x?.risks||[]).slice(0,4).map(item=>({name:item.name,action:item.action})),roadmap:(x?.roadmap||[]).slice(0,4).map(item=>({phase:item.phase,target:item.target})),schemeMatches:(x?.schemeMatches||[]).slice(0,4).map(item=>({name:item.name,eligibilityScore:item.eligibilityScore,matchReasons:item.matchReasons,warnings:item.warnings}))};
  }
  window.ask=async()=>{
    const input=document.getElementById('question'),answer=document.getElementById('answer');
    const question=String(input?.value||'').trim();
    if(!question||!answer)return;
    const x=typeof latest!=='undefined'?latest:null;
    answer.textContent='Thinking…';
    try{
      const result=await postJson('/api/chat',{question,context:contextFromAssessment(x),history});
      answer.innerHTML=escape(result.text).replace(/\n/g,'<br>');
      history.push({role:'user',text:question},{role:'model',text:result.text});
      history=history.slice(-8);
      if(result.provider==='local-fallback')answer.innerHTML+='<small class="muted"><br>Using the built-in advisory fallback. Add AI_API_KEY later to enable Gemini.</small>';
    }catch(error){answer.textContent='The business helper is temporarily unavailable. Your local blueprint and financial tools are still available.';console.error(error)}
  };
})();
