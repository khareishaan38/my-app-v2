import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

// ============ RATE LIMITING ============
const SESSION_RATE_LIMIT = 30;
const SESSION_WINDOW_MS = 60 * 60 * 1000;
const GLOBAL_RATE_LIMIT = 20;
const GLOBAL_WINDOW_MS = 60 * 1000;

const sessionRequestCounts = new Map<string, { count: number; resetAt: number }>();
const globalRequestTimestamps: number[] = [];

function checkRateLimits(sessionId: string): { allowed: boolean; error?: string } {
    const now = Date.now();
    while (globalRequestTimestamps.length > 0 && globalRequestTimestamps[0] < now - GLOBAL_WINDOW_MS) {
        globalRequestTimestamps.shift();
    }
    if (globalRequestTimestamps.length >= GLOBAL_RATE_LIMIT) {
        return { allowed: false, error: 'Too many requests. Please wait a moment.' };
    }
    const session = sessionRequestCounts.get(sessionId);
    if (session && now < session.resetAt && session.count >= SESSION_RATE_LIMIT) {
        return { allowed: false, error: 'Too many messages this session. Please slow down.' };
    }
    return { allowed: true };
}

function recordRequest(sessionId: string) {
    const now = Date.now();
    globalRequestTimestamps.push(now);
    const session = sessionRequestCounts.get(sessionId);
    if (session && now < session.resetAt) {
        session.count++;
    } else {
        sessionRequestCounts.set(sessionId, { count: 1, resetAt: now + SESSION_WINDOW_MS });
    }
}

// ============ TYPES ============
export interface ChatMessage {
    role: 'user' | 'dan';
    content: string;
}

export interface Question {
    text: string;
    gold_standard_answer: string;
    rubric_items: string[];
    context_summary?: string;
}

interface ChatRequest {
    userMessage: string;
    history: ChatMessage[];
    problemContext: string;
    questions: Question[];
    questionsAsked: number[];
    attemptId?: string;
}

// ============ CONVERSATIONAL SYSTEM PROMPT ============
const SYSTEM_PROMPT = `You are a Senior Product Lead conducting an RCA (Root Cause Analysis) simulation interview with a PM candidate. Your name is Dan. You speak professionally but warmly.

YOUR ROLE:
- Evaluate the candidate's debugging instincts through natural conversation
- Guide them through the incident with focused, practical questions
- When the user asks clarifying questions, answer from the AVAILABLE INFO if it exists, otherwise say "That info isn't available for this scenario - what would you do without it?"
- Do NOT score or evaluate individual responses - that happens at the end
- Do NOT reveal gold standard answers directly

SCOPE BOUNDARIES:
- Keep questions focused on THIS specific incident only
- Don't explore hypothetical scenarios, edge cases, or "what ifs"
- If the candidate goes off-topic, redirect firmly but kindly: "That's interesting, but let's stay focused on this specific incident..."
- Don't discuss long-term architectural changes or future improvements

DEPTH GUIDANCE:
- Accept concise answers - don't probe too deeply on any single point
- Once the candidate demonstrates understanding, move forward
- Avoid implementation details unless directly relevant to the root cause
- A good answer doesn't need to be exhaustive - look for practical instincts
- IMPORTANT: If the user says they can't think of more (e.g., "that's all I have", "can't think of more", "move on", "next question"), IMMEDIATELY move to the next topic. Do NOT push for more answers.

EVALUATION MINDSET:
- You're assessing practical debugging skills, not theoretical knowledge
- Value structured thinking and clear prioritization
- Look for clear communication over exhaustive analysis
- Acknowledge good reasoning: "Good thinking!", "That's the right instinct..."

CONVERSATION STYLE:
- Ask one question at a time, don't overwhelm
- Keep responses concise (2-4 sentences typically)
- When a topic is sufficiently explored, transition naturally to the next question

QUESTION TRACKING:
- You'll be told which questions have been asked and which are pending
- Weave pending questions into the conversation naturally when appropriate

CRITICAL - WRAP-UP RULE:
When the "QUESTIONS STILL TO ASK" section shows "All questions have been asked!", you MUST end your response with EXACTLY this phrase:
"Ready to wrap up and see how you did?"
This signals the user can submit for evaluation.

Remember: You're a Product Lead evaluating interview performance, not a professor testing knowledge.`;

// ============ MAIN CHAT HANDLER ============
export async function POST(request: NextRequest) {
    console.log(`AI Chat Request at: ${new Date().toISOString()}`);

    try {
        if (!process.env.GOOGLE_AI_API_KEY) {
            return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
        }

        const body: ChatRequest = await request.json();
        const { userMessage, history, problemContext, questions, questionsAsked, attemptId } = body;

        const sessionId = attemptId || `anon-${Date.now()}`;
        const rateLimitResult = checkRateLimits(sessionId);
        if (!rateLimitResult.allowed) {
            return NextResponse.json({ error: rateLimitResult.error, isRateLimited: true }, { status: 429 });
        }
        recordRequest(sessionId);

        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });

        // Build conversation history for Gemini
        const conversationHistory = history.map(msg => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }]
        }));

        // Build question tracking info
        const pendingQuestions = questions
            .map((q, i) => ({ ...q, index: i }))
            .filter((_, i) => !questionsAsked.includes(i));

        const askedQuestions = questions
            .map((q, i) => ({ ...q, index: i }))
            .filter((_, i) => questionsAsked.includes(i));

        // Build available context from all questions
        const availableInfo = questions
            .filter(q => q.context_summary)
            .map(q => q.context_summary)
            .join('\n');

        const contextPrompt = `
INCIDENT CONTEXT:
${problemContext}

AVAILABLE INFO (share if user asks relevant questions):
${availableInfo || 'No additional context available for this scenario.'}

QUESTIONS ALREADY ASKED (${askedQuestions.length}/${questions.length}):
${askedQuestions.map(q => `- ${q.text}`).join('\n') || 'None yet'}

QUESTIONS STILL TO ASK (weave these in naturally):
${pendingQuestions.map(q => `- ${q.text}`).join('\n') || 'All questions have been asked!'}

${pendingQuestions.length === 0 ? 'IMPORTANT: All questions have been discussed. If the user seems done, you can say something like "Alright, I think we\'ve covered the key debugging steps! Ready to wrap up and see how you did?"' : ''}

USER'S MESSAGE:
${userMessage}
`;

        const chat = model.startChat({
            history: [
                { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
                { role: 'model', parts: [{ text: "Got it! I'm Dan, ready to have a natural debugging conversation. I'll guide through the questions naturally and help with any clarifying questions. Let's figure this out together!" }] },
                ...conversationHistory
            ]
        });

        const result = await chat.sendMessage(contextPrompt);
        const response = result.response.text();

        // Detect if user explicitly signals they want to END THE SESSION (only with minimum engagement)
        // Note: Phrases like "that's all" or "move on" are handled by the AI prompt to move to next question
        const doneKeywords = [
            'i am done', 'i\'m done', 'im done', 'evaluate me', 'submit', 'ready to submit',
            'show me my score', 'final score', 'end the session', 'see my results',
            'how did i do', 'grade me', 'rate me', 'done with the session'
        ];
        const hasMinimumEngagement = questionsAsked.length >= 1 || history.length >= 3;
        const userSaysDone = hasMinimumEngagement && doneKeywords.some(kw => userMessage.toLowerCase().includes(kw));

        // Detect if Dan asked a new question (simple heuristic)
        // BUT skip this if user is signaling they're done - don't mark more questions
        let newQuestionsAsked = [...questionsAsked];

        if (!userSaysDone) {
            // Only use keyword matching when user is NOT trying to wrap up
            for (let i = 0; i < questions.length; i++) {
                if (!questionsAsked.includes(i)) {
                    // Check if this question's keywords appear in Dan's response
                    const questionWords = questions[i].text.toLowerCase().split(' ').filter(w => w.length > 4);
                    const matchCount = questionWords.filter(w => response.toLowerCase().includes(w)).length;
                    if (matchCount >= 2) {
                        newQuestionsAsked.push(i);
                        break; // Only mark one question per response
                    }
                }
            }
        }

        // Detect if all questions are explored and Dan signals wrap-up
        const allQuestionsAsked = newQuestionsAsked.length >= questions.length || pendingQuestions.length === 0;
        const signalsWrapUp = userSaysDone || // User explicitly said done
            response.toLowerCase().includes('wrap up') ||
            response.toLowerCase().includes('how you did') ||
            response.toLowerCase().includes('ready to submit') ||
            (response.includes('?') && pendingQuestions.length === 0); // If no more questions to ask and Dan asks something, it's likely wrap-up

        // If user explicitly says done, allow evaluation even if not all questions covered
        const canEvaluate = userSaysDone || (allQuestionsAsked && signalsWrapUp);

        return NextResponse.json({
            response: response,
            questionsAsked: newQuestionsAsked,
            allQuestionsAsked: allQuestionsAsked || userSaysDone, // Treat "done" as all questions asked for UI
            readyForEvaluation: canEvaluate
        });

    } catch (error: any) {
        console.error('Gemini API error:', error);
        return NextResponse.json({ error: error.message || 'Failed to process chat' }, { status: 500 });
    }
}
