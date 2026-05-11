const QUESTION_TYPES = ['addition', 'subtraction', 'multiplication', 'division', 'fraction'];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle(values) {
  return values
    .map((value) => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map((item) => item.value);
}

function makeNumberChoices(answer) {
  const decoys = new Set([answer]);
  while (decoys.size < 4) {
    const offset = randomInt(-5, 6);
    const candidate = Math.max(0, answer + offset);
    decoys.add(candidate);
  }
  return shuffle([...decoys]);
}

function makeFractionChoices(answer) {
  const pool = ['1/2', '1/3', '1/4', '2/3', '3/4', '1 whole'];
  return shuffle([answer, ...shuffle(pool.filter((choice) => choice !== answer)).slice(0, 3)]);
}

export function createQuestion({ types = QUESTION_TYPES } = {}) {
  const type = randomItem(types);

  if (type === 'division') {
    const divisor = randomInt(2, 5);
    const answer = randomInt(2, 10);
    return {
      prompt: `${divisor * answer} / ${divisor}`,
      answer,
      choices: makeNumberChoices(answer),
      kind: 'division',
      reward: 5,
      points: 120,
      powerMultiplier: 3,
    };
  }

  if (type === 'fraction') {
    const questions = [
      { prompt: 'half of 8', answer: 4, choices: makeNumberChoices(4) },
      { prompt: 'half of 10', answer: 5, choices: makeNumberChoices(5) },
      { prompt: 'quarter of 8', answer: 2, choices: makeNumberChoices(2) },
      { prompt: 'quarter of 12', answer: 3, choices: makeNumberChoices(3) },
      { prompt: '2 quarters', answer: '1/2', choices: makeFractionChoices('1/2') },
      { prompt: '2 halves', answer: '1 whole', choices: makeFractionChoices('1 whole') },
      { prompt: '3 quarters', answer: '3/4', choices: makeFractionChoices('3/4') },
    ];
    const question = randomItem(questions);
    return {
      ...question,
      kind: 'fraction',
      reward: 5,
      points: 140,
      powerMultiplier: 3,
    };
  }

  let a = randomInt(2, 18);
  let b = randomInt(1, 12);
  let op = '+';
  let answer;

  if (type === 'addition') {
    answer = a + b;
  } else if (type === 'subtraction') {
    op = '-';
    if (b > a) {
      [a, b] = [b, a];
    }
    answer = a - b;
  } else {
    op = 'x';
    a = randomInt(2, 5);
    b = randomInt(2, 10);
    answer = a * b;
  }

  return {
    prompt: `${a} ${op} ${b}`,
    answer,
    choices: makeNumberChoices(answer),
    kind: type,
    reward: type === 'multiplication' ? 4 : 3,
    points: type === 'multiplication' ? 90 : 60,
    powerMultiplier: type === 'multiplication' ? 2.5 : 2,
  };
}

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}
