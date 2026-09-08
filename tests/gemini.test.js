import test from 'node:test';
import assert from 'node:assert/strict';
import { buildChatPrompt, extractGeminiText, fallbackChatResponse, generateGeminiResponse } from '../backend/integrations/gemini.js';

test('Gemini integration falls back cleanly when no API key is configured', async()=>{
  const previous=process.env.AI_API_KEY;
  const previousGemini=process.env.GEMINI_API_KEY;
  delete process.env.AI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  const result=await generateGeminiResponse({question:'Should I borrow?',context:{borrowDecision:'BORROW CAREFULLY',reserve:'₹20,000'}});
  assert.equal(result.enabled,false);
  assert.equal(result.provider,'local-fallback');
  assert.match(result.text,/BORROW CAREFULLY/);
  if(previous===undefined)delete process.env.AI_API_KEY;else process.env.AI_API_KEY=previous;
  if(previousGemini===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=previousGemini;
});

test('Gemini prompt contains guardrails and business context',()=>{
  const prompt=buildChatPrompt({question:'What should I do first?',context:{business:'Dairy Processing',capital:100000},history:[]});
  assert.match(prompt,/Never invent scheme eligibility/);
  assert.match(prompt,/Dairy Processing/);
  assert.match(prompt,/What should I do first/);
});

test('Gemini response text extraction supports interaction output_text',()=>{
  assert.equal(extractGeminiText({output_text:'Hello entrepreneur'}),'Hello entrepreneur');
});

test('Local fallback remains useful for first-step questions',()=>{
  const text=fallbackChatResponse({question:'What should I do first?',context:{}});
  assert.match(text,/30-day pilot/);
});
