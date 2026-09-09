const GEMINI_BASE_URL='https://generativelanguage.googleapis.com/v1beta/interactions';

export const geminiConfigured=()=>Boolean(String(process.env.AI_API_KEY||process.env.GEMINI_API_KEY||'').trim());

const languageName=language=>({hi:'Hindi',mr:'Marathi',en:'English'}[String(language||'en').toLowerCase()]||'English');

export function buildChatPrompt({question,context,history=[]}){
  const safeHistory=Array.isArray(history)?history.slice(-6).map(item=>({role:item?.role==='model'?'model':'user',text:String(item?.text||'').slice(0,1200)})).filter(item=>item.text):[];
  const selectedLanguage=languageName(context?.language);
  return `You are VyaparGuide AI, a practical business advisor for rural and micro entrepreneurs in India.\n\nRULES:\n- Write ONLY in ${selectedLanguage}. Do not mix in another language.\n- Use very simple, everyday words suitable for a first-time rural entrepreneur.\n- Keep the answer below 100 words. Start with the direct answer, then give at most 3 short next steps.\n- Use plain text only: no Markdown, no headings, no asterisks, no tables, and no technical terms or abbreviations. If a money term must be used, explain it in easy words.\n- Use only the supplied business context for factual financial, village, score, loan and scheme claims.\n- Never invent scheme eligibility, loan approval, interest rates, village demand, competitor counts, government statistics, or financial figures.\n- Do not override deterministic calculations. Explain them in simple language.\n- If evidence is unavailable, clearly say so and suggest local verification.\n- You are a decision-support assistant, not a bank, lender, government officer, lawyer, or accountant.\n\nBUSINESS CONTEXT:\n${JSON.stringify(context,null,2)}\n\nRECENT CONVERSATION:\n${JSON.stringify(safeHistory,null,2)}\n\nUSER QUESTION:\n${String(question||'').slice(0,2000)}`;
}

export function cleanAssistantText(text){
  return String(text||'').replace(/\r/g,'').replace(/^#{1,6}\s*/gm,'').replace(/\*\*(.*?)\*\*/g,'$1').replace(/__(.*?)__/g,'$1').replace(/`([^`]+)`/g,'$1').replace(/^\s*[-*+]\s+/gm,'• ').replace(/^\s*[-_]{3,}\s*$/gm,'').replace(/\n{3,}/g,'\n\n').trim();
}

export function extractGeminiText(payload){
  if(typeof payload?.output_text==='string'&&payload.output_text.trim())return payload.output_text.trim();
  const steps=Array.isArray(payload?.steps)?payload.steps:[];
  const text=steps.filter(step=>step?.type==='model_output').flatMap(step=>Array.isArray(step?.content)?step.content:[]).map(item=>item?.text).filter(Boolean).join('\n').trim();
  if(text)return text;
  return payload?.candidates?.flatMap(candidate=>candidate?.content?.parts||[]).map(part=>part?.text).filter(Boolean).join('\n').trim()||'';
}

export function fallbackChatResponse({question,context}){
  const q=String(question||'').toLowerCase();
  if(q.includes('borrow')||q.includes('loan')||q.includes('कर्ज'))return `Based on the current prototype analysis, the recommendation is ${context?.borrowDecision||'to review the loan plan carefully'}. Keep ${context?.reserve||'your emergency reserve'} aside and validate sales before taking additional debt. This is planning guidance, not loan approval.`;
  if(q.includes('first')||q.includes('start')||q.includes('पहले')||q.includes('सुरू'))return 'Start with the 30-day pilot: speak to customers, make initial sales, track costs, and protect your emergency reserve. Scale only after the pilot supports the business plan.';
  return 'Your current blueprint suggests starting small, keeping an emergency reserve, validating customer demand, and then considering financing. Ask me about your loan, 90-day plan, risks, or government support.';
}

export async function generateGeminiResponse({question,context,history=[]}){
  const apiKey=String(process.env.AI_API_KEY||process.env.GEMINI_API_KEY||'').trim();
  if(!apiKey)return {enabled:false,provider:'local-fallback',text:fallbackChatResponse({question,context})};
  const model=String(process.env.GEMINI_MODEL||'gemini-3.6-flash').trim();
  const response=await fetch(GEMINI_BASE_URL,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':apiKey},body:JSON.stringify({model,input:buildChatPrompt({question,context,history}),system_instruction:'You are a concise, evidence-grounded business advisor. Follow the supplied rules exactly.'})});
  if(!response.ok){const detail=await response.text().catch(()=> '');throw new Error(`Gemini API request failed (${response.status})${detail?`: ${detail.slice(0,300)}`:''}`)}
  const payload=await response.json();
  const text=cleanAssistantText(extractGeminiText(payload));
  if(!text)throw new Error('Gemini returned an empty response');
  return {enabled:true,provider:'gemini',model,text};
}
