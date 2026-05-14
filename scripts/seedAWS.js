import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const require = createRequire(import.meta.url);
const serviceAccount = require('./serviceAccount.json');

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();
function parseMarkedBank(text) {
  const questions = [];
  text = text.replace(/\r/g, '');
  const blocks = text.split(/\n---\n/).filter(b => b.trim());
  for (const block of blocks) {
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
    const qLine = lines.find(l => /^\*\*\d+\./.test(l) || /^\d+\./.test(l));
    if (!qLine) continue;
    const question = qLine.replace(/^\*\*\d+\.\*\*\s*/, '').replace(/^\d+\.\s*/, '').replace(/\*\*(.*?)\*\*/g, '$1').trim();
    const options = [], correctAnswers = [];
    for (const line of lines) {
      const m = line.match(/^[-*]\s*([A-E])\.\s*(.+)/);
      if (!m) continue;
      const t = m[2].replace(/✅\s*$/, '').replace(/\*\*/g, '').trim();
      if (m[2].includes('✅')) correctAnswers.push(t);
      options.push(t);
    }
    if (options.length >= 2 && correctAnswers.length >= 1)
      questions.push({ question, options, correctAnswers });
  }
  return questions;
}

const AWS_DIR = 'C:/Users/nikk/Documents/Crawlspace/50-Learning/AWS';

const BANKS = [
  { file: `${AWS_DIR}/AWS CODE 1.md`,               title: 'AWS CCP — Code 1',     category:'AWS', difficulty:'Medium' },
  { file: `${AWS_DIR}/AWS CODE 2.md`,               title: 'AWS CCP — Code 2',     category:'AWS', difficulty:'Medium' },
  { file: `${AWS_DIR}/AWS CODE 3.md`,               title: 'AWS CCP — Code 3',     category:'AWS', difficulty:'Medium' },
  { file: `${AWS_DIR}/AWS WAYGROUND.md`,            title: 'AWS Wayground 1',      category:'AWS', difficulty:'Medium' },
  { file: `${AWS_DIR}/AWS WAYGROUND 2.md`,          title: 'AWS Wayground 2',      category:'AWS', difficulty:'Medium' },
  { file: `${AWS_DIR}/AWS WAYGROUND 3.md`,          title: 'AWS Wayground 3',      category:'AWS', difficulty:'Hard' },
  { file: `${AWS_DIR}/AWS INDIAN BANK.md`,          title: 'AWS Practice — Set A', category:'AWS', difficulty:'Medium' },
  { file: `${AWS_DIR}/BANK INDIAN 2AWS (44MCQS).md`,title: 'AWS Practice — Set B', category:'AWS', difficulty:'Hard' },
  { file: `${AWS_DIR}/BANK INDIAN 2.5 (25MCQS).md`, title: 'AWS Practice — Set C', category:'AWS', difficulty:'Hard' },
  { file: `${AWS_DIR}/BANK INDIAN 3AWS (50MCQS).md`,title: 'AWS Practice — Set D', category:'AWS', difficulty:'Hard' },
  { file: `${AWS_DIR}/AWS PRACTITIONER 1.md`,  title: 'AWS Practitioner 1', category:'AWS', difficulty:'Easy' },
  { file: `${AWS_DIR}/AWS PRACTITIONER 2.md`,  title: 'AWS Practitioner 2', category:'AWS', difficulty:'Easy' },
  { file: `${AWS_DIR}/AWS PRACTITIONER 3.md`,  title: 'AWS Practitioner 3', category:'AWS', difficulty:'Easy' },
  { file: `${AWS_DIR}/AWS PRACTITIONER 4.md`,  title: 'AWS Practitioner 4', category:'AWS', difficulty:'Easy' },
  { file: `${AWS_DIR}/AWS PRACTITIONER 5.md`,  title: 'AWS Practitioner 5', category:'AWS', difficulty:'Easy' },
];

async function seed() {
  // Wipe ALL quizBanks docs to prevent duplicates from old bank titles
  const existing = await db.collection('quizBanks').get();
  const deletes = [];
  existing.forEach(d => deletes.push(d.ref.delete()));
  if (deletes.length > 0) {
    await Promise.all(deletes);
    console.log(`🗑 Wiped all ${deletes.length} existing bank doc(s)`);
  }

  for (const bank of BANKS) {
    try {
      const text = readFileSync(bank.file, 'utf-8');
      const questions = parseMarkedBank(text);
      if (questions.length === 0) { console.log(`⚠ No questions parsed: ${bank.title}`); continue; }
      const docId = bank.title.replace(/[^a-zA-Z0-9]/g, '_');
      await db.collection('quizBanks').doc(docId).set({
        title: bank.title,
        category: bank.category,
        difficulty: bank.difficulty,
        description: `${questions.length} AWS Cloud Practitioner practice questions`,
        questions,
        questionCount: questions.length,
        timeLimit: Math.ceil(questions.length * 80 / 65),
        updatedAt: FieldValue.serverTimestamp(),
      });
      console.log(`✅ "${bank.title}" — ${questions.length} questions, ${Math.ceil(questions.length * 80 / 65)} min`);
    } catch (err) {
      console.error(`❌ Failed ${bank.title}:`, err.message);
    }
  }
  console.log('\n🎉 Done!');
}
seed();
