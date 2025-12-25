export interface RubricItem {
    text: string;
    isCritical: boolean;
  }
  
  
  export interface Question {
    id: string;
    question_text: string;
    order_index: number;
    gold_standard_answer: string;
    rubric_items: string[]; // We store as JSON string array in DB
    critical_miss_item: string | null;
  }
  
  
  export interface Attempt {
    id: string;
    problem_id: string;
    status: 'in_progress' | 'submitted' | 'evaluated';
    answers: Record<string, string>; // { question_id: user_text }
    scores: Record<string, boolean[]>; // { question_id: [true, false, true] }
    start_time: string;
  }
  
  
  