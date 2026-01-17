import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

export interface ChatMessage {
    role: 'user' | 'dan';
    content: string;
}

export interface Question {
    text: string;
    gold_standard_answer: string;
    rubric_items: string[];
}

interface EvaluateRequest {
    messages: ChatMessage[];
    problemContext: string;
    questions: Question[];
    questionsAsked?: number[];  // Which questions were covered
    attemptId?: string;
}

interface QuestionScore {
    questionIndex: number;
    score: number;
    maxScore: number;
    rubricMatches: boolean[];
    feedback: string;
}

const EVALUATION_PROMPT = `You are evaluating a PM's debugging conversation. Review the entire chat history and score their performance against each question's rubric.

SCORING RULES:
- For each question, check which rubric items the user addressed during the conversation
- A rubric item is "addressed" if the user mentioned or demonstrated understanding of that concept at any point
- Be generous - if they touched on the idea, count it
- Each rubric item = 1 point, so max score per question = number of rubric items
- IMPORTANT: If the user answered a question and then asked to move on, STILL credit them for what they answered
- Do NOT penalize users for skipping follow-up questions - score based on their actual responses
- Users moving to the next question is NOT "failing" - it's pacing themselves
- Only give 0 points if the user truly provided NO relevant information for that topic

OUTPUT FORMAT (JSON only, no markdown):
{
  "scores": [
    {
      "questionIndex": 0,
      "score": 2,
      "maxScore": 3,
      "rubricMatches": [true, true, false],
      "feedback": "Good identification of X and Y. Missed the aspect of Z."
    }
  ],
  "overallFeedback": "Summary of their debugging approach and areas for improvement."
}`;

export async function POST(request: NextRequest) {
    console.log(`AI Evaluation Request at: ${new Date().toISOString()}`);

    try {
        if (!process.env.GOOGLE_AI_API_KEY) {
            return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
        }

        const body: EvaluateRequest = await request.json();
        const { messages, problemContext, questions, questionsAsked } = body;

        // Filter to only evaluate questions that were actually asked
        const attemptedIndices = questionsAsked && questionsAsked.length > 0
            ? questionsAsked
            : questions.map((_, i) => i); // Fallback to all if not specified
        const attemptedQuestions = attemptedIndices.map(i => ({ ...questions[i], originalIndex: i }));

        // Use the faster model for evaluation since it's a one-time call
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });

        // Build the full conversation transcript
        const transcript = messages
            .map(m => `${m.role === 'user' ? 'USER' : 'DAN'}: ${m.content}`)
            .join('\n\n');

        // Build question and rubric info ONLY for attempted questions
        const questionsInfo = attemptedQuestions.map((q, i) => `
QUESTION ${i + 1}: ${q.text}
GOLD STANDARD: ${q.gold_standard_answer}
RUBRIC ITEMS:
${q.rubric_items.map((item: string, j: number) => `  ${j + 1}. ${item}`).join('\n')}
`).join('\n---\n');

        const evaluationPrompt = `
${EVALUATION_PROMPT}

INCIDENT CONTEXT:
${problemContext}

QUESTIONS AND RUBRICS:
${questionsInfo}

FULL CONVERSATION TRANSCRIPT:
${transcript}

Now evaluate the user's performance. Output valid JSON only:`;

        const result = await model.generateContent(evaluationPrompt);
        const responseText = result.response.text();

        // DEBUG: Log raw response to verify format
        console.log('=== AI EVALUATION DEBUG ===');
        console.log('Raw response length:', responseText.length);
        console.log('Raw response:', responseText.substring(0, 500));

        // Parse the JSON response
        let evaluation;
        try {
            // Try to extract JSON from the response (handle potential markdown wrapping)
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                evaluation = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('No JSON found in response');
            }
        } catch (parseError) {
            console.error('Failed to parse evaluation response:', responseText);
            // Return a fallback evaluation for attempted questions only
            evaluation = {
                scores: attemptedQuestions.map((q, i) => ({
                    questionIndex: q.originalIndex,
                    score: 0,
                    maxScore: q.rubric_items.length,
                    rubricMatches: new Array(q.rubric_items.length).fill(false),
                    feedback: 'Unable to evaluate this question automatically.'
                })),
                overallFeedback: 'Automatic evaluation encountered an error. Please review your answers manually.'
            };
        }

        // Map AI's response indices back to original question indices
        if (evaluation.scores) {
            evaluation.scores = evaluation.scores.map((score: QuestionScore, i: number) => ({
                ...score,
                questionIndex: attemptedQuestions[i]?.originalIndex ?? score.questionIndex
            }));
        }

        // Calculate total scores
        const totalScore = evaluation.scores.reduce((sum: number, s: QuestionScore) => sum + s.score, 0);
        const maxTotalScore = evaluation.scores.reduce((sum: number, s: QuestionScore) => sum + s.maxScore, 0);

        return NextResponse.json({
            ...evaluation,
            totalScore,
            maxTotalScore,
            percentage: Math.round((totalScore / maxTotalScore) * 100)
        });

    } catch (error: any) {
        console.error('Evaluation error:', error);
        return NextResponse.json({ error: error.message || 'Failed to evaluate' }, { status: 500 });
    }
}
