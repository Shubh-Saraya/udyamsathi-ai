const GEMINI_BASE_URL='https://generativelanguage.googleapis.com/v1beta/models';

export const geminiConfigured=()=>Boolean(String(process.env.AI_API_KEY||process.env.GEMINI_API_KEY||'').trim());

export function buildChatPrompt({question,context,history=[]}){
  const safeHistory=Array.isArray(history)?history.slice(-6).map(item=>({role:item?.role==='model'?'model':'user',text:String(item?.text||'').slice(0,1200)})).filter(item=>item.text):[];
  return `You are VyaparGuide AI, a practical business advisor for rural and micro entrepreneurs in India.\n\nRULES:\n- Answer in the user's requested language: English, Hindi, or Marathi.\n- Use only the supplied business context for factual financial, village, score, loan and scheme claims.\n- Never invent scheme eligibility, loan approval, interest rates, village demand, competitor counts, government statistics, or financial figures.\n- Do not override the deterministic calculations. Explain them in simple language.\n- If the context says evidence is unavailable, clearly say that and suggest local verification.\n- Give practical next steps. Keep the answer concise and easy to understand.\n- You are a decision-support assistant, not a bank, lender, government officer, lawyer, or accountant.\n\nBUSINESS CONTEXT:\n${JSON.stringify(context,null,2)}\n\nRECENT CONVERSATION:\n${JSON.stringify(safeHistory,null,2)}\n\nUSER QUESTION:\n${String(question||'').slice(0,2000)}`;
}

export function extractGeminiText(payload){
  return payload?.candidates?.flatMap(candidate=>candidate?.content?.parts||[]).map(part=>part?.text).filter(Boolean).join('\n').trim()||'';
}

export function fallbackChatResponse({question,context}){
  const q=String(question||'').toLowerCase();
  if(q.includes('borrow')||q.includes('loan')||q.includes('कर्ज')||q.includes('कर्ज')){
    return `Based on the current prototype analysis, the recommendation is ${context?.borrowDecision||'to review the loan plan carefully'}. Keep ${context?.reserve||'your emergency reserve'} aside and validate sales before taking additional debt. This is planning guidance, not loan approval.`;
  }
  if(q.includes('first')||q.includes('start')||q.includes('पहले')||q.includes('सुरू')){
    return `Start with the 30-day pilot: speak to customers, make initial sales, track costs, and protect your emergency reserve. Scale only after the pilot supports the business plan.`;
  }
  return `Your current blueprint suggests starting small, keeping an emergency reserve, validating customer demand, and then considering financing. Ask me about your loan, 90-day plan, risks, or government support.`;
}

export async function generateGeminiResponse({question,context,history=[]}){
  const apiKey=String(process.env.AI_API_KEY||process.env.GEMINI_API_KEY||'').trim();
  if(!apiKey)return {enabled:false,provider:'local-fallback',text:fallbackChatResponse({question,context})};
  const model=String(process.env.GEMINI_MODEL||'gemini-3.8-flash').trim();
  const prompt=buildChatPrompt({question,context,history});
  const response=await fetch(`${GEMINI_BASE_URL}/${encodeURIComponent(model)}:generateContent`,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':apiKey},body:JSON.stringify({contents:[{role:'user',parts:[{text:prompt}]}],generationConfig:{temperature:0.3,maxOutputTokens:500}})});
  if(!response.ok){const detail=await response.text().catch(()=> '');throw new Error(`Gemini API request failed (${response.status})${detail?`: ${detail.slice(0,300)}`:''}`)}
  const payload=await response.json();
  const text=extractGeminiText(payload);
  if(!text)throw new Error('Gemini returned an empty response');
  return {enabled:true,provider:'gemini',model,text};
}
