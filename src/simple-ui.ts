import * as readline from 'readline';

type BackToken = { __back: true };
const BACK: BackToken = { __back: true };

function createInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

function askQuestion(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question + ' ', (answer) => {
      resolve(answer);
    });
  });
}

export const simpleUI = {
  async text(msg: string, initial?: string): Promise<string | BackToken> {
    const rl = createInterface();
    try {
      const answer = await askQuestion(rl, `${msg} (type '<' to go back):`);
      if (answer.trim() === '<') {
        return BACK;
      }
      return answer;
    } finally {
      rl.close();
    }
  },

  async confirm(msg: string, initial?: boolean): Promise<boolean | BackToken> {
    const rl = createInterface();
    try {
      const answer = await askQuestion(rl, `${msg} [y/n] (type '<' to go back):`);
      if (answer.trim() === '<') {
        return BACK;
      }
      return /^y(es)?$/i.test(answer.trim());
    } finally {
      rl.close();
    }
  },

  showGroup(label: string): void {
    console.log(`\n${label}:`);
  }
};