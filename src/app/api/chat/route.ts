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
    aiContext?: string;  // Hidden simulation truth for AI
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
- Accept concise answers - ONE good point is enough to move on
- Don't ask follow-up questions unless the user's answer was completely off-target
- If user provides ANY reasonable answer, acknowledge it and move to the NEXT main topic
- Avoid asking for "3 reasons" or "multiple examples" - one clear answer is sufficient
- Do NOT ask "Can you think of anything else?" - just move on

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

CRITICAL - MOVE ON RULE:
When the user wants to move on (says "next question", "move on", "skip", "that's all", or similar):
1. FIRST acknowledge what they DID answer: "Got it, you mentioned [X]. Good point."
2. THEN move to a DIFFERENT topic from the pending questions
3. Do NOT mark them as having skipped - they answered partially
4. Keep transitions brief and positive

CRITICAL - WRAP-UP RULE:
When the "QUESTIONS STILL TO ASK" section shows "All questions have been asked!", you MUST end your response with EXACTLY this phrase:
"Ready to wrap up and see how you did?"
This signals the user can submit for evaluation.

Remember: You're a Product Lead having a casual debugging chat, not a professor testing for exhaustive knowledge.`;

// ============ MAIN CHAT HANDLER ============
export async function POST(request: NextRequest) {
    console.log(`AI Chat Request at: ${new Date().toISOString()}`);

    try {
        if (!process.env.GOOGLE_AI_API_KEY) {
            return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
        }

        const body: ChatRequest = await request.json();
        const { userMessage, history, problemContext, aiContext, questions, questionsAsked, attemptId } = body;

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

        // Build hidden simulation truth injection (if available)
        const simulationTruthInjection = aiContext ? `
SIMULATION TRUTH (HIDDEN - Do NOT reveal directly):
This is the hidden reality of the incident. Use this to provide accurate data when asked, but DO NOT reveal the root cause directly. Act as a facilitator who helps the user discover it themselves.

${aiContext}

IMPORTANT: When the user asks questions, use the above information to guide them. If they ask "what does the data show?", give them accurate data from this context. But NEVER say "the root cause is X" - let them figure it out.
` : '';

        const contextPrompt = `
${simulationTruthInjection}
INCIDENT CONTEXT (visible to user):
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

        // Detect if user wants to skip to next question (should NOT mark the skipped question)
        const moveOnPhrases = ['next question', 'move on', 'move to next', 'skip this', 'let\'s continue', 'continue to next'];
        const userWantsToMoveOn = moveOnPhrases.some(kw => userMessage.toLowerCase().includes(kw));

        // Detect if Dan asked a new question (VERY STRICT matching)
        // BUT skip this if user is done OR wants to move on - don't mark more questions
        let newQuestionsAsked = [...questionsAsked];

        if (!userSaysDone && !userWantsToMoveOn) {
            // Only mark a question as asked if Dan's response contains an actual QUESTION
            // that closely matches one of the pending questions

            // First, check if Dan's response even contains a question (ends with ?)
            const danAsksQuestion = response.includes('?');

            if (danAsksQuestion) {
                // Extract the last question from Dan's response
                const sentences = response.split(/[.!?]+/).filter(s => s.trim());
                const lastSentence = sentences[sentences.length - 1]?.toLowerCase().trim() || '';

                for (let i = 0; i < questions.length; i++) {
                    if (!questionsAsked.includes(i)) {
                        const questionText = questions[i].text.toLowerCase();

                        // Extract key topic words from the question (nouns/verbs 6+ chars)
                        const topicWords = questionText
                            .split(/\s+/)
                            .filter(w => w.length >= 6)
                            .filter(w => !['would', 'should', 'which', 'about', 'could', 'their', 'there', 'where', 'these', 'those'].includes(w));

                        // Count how many topic words appear in Dan's last question
                        const matchCount = topicWords.filter(w => lastSentence.includes(w)).length;

                        // Mark as asked ONLY if Dan's question contains 3+ topic words from the pending question
                        // This ensures Dan is actually asking ABOUT this topic, not just mentioning keywords
                        if (matchCount >= 3) {
                            newQuestionsAsked.push(i);
                            break; // Only mark one question per response
                        }
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
