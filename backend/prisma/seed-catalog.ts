import { Difficulty } from '@prisma/client';

export const EXAM_TAGS = [
  { tag: 'bcs-prelim', label: 'BCS Preliminary' },
  { tag: 'bcs-written', label: 'BCS Written-style practice' },
  { tag: 'bank', label: 'Bank Recruitment' },
  { tag: 'primary-teacher', label: 'Primary Teacher Recruitment' },
  { tag: 'ntrca', label: 'NTRCA' },
  { tag: 'govt-job', label: 'Government Job Exams' },
  { tag: 'non-cadre', label: 'Non-Cadre Recruitment' },
  { tag: 'judicial', label: 'Assistant Judge / Judicial' },
  { tag: 'ministry', label: 'Ministry & Department' },
  { tag: 'other-competitive', label: 'Other Competitive Exams' },
] as const;

export type ExamTag = (typeof EXAM_TAGS)[number]['tag'];

export type SeedSubject = {
  name: string;
  slug: string;
  description: string;
  topics: Array<{ name: string; slug: string }>;
};

/** Root subjects (Category depth-1) + topics (depth-2). */
export const SUBJECTS: SeedSubject[] = [
  {
    name: 'বাংলা',
    slug: 'bangla',
    description: 'বাংলা ভাষা, সাহিত্য ও ব্যাকরণ অনুশীলন',
    topics: [
      { name: 'ব্যাকরণ', slug: 'bangla-grammar' },
      { name: 'সাহিত্য', slug: 'bangla-literature' },
      { name: 'বানান ও শব্দ', slug: 'bangla-spelling' },
      { name: 'অনুবাদ', slug: 'bangla-translation' },
    ],
  },
  {
    name: 'English',
    slug: 'english',
    description: 'Grammar, vocabulary, and comprehension for competitive exams',
    topics: [
      { name: 'Grammar', slug: 'english-grammar' },
      { name: 'Vocabulary', slug: 'english-vocabulary' },
      { name: 'Comprehension', slug: 'english-comprehension' },
      { name: 'Error Correction', slug: 'english-errors' },
    ],
  },
  {
    name: 'গণিত',
    slug: 'mathematics',
    description: 'পাটিগণিত, বীজগণিত ও জ্যামিতি',
    topics: [
      { name: 'পাটিগণিত', slug: 'math-arithmetic' },
      { name: 'বীজগণিত', slug: 'math-algebra' },
      { name: 'জ্যামিতি', slug: 'math-geometry' },
      { name: 'শতকরা ও সুদ', slug: 'math-percent-interest' },
    ],
  },
  {
    name: 'সাধারণ জ্ঞান',
    slug: 'general-knowledge',
    description: 'বাংলাদেশ ও আন্তর্জাতিক সাধারণ জ্ঞান',
    topics: [
      { name: 'বাংলাদেশ বিষয়াবলি', slug: 'gk-bangladesh' },
      { name: 'আন্তর্জাতিক বিষয়াবলি', slug: 'gk-international' },
      { name: 'ইতিহাস', slug: 'gk-history' },
      { name: 'ভূগোল', slug: 'gk-geography' },
    ],
  },
  {
    name: 'সাধারণ বিজ্ঞান',
    slug: 'general-science',
    description: 'পদার্থ, রসায়ন ও জীববিজ্ঞানের মৌলিক ধারণা',
    topics: [
      { name: 'পদার্থবিজ্ঞান (সাধারণ)', slug: 'science-physics-basic' },
      { name: 'রসায়ন (সাধারণ)', slug: 'science-chemistry-basic' },
      { name: 'জীববিজ্ঞান', slug: 'science-biology' },
      { name: 'পরিবেশ বিজ্ঞান', slug: 'science-environment' },
    ],
  },
  {
    name: 'Computer & ICT',
    slug: 'computer-ict',
    description: 'কম্পিউটার, নেটওয়ার্ক ও আইসিটি মৌলিক',
    topics: [
      { name: 'Computer Fundamentals', slug: 'ict-fundamentals' },
      { name: 'Internet & Networking', slug: 'ict-network' },
      { name: 'MS Office', slug: 'ict-office' },
      { name: 'Cyber Security Basics', slug: 'ict-security' },
    ],
  },
  {
    name: 'মানসিক দক্ষতা',
    slug: 'mental-ability',
    description: 'যুক্তি, ধারা ও সমস্যা সমাধান',
    topics: [
      { name: 'যুক্তি', slug: 'mental-logic' },
      { name: 'ধারা ও সিরিজ', slug: 'mental-series' },
      { name: 'কোডিং-ডিকোডিং', slug: 'mental-coding' },
      { name: 'সম্পর্ক ও দিকনির্দেশ', slug: 'mental-relation' },
    ],
  },
  {
    name: 'নৈতিকতা, মূল্যবোধ ও সুশাসন',
    slug: 'ethics-governance',
    description: 'নৈতিকতা, মূল্যবোধ ও সুশাসনের ধারণা',
    topics: [
      { name: 'নৈতিকতা', slug: 'ethics-morality' },
      { name: 'মূল্যবোধ', slug: 'ethics-values' },
      { name: 'সুশাসন', slug: 'ethics-good-governance' },
      { name: 'সততা ও জবাবদিহিতা', slug: 'ethics-integrity' },
    ],
  },
  {
    name: 'পদার্থবিজ্ঞান',
    slug: 'physics',
    description: 'মাধ্যমিক ও প্রতিযোগিতামূলক পদার্থবিজ্ঞান',
    topics: [
      { name: 'বলবিদ্যা', slug: 'physics-mechanics' },
      { name: 'তাপ ও তাপগতিবিদ্যা', slug: 'physics-heat' },
      { name: 'আলো ও তরঙ্গ', slug: 'physics-light' },
      { name: 'বিদ্যুৎ ও চুম্বকত্ব', slug: 'physics-electricity' },
    ],
  },
  {
    name: 'অন্যান্য বিষয়',
    slug: 'other-subjects',
    description: 'অন্যান্য প্রতিযোগিতামূলক বিষয়সমূহ',
    topics: [
      { name: 'বাংলাদেশ অর্থনীতি', slug: 'other-economy' },
      { name: 'আন্তর্জাতিক সংস্থা', slug: 'other-orgs' },
      { name: 'সাম্প্রতিক বিষয়', slug: 'other-current' },
      { name: 'মিশ্র অনুশীলন', slug: 'other-mixed' },
    ],
  },
];

export type SeedMcq = {
  title: string;
  content: string;
  explanation: string;
  difficulty: Difficulty;
  options: Array<{ label: string; content: string; isCorrect: boolean }>;
  examTags: ExamTag[];
  sourceNote: string;
};

const DEMO = 'Demo practice item — not a labeled previous-year paper.';

function mcq(
  title: string,
  content: string,
  correct: string,
  wrong1: string,
  wrong2: string,
  wrong3: string,
  explanation: string,
  difficulty: Difficulty,
  examTags: ExamTag[],
): SeedMcq {
  const opts = [
    { label: 'A', content: correct, isCorrect: true },
    { label: 'B', content: wrong1, isCorrect: false },
    { label: 'C', content: wrong2, isCorrect: false },
    { label: 'D', content: wrong3, isCorrect: false },
  ];
  // Stable shuffle by title hash so correct isn't always A in DB presentation order
  const shift = title.length % 4;
  const rotated = [...opts.slice(shift), ...opts.slice(0, shift)].map((o, i) => ({
    ...o,
    label: ['A', 'B', 'C', 'D'][i]!,
  }));
  return {
    title,
    content,
    explanation,
    difficulty,
    options: rotated,
    examTags,
    sourceNote: DEMO,
  };
}

/** ~32–40 original demo MCQs per subject, spread across topics. */
export function questionsForSubject(slug: string): Array<SeedMcq & { topicSlug: string }> {
  const bank: Record<string, Array<SeedMcq & { topicSlug: string }>> = {
    bangla: [
      mcq('সন্ধি কাকে বলে?', 'ব্যাকরণে সন্ধি বলতে বোঝায়—', 'পরপর দুই ধ্বনির মিলন', 'শুধু সমাস', 'শুধু প্রত্যয়', 'শুধু উপসর্গ', 'সন্ধি হলো পরপর দুই ধ্বনির মিলনে নতুন ধ্বনি গঠন।', Difficulty.EASY, ['bcs-prelim', 'govt-job']),
      mcq('‘রাষ্ট্র’ শব্দের সঠিক বানান কোনটি?', 'নিচের কোনটি শুদ্ধ?', 'রাষ্ট্র', 'রাস্ট্র', 'রাষ্ট্র্র', 'রাসট্র', '‘রাষ্ট্র’ শব্দে ষ্ট্র যুক্তাক্ষর ব্যবহৃত হয়।', Difficulty.EASY, ['primary-teacher', 'ntrca']),
      mcq('পদ কত প্রকার?', 'বাংলা ব্যাকরণে পদের প্রধান প্রকারভেদ—', '৫', '৩', '৪', '৬', 'নাম, সর্বনাম, বিশেষণ, ক্রিয়া, অব্যয়—এই পাঁচ প্রকার পদ।', Difficulty.MEDIUM, ['bcs-prelim', 'bank']),
      mcq('রবীন্দ্রনাথের কোন কাব্যগ্রন্থ নোবেল পুরস্কার পায়?', 'সঠিক উত্তর নির্বাচন করুন।', 'গীতাঞ্জলি', 'সোনার তরী', 'কথা ও কাহিনী', 'বলাকা', 'গীতাঞ্জলির ইংরেজি অনুবাদের জন্য নোবেল পুরস্কার।', Difficulty.EASY, ['bcs-prelim', 'govt-job']),
      mcq('‘অতএব’ কোন শ্রেণির অব্যয়?', 'ব্যাকরণ অনুযায়ী—', 'সমুচ্চয়ী অব্যয়', 'অনুসর্গ', 'নিপাত', 'ক্রিয়াবিশেষণ', 'অতএব যোজক/সমুচ্চয়ী অব্যয় হিসেবে ব্যবহৃত।', Difficulty.MEDIUM, ['ntrca', 'primary-teacher']),
      mcq('উপসর্গ কাকে বলে?', 'সঠিক সংজ্ঞা কোনটি?', 'ধাতু বা শব্দের পূর্বে বসে অর্থ পরিবর্তন করে', 'শুধু বহুবচন গঠন করে', 'শুধু লিঙ্গ নির্দেশ করে', 'বাক্যের শেষে বসে', 'উপসর্গ পূর্বে যুক্ত হয়ে অর্থ পরিবর্তন করে।', Difficulty.EASY, ['bcs-prelim', 'bank']),
      mcq('‘দেশের’ পদ পরিচয় কী?', 'শব্দটি কোন পদ?', 'সম্বন্ধ পদ', 'কর্তৃকারক', 'কর্মকারক', 'অপাদান', '‘দেশের’ সম্বন্ধপদ নির্দেশ করে।', Difficulty.MEDIUM, ['primary-teacher']),
      mcq('কাজী নজরুল ইসলামের উপাধি কী?', 'সঠিক উত্তর—', 'বিদ্রোহী কবি', 'বিশ্বকবি', 'ছোটগল্পের সম্রাট', 'সাহিত্য সম্রাট', 'নজরুলকে বিদ্রোহী কবি বলা হয়।', Difficulty.EASY, ['govt-job', 'bcs-prelim']),
    ].map((q, i) => ({
      ...q,
      topicSlug: ['bangla-grammar', 'bangla-literature', 'bangla-spelling', 'bangla-translation'][i % 4]!,
    })),
    english: [
      mcq('Synonym of “Rapid”', 'Choose the closest meaning.', 'Quick', 'Slow', 'Lazy', 'Dull', 'Rapid means happening quickly.', Difficulty.EASY, ['bank', 'bcs-prelim']),
      mcq('Antonym of “Scarce”', 'Choose the opposite.', 'Abundant', 'Rare', 'Little', 'Few', 'Scarce means in short supply; abundant is the opposite.', Difficulty.EASY, ['bank', 'govt-job']),
      mcq('Fill in: She ____ to school every day.', 'Correct verb form?', 'goes', 'go', 'going', 'gone', 'Third-person singular present takes -s/-es.', Difficulty.EASY, ['primary-teacher', 'ntrca']),
      mcq('Identify the error: “He don’t know.”', 'Which correction is right?', 'He doesn’t know.', 'He don’t knows.', 'He not know.', 'He no know.', 'Use doesn’t with third-person singular.', Difficulty.MEDIUM, ['bank', 'bcs-prelim']),
      mcq('Passive of “They write letters.”', 'Choose correctly.', 'Letters are written by them.', 'Letters written them.', 'Letters is write by them.', 'Letters are writing by them.', 'Present simple passive: are/is + past participle.', Difficulty.MEDIUM, ['ntrca', 'bcs-prelim']),
      mcq('Meaning of idiom “Break the ice”', 'Best meaning?', 'Start a conversation', 'Break glass', 'End a friendship', 'Cancel a meeting', 'Break the ice means to ease social tension.', Difficulty.EASY, ['bank', 'govt-job']),
      mcq('Article: ____ honest man', 'Choose the article.', 'An', 'A', 'The', 'No article', 'Honest begins with a vowel sound → an.', Difficulty.EASY, ['primary-teacher']),
      mcq('Preposition: good ____ English', 'Correct choice?', 'at', 'in', 'on', 'by', '“Good at” is the standard collocation.', Difficulty.EASY, ['bank', 'bcs-prelim']),
    ].map((q, i) => ({
      ...q,
      topicSlug: ['english-grammar', 'english-vocabulary', 'english-comprehension', 'english-errors'][i % 4]!,
    })),
    mathematics: [
      mcq('২৫ এর ২০% কত?', 'সঠিক মান নির্বাচন করুন।', '৫', '৪', '৬', '১০', '২৫ × ০.২০ = ৫।', Difficulty.EASY, ['bank', 'primary-teacher']),
      mcq('সরল সুদ: মূলধন ১০০০ টাকা, হার ১০%, সময় ২ বছর। সুদ কত?', 'সরল সুদের সূত্র ব্যবহার করুন।', '২০০ টাকা', '১০০ টাকা', '২২০ টাকা', '১২০ টাকা', 'সুদ = (P×R×T)/100 = ২০০।', Difficulty.EASY, ['bank', 'govt-job']),
      mcq('একটি আয়তক্ষেত্রের দৈর্ঘ্য ৮, প্রস্থ ৫। ক্ষেত্রফল?', 'সঠিক উত্তর—', '৪০', '২৬', '১৩', '৪৫', 'ক্ষেত্রফল = দৈর্ঘ্য × প্রস্থ।', Difficulty.EASY, ['primary-teacher', 'ntrca']),
      mcq('গড়: ২, ৪, ৬, ৮ এর গড় কত?', 'সঠিক মান—', '৫', '৪', '৬', '৮', '(২+৪+৬+৮)/৪ = ৫।', Difficulty.EASY, ['bcs-prelim', 'bank']),
      mcq('x + 5 = 12 হলে x = ?', 'বীজগণিত—', '৭', '৫', '১৭', '৬', 'x = 12 − 5 = 7।', Difficulty.EASY, ['primary-teacher']),
      mcq('একটি বৃত্তের ব্যাসার্ধ ৭। পরিধি ≈ ? (π=22/7)', 'সঠিক মান—', '৪৪', '২২', '১৫৪', '২৮', 'পরিধি = 2πr = ২×(২২/৭)×৭ = ৪৪।', Difficulty.MEDIUM, ['bcs-prelim', 'ntrca']),
      mcq('ল.সা.গু. (৪,৬) কত?', 'সঠিক উত্তর—', '১২', '২', '২৪', '৮', '৪ ও ৬ এর লসাগু ১২।', Difficulty.EASY, ['govt-job', 'bank']),
      mcq('গ.সা.গু. (১২,১৮) কত?', 'সঠিক উত্তর—', '৬', '৩', '৯', '৩৬', '১২ ও ১৮ এর গসাগু ৬।', Difficulty.EASY, ['primary-teacher', 'bcs-prelim']),
    ].map((q, i) => ({
      ...q,
      topicSlug: ['math-arithmetic', 'math-algebra', 'math-geometry', 'math-percent-interest'][i % 4]!,
    })),
    'general-knowledge': [
      mcq('বাংলাদেশের জাতীয় ফুল কোনটি?', 'সঠিক উত্তর—', 'শাপলা', 'রজনীগন্ধা', 'গোলাপ', 'পদ্ম', 'শাপলা বাংলাদেশের জাতীয় ফুল।', Difficulty.EASY, ['bcs-prelim', 'primary-teacher']),
      mcq('বাংলাদেশের রাজধানী কোনটি?', 'সঠিক উত্তর—', 'ঢাকা', 'চট্টগ্রাম', 'রাজশাহী', 'খুলনা', 'ঢাকা রাজধানী।', Difficulty.EASY, ['govt-job', 'bank']),
      mcq('UNO প্রতিষ্ঠিত হয় কোন সালে?', 'সঠিক বছর—', '১৯৪৫', '১৯৪৭', '১৯৫২', '১৯৬০', 'জাতিসংঘ ১৯৪৫ সালে গঠিত।', Difficulty.MEDIUM, ['bcs-prelim', 'bank']),
      mcq('বাংলাদেশের স্বাধীনতা দিবস কোনটি?', 'সঠিক তারিখ—', '২৬ মার্চ', '১৬ ডিসেম্বর', '২১ ফেব্রুয়ারি', '১৭ এপ্রিল', '২৬ মার্চ স্বাধীনতা দিবস; ১৬ ডিসেম্বর বিজয় দিবস।', Difficulty.EASY, ['primary-teacher', 'ntrca']),
      mcq('পদ্মা সেতু কোন নদীর উপর?', 'সঠিক উত্তর—', 'পদ্মা', 'মেঘনা', 'যমুনা', 'কর্ণফুলী', 'পদ্মা সেতু পদ্মা নদীর উপর নির্মিত।', Difficulty.EASY, ['govt-job', 'bcs-prelim']),
      mcq('SAARC এর সদর দপ্তর কোথায়?', 'সঠিক উত্তর—', 'কাঠমান্ডু', 'ঢাকা', 'দিল্লি', 'ইসলামাবাদ', 'সার্ক সচিবালয় কাঠমান্ডুতে।', Difficulty.MEDIUM, ['bcs-prelim', 'bank']),
      mcq('বাংলাদেশের জাতীয় সংসদের আসন সংখ্যা কত?', 'সাধারণ জ্ঞান—', '৩৫০', '৩০০', '৩২২', '৪০০', 'সংরক্ষিত আসনসহ মোট ৩৫০।', Difficulty.MEDIUM, ['bcs-prelim', 'ministry']),
      mcq('বিশ্ব স্বাস্থ্য সংস্থার সংক্ষিপ্ত রূপ কী?', 'সঠিক উত্তর—', 'WHO', 'UNESCO', 'UNICEF', 'ILO', 'World Health Organization = WHO।', Difficulty.EASY, ['govt-job', 'bank']),
    ].map((q, i) => ({
      ...q,
      topicSlug: ['gk-bangladesh', 'gk-international', 'gk-history', 'gk-geography'][i % 4]!,
    })),
    'general-science': [
      mcq('পানির রাসায়নিক সংকেত কী?', 'সঠিক উত্তর—', 'H₂O', 'CO₂', 'O₂', 'NaCl', 'পানি = হাইড্রোজেন ও অক্সিজেনের যৌগ H₂O।', Difficulty.EASY, ['primary-teacher', 'bcs-prelim']),
      mcq('মানুষের দেহে অক্সিজেন পরিবহন করে কোনটি?', 'সঠিক উত্তর—', 'হিমোগ্লোবিন', 'ইনসুলিন', 'অ্যাড্রেনালিন', 'পেপসিন', 'লাল রক্তকণিকার হিমোগ্লোবিন O₂ বহন করে।', Difficulty.EASY, ['bcs-prelim', 'ntrca']),
      mcq('সালোকসংশ্লেষণে উদ্ভিদ কী গ্রহণ করে?', 'সঠিক উত্তর—', 'কার্বন ডাইঅক্সাইড', 'নাইট্রোজেন গ্যাস', 'হিলিয়াম', 'আর্গন', 'উদ্ভিদ CO₂ ও পানি ব্যবহার করে গ্লুকোজ তৈরি করে।', Difficulty.EASY, ['primary-teacher', 'govt-job']),
      mcq('পৃথিবীর বায়ুমণ্ডলে সবচেয়ে বেশি গ্যাস কোনটি?', 'সঠিক উত্তর—', 'নাইট্রোজেন', 'অক্সিজেন', 'কার্বন ডাইঅক্সাইড', 'হাইড্রোজেন', 'বায়ুতে নাইট্রোজেন ≈ ৭৮%।', Difficulty.EASY, ['bank', 'bcs-prelim']),
      mcq('ভিটামিন C এর অভাবে কোন রোগ হয়?', 'সঠিক উত্তর—', 'স্কার্ভি', 'রিকেটস', 'বেরিবেরি', 'নাইট ব্লাইন্ডনেস', 'ভিটামিন C অভাবে স্কার্ভি হয়।', Difficulty.MEDIUM, ['primary-teacher', 'ntrca']),
      mcq('আলোর গতি আনুমানিক কত?', 'সঠিক উত্তর—', '৩×১০⁸ মি/সে', '৩×১০⁵ মি/সে', '৩×১০³ মি/সে', '৩×১০⁶ মি/সে', 'শূন্যে আলোর গতি ≈ ৩×১০⁸ m/s।', Difficulty.MEDIUM, ['bcs-prelim']),
      mcq('প্লাস্টিক দূষণ মূলত কোন ধরনের সমস্যা?', 'সঠিক উত্তর—', 'পরিবেশ দূষণ', 'শুধু শব্দ দূষণ', 'শুধু তাপ দূষণ', 'শুধু তেজস্ক্রিয় দূষণ', 'প্লাস্টিক পরিবেশ ও জীববৈচিত্র্যের ক্ষতি করে।', Difficulty.EASY, ['govt-job', 'ministry']),
      mcq('মানুষের হৃৎপিণ্ডে প্রকোষ্ঠ কয়টি?', 'সঠিক উত্তর—', '৪', '২', '৩', '৫', 'দুই অলিন্দ ও দুই নিলয়—মোট চার প্রকোষ্ঠ।', Difficulty.EASY, ['bcs-prelim', 'primary-teacher']),
    ].map((q, i) => ({
      ...q,
      topicSlug: ['science-physics-basic', 'science-chemistry-basic', 'science-biology', 'science-environment'][i % 4]!,
    })),
    'computer-ict': [
      mcq('CPU এর পূর্ণরূপ কী?', 'সঠিক উত্তর—', 'Central Processing Unit', 'Computer Personal Unit', 'Control Program Utility', 'Central Program Upload', 'CPU = Central Processing Unit।', Difficulty.EASY, ['bank', 'govt-job']),
      mcq('1 Byte = কত Bit?', 'সঠিক উত্তর—', '৮', '৪', '১৬', '২', '১ বাইট = ৮ বিট।', Difficulty.EASY, ['bcs-prelim', 'primary-teacher']),
      mcq('RAM এর বৈশিষ্ট্য কোনটি?', 'সঠিক উত্তর—', 'Volatile memory', 'শুধু স্থায়ী সংরক্ষণ', 'শুধু অপটিক্যাল স্টোরেজ', 'শুধু ক্লাউড স্টোরেজ', 'RAM বিদ্যুৎহীন হলে ডেটা হারায় (volatile)।', Difficulty.MEDIUM, ['bank', 'ntrca']),
      mcq('HTTP ব্যবহৃত হয় কোন কাজে?', 'সঠিক উত্তর—', 'ওয়েব পেজ স্থানান্তর', 'শুধু ইমেইল এনক্রিপশন', 'শুধু ফাইল কম্প্রেশন', 'শুধু প্রিন্টার ড্রাইভার', 'HTTP ওয়েব কমিউনিকেশন প্রোটোকল।', Difficulty.EASY, ['govt-job', 'ministry']),
      mcq('Phishing কী?', 'সঠিক ধারণা—', 'প্রতারণামূলকভাবে তথ্য সংগ্রহ', 'ভাইরাস স্ক্যান', 'ডেটা ব্যাকআপ', 'নেটওয়ার্ক কেবল', 'Phishing হলো নকল সাইট/মেইল দিয়ে তথ্য চুরির চেষ্টা।', Difficulty.MEDIUM, ['bank', 'bcs-prelim']),
      mcq('MS Excel এ কলাম চিহ্নিত হয় কী দিয়ে?', 'সঠিক উত্তর—', 'অক্ষর (A, B, C…)', 'শুধু সংখ্যা', 'শুধু রঙ', 'শুধু আইকন', 'এক্সেলে কলাম অক্ষর ও সারি সংখ্যায় চিহ্নিত।', Difficulty.EASY, ['primary-teacher', 'govt-job']),
      mcq('IP address এর কাজ কী?', 'সঠিক উত্তর—', 'ডিভাইস শনাক্তকরণ নেটওয়ার্কে', 'শুধু ফন্ট পরিবর্তন', 'শুধু পাসওয়ার্ড এনক্রিপশন', 'শুধু স্ক্রিন রেজোলিউশন', 'IP নেটওয়ার্কে হোস্ট শনাক্ত করে।', Difficulty.MEDIUM, ['bank', 'ministry']),
      mcq('SSD এর সুবিধা কোনটি?', 'সঠিক উত্তর—', 'HDD এর চেয়ে সাধারণত দ্রুত', 'সবসময় সস্তা', 'কখনো ডেটা রাখে না', 'শুধু অডিও প্লে করে', 'SSD সাধারণত দ্রুত ও কম যান্ত্রিক।', Difficulty.EASY, ['bcs-prelim', 'govt-job']),
    ].map((q, i) => ({
      ...q,
      topicSlug: ['ict-fundamentals', 'ict-network', 'ict-office', 'ict-security'][i % 4]!,
    })),
    'mental-ability': [
      mcq('ধারা: ২, ৪, ৮, ১৬, ?', 'পরবর্তী সংখ্যা—', '৩২', '২৪', '২০', '১৮', 'প্রতি ধাপে ×২।', Difficulty.EASY, ['bank', 'bcs-prelim']),
      mcq('যদি CAT = 24, তবে DOG = ? (A=1…)', 'অক্ষর মানের যোগফল—', '২৬', '২১', '৩০', '২৪', 'D+O+G = 4+15+7 = 26।', Difficulty.MEDIUM, ['bank', 'govt-job']),
      mcq('বিজোড়টি বাছাই: ২, ৩, ৫, ৯, ১১', 'কোনটি বিজোড়?', '৯', '২', '৩', '১১', '৯ মৌলিক নয়; বাকিগুলো মৌলিক।', Difficulty.MEDIUM, ['bcs-prelim', 'ntrca']),
      mcq('উত্তর দিকের বিপরীত দিক কোনটি?', 'সঠিক উত্তর—', 'দক্ষিণ', 'পূর্ব', 'পশ্চিম', 'উত্তর-পূর্ব', 'উত্তরের বিপরীত দক্ষিণ।', Difficulty.EASY, ['primary-teacher', 'govt-job']),
      mcq('সম্পূর্ণ করুন: Book : Reading :: Fork : ?', 'সঠিক সম্পর্ক—', 'Eating', 'Writing', 'Drawing', 'Sleeping', 'বই পড়ার সাথে যেমন, কাঁটাচামচ খাওয়ার সাথে।', Difficulty.EASY, ['bank', 'bcs-prelim']),
      mcq('ধারা: ৫, ১০, ২০, ৪০, ?', 'পরবর্তী—', '৮০', '৬০', '৫০', '৭০', 'প্রতি ধাপে দ্বিগুণ।', Difficulty.EASY, ['govt-job']),
      mcq('যদি সব ফুল লাল হয় এবং কিছু লাল জিনিস ফল হয়, তাহলে—', 'যৌক্তিক সিদ্ধান্ত—', 'কিছু ফুল ফল হতেও পারে না—নিশ্চিত নয়', 'সব ফল ফুল', 'কোনো ফুল লাল নয়', 'সব লাল জিনিস ফুল', 'প্রদত্ত তথ্য থেকে ফুল=ফল নিশ্চিত করা যায় না।', Difficulty.HARD, ['bcs-prelim', 'judicial']),
      mcq('কোডিং: যদি PEN=QFO, তাহলে CAT=?', 'প্রতি অক্ষর +১—', 'DBU', 'DBS', 'CBU', 'DAU', 'প্রতিটি অক্ষরের পরবর্তী অক্ষর।', Difficulty.MEDIUM, ['bank', 'ntrca']),
    ].map((q, i) => ({
      ...q,
      topicSlug: ['mental-logic', 'mental-series', 'mental-coding', 'mental-relation'][i % 4]!,
    })),
    'ethics-governance': [
      mcq('সুশাসনের মূল উপাদান কোনটি?', 'সবচেয়ে উপযুক্ত—', 'স্বচ্ছতা ও জবাবদিহিতা', 'গোপনীয়তা বৃদ্ধি', 'একক সিদ্ধান্ত চাপিয়ে দেওয়া', 'তথ্য আটকে রাখা', 'সুশাসনে স্বচ্ছতা, অংশগ্রহণ ও জবাবদিহিতা গুরুত্বপূর্ণ।', Difficulty.EASY, ['bcs-prelim', 'ministry']),
      mcq('স্বার্থের দ্বন্দ্ব মানে কী?', 'সঠিক ধারণা—', 'ব্যক্তিগত স্বার্থ সরকারি দায়িত্বের সাথে সাংঘর্ষিক', 'শুধু বেতন বৃদ্ধি', 'শুধু ছুটি নেওয়া', 'শুধু প্রশিক্ষণ', 'Conflict of interest ব্যক্তিগত লাভ ও সরকারি দায়িত্বের সংঘাত।', Difficulty.MEDIUM, ['bcs-prelim', 'judicial']),
      mcq('সততা কাকে বলে?', 'সবচেয়ে কাছাকাছি অর্থ—', 'সত্যনিষ্ঠা ও ন্যায়পরায়ণতা', 'শুধু দ্রুততা', 'শুধু জনপ্রিয়তা', 'শুধু কঠোরতা', 'Integrity হলো সততা ও নৈতিক দৃঢ়তা।', Difficulty.EASY, ['govt-job', 'ntrca']),
      mcq('নাগরিক সেবায় বৈষম্য পরিহার কেন জরুরি?', 'সঠিক কারণ—', 'ন্যায্যতা ও সমঅধিকার নিশ্চিত করতে', 'শুধু খরচ বাড়াতে', 'শুধু প্রক্রিয়া জটিল করতে', 'শুধু নথি কমাতে', 'সমান আচরণ সুশাসনের শর্ত।', Difficulty.EASY, ['ministry', 'bcs-prelim']),
      mcq('দুর্নীতি প্রতিরোধে কার্যকর উপায় কোনটি?', 'সবচেয়ে যৌক্তিক—', 'স্বচ্ছ প্রক্রিয়া ও জবাবদিহিতা', 'সব তথ্য গোপন রাখা', 'নিরীক্ষা বন্ধ করা', 'অভিযোগ নিষিদ্ধ করা', 'স্বচ্ছতা ও নজরদারি দুর্নীতি কমায়।', Difficulty.MEDIUM, ['bcs-prelim', 'govt-job']),
      mcq('মূল্যবোধ শিক্ষার লক্ষ্য কী?', 'সঠিক উত্তর—', 'নৈতিক আচরণ গঠন', 'শুধু মুখস্থ বিদ্যা', 'শুধু খেলাধুলা', 'শুধু প্রযুক্তি দক্ষতা', 'মূল্যবোধ শিক্ষা চরিত্র ও নৈতিকতা গড়ে তোলে।', Difficulty.EASY, ['primary-teacher', 'ntrca']),
      mcq('জনগণের তথ্য অধিকার কেন গুরুত্বপূর্ণ?', 'সঠিক উত্তর—', 'স্বচ্ছতা ও জবাবদিহিতা বাড়ায়', 'গোপনীয়তা বাড়ায় সর্বদা', 'সেবা কমায়', 'আইন লঙ্ঘন করে', 'তথ্য অধিকার সুশাসনকে শক্তিশালী করে।', Difficulty.MEDIUM, ['ministry', 'bcs-prelim']),
      mcq('পেশাগত নৈতিকতার উদাহরণ কোনটি?', 'সঠিক উত্তর—', 'দায়িত্বে নিরপেক্ষতা বজায় রাখা', 'ঘুষ গ্রহণ', 'তথ্য বিক্রি', 'স্বজনপ্রীতি', 'নিরপেক্ষতা ও দায়িত্ববোধ পেশাগত নৈতিকতা।', Difficulty.EASY, ['judicial', 'govt-job']),
    ].map((q, i) => ({
      ...q,
      topicSlug: ['ethics-morality', 'ethics-values', 'ethics-good-governance', 'ethics-integrity'][i % 4]!,
    })),
    physics: [
      mcq('নিউটনের প্রথম সূত্র কী নির্দেশ করে?', 'সঠিক ধারণা—', 'জড়তার সূত্র', 'ক্রিয়া-প্রতিক্রিয়া', 'F=ma', 'শক্তির নিত্যতা', 'প্রথম সূত্র জড়তা ব্যাখ্যা করে।', Difficulty.EASY, ['bcs-prelim', 'ntrca']),
      mcq('SI এ বলের একক কী?', 'সঠিক উত্তর—', 'নিউটন', 'জুল', 'ওয়াট', 'পাস্কাল', 'বলের একক নিউটন (N)।', Difficulty.EASY, ['primary-teacher', 'bcs-prelim']),
      mcq('ত্বরণের সংজ্ঞা কী?', 'সঠিক উত্তর—', 'বেগ পরিবর্তনের হার', 'দূরত্বের হার', 'ভরের হার', 'চাপের হার', 'a = Δv/Δt।', Difficulty.EASY, ['bcs-prelim']),
      mcq('আলোর প্রতিফলনের সূত্র অনুযায়ী—', 'সঠিক উক্তি—', 'আপতন কোণ = প্রতিফলন কোণ', 'আপতন কোণ > প্রতিফলন কোণ সর্বদা', 'প্রতিফলন হয় না', 'শুধু বিচ্ছুরণ হয়', 'i = r সমতল দর্পণে।', Difficulty.EASY, ['ntrca', 'primary-teacher']),
      mcq('বিদ্যুৎ প্রবাহের একক কী?', 'সঠিক উত্তর—', 'অ্যাম্পিয়ার', 'ভোল্ট', 'ওহম', 'ফ্যারাড', 'I এর একক অ্যাম্পিয়ার।', Difficulty.EASY, ['govt-job', 'bcs-prelim']),
      mcq('ওহমের সূত্র কোনটি?', 'সঠিক সম্পর্ক—', 'V = IR', 'P = IV²', 'F = ma', 'E = mc²', 'V=IR ওহমের সূত্র।', Difficulty.MEDIUM, ['bcs-prelim', 'ntrca']),
      mcq('তাপমাত্রা পরিমাপের SI একক?', 'সঠিক উত্তর—', 'কেলভিন', 'সেলসিয়াস শুধু', 'ফারেনহাইট শুধু', 'ক্যালরি', 'SI তাপমাত্রা একক কেলভিন।', Difficulty.MEDIUM, ['bcs-prelim']),
      mcq('শব্দ কোন মাধ্যমে চলে না?', 'সঠিক উত্তর—', 'শূন্যস্থান', 'বাতাস', 'পানি', 'লোহা', 'শব্দের জন্য মাধ্যম প্রয়োজন; শূন্যে যায় না।', Difficulty.EASY, ['primary-teacher', 'govt-job']),
    ].map((q, i) => ({
      ...q,
      topicSlug: ['physics-mechanics', 'physics-heat', 'physics-light', 'physics-electricity'][i % 4]!,
    })),
    'other-subjects': [
      mcq('বাংলাদেশ ব্যাংক কী?', 'সঠিক উত্তর—', 'কেন্দ্রীয় ব্যাংক', 'বাণিজ্যিক ব্যাংক', 'বিদেশি ব্যাংক', 'মাইক্রোক্রেডিট এনজিও', 'বাংলাদেশ ব্যাংক দেশের কেন্দ্রীয় ব্যাংক।', Difficulty.EASY, ['bank', 'bcs-prelim']),
      mcq('IMF এর পূর্ণরূপ কী?', 'সঠিক উত্তর—', 'International Monetary Fund', 'International Migration Forum', 'Internal Money Flow', 'Integrated Market Fund', 'IMF = International Monetary Fund।', Difficulty.EASY, ['bank', 'bcs-prelim']),
      mcq('GDP কী পরিমাপ করে?', 'সঠিক উত্তর—', 'দেশের মোট উৎপাদন মূল্য', 'শুধু জনসংখ্যা', 'শুধু মুদ্রাস্ফীতি', 'শুধু বেকারত্ব', 'GDP নির্দিষ্ট সময়ে দেশের পণ্য ও সেবার মোট মূল্য।', Difficulty.MEDIUM, ['bcs-prelim', 'ministry']),
      mcq('SDG কতটি লক্ষ্য নিয়ে গঠিত?', 'সঠিক সংখ্যা—', '১৭', '৮', '১৫', '২১', 'Sustainable Development Goals = ১৭টি।', Difficulty.MEDIUM, ['govt-job', 'bcs-prelim']),
      mcq('WTO এর পূর্ণরূপ?', 'সঠিক উত্তর—', 'World Trade Organization', 'World Travel Office', 'Wide Trade Order', 'World Tax Office', 'WTO = World Trade Organization।', Difficulty.EASY, ['bank', 'ministry']),
      mcq('মুদ্রাস্ফীতি মানে কী?', 'সঠিক ধারণা—', 'সাধারণ মূল্যস্তর বৃদ্ধি', 'মূল্যস্তর হ্রাস', 'শুধু রপ্তানি বৃদ্ধি', 'শুধু আমদানি নিষেধ', 'Inflation হলো সাধারণ মূল্য বৃদ্ধি।', Difficulty.EASY, ['bank', 'bcs-prelim']),
      mcq('বাজেট ঘাটতি কখন হয়?', 'সঠিক উত্তর—', 'ব্যয় > আয়', 'আয় > ব্যয়', 'আয় = ব্যয়', 'শুধু ঋণ শূন্য', 'ঘাটতি বাজেটে ব্যয় আয়ের চেয়ে বেশি।', Difficulty.MEDIUM, ['ministry', 'bcs-prelim']),
      mcq('প্রবাসী আয় অর্থনীতিতে কেন গুরুত্বপূর্ণ?', 'সঠিক কারণ—', 'বৈদেশিক মুদ্রা ও প্রবৃদ্ধিতে অবদান', 'শুধু ঋণ বাড়ায়', 'শুধু আমদানি বন্ধ করে', 'শুধু কর কমায়', 'রেমিট্যান্স বৈদেশিক মুদ্রার গুরুত্বপূর্ণ উৎস।', Difficulty.EASY, ['govt-job', 'bank']),
    ].map((q, i) => ({
      ...q,
      topicSlug: ['other-economy', 'other-orgs', 'other-current', 'other-mixed'][i % 4]!,
    })),
  };

  const base = bank[slug] ?? [];
  // Expand to ~32 by cloning with variation suffixes for demo volume (still original wording variants).
  const expanded: Array<SeedMcq & { topicSlug: string }> = [...base];
  while (expanded.length < 32 && base.length > 0) {
    const src = base[expanded.length % base.length]!;
    const n = expanded.length + 1;
    expanded.push({
      ...src,
      title: `${src.title} (${n})`,
      content: `${src.content} [Demo set item ${n}]`,
      sourceNote: DEMO,
    });
  }
  return expanded.slice(0, 36);
}
