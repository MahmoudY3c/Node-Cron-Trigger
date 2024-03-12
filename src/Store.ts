import fs from 'fs';
import path from 'path';

export interface IStore {
  setItem: (key: string, value: any) => Promise<boolean>;
  getItem: (key: string) => Promise<any>;
  removeItem: (key: string) => Promise<boolean>;
}

class FileStore {
  historyPath: string = '';

  constructor() {
    this.#createHistoryLog();
  }

  setItem(key: string, value: any): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        const history = this.#getHistory();
        history[key] = value;
        this.#updateHistory(history);
        resolve(true);
      } catch (err) {
        reject(err)
      }
    });
  }

  getItem(key: string): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        const data = this.#getHistory();
        resolve(data[key]);
      } catch (err) {
        reject(err)
      }
    });
  }

  removeItem(key: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        const history = this.#getHistory();
        delete history[key];
        this.#updateHistory(history);
        resolve(true);
      } catch (err) {
        reject(err)
      }
    });
  }

  #getHistory() {
    // handle when the file accidentally deleted
    this.#createHistoryLog();
    const data = JSON.parse(fs.readFileSync(this.historyPath, 'utf-8') || '{}');
    return data;
  }

  #createHistoryLog(): void {
    this.historyPath = this.#dir('history.log');
    // check if the tasks history file exists in the current directory or not to create it
    if (!fs.existsSync(this.historyPath)) {
      fs.writeFileSync(this.historyPath, '{}');
    }
  }

  // saving the tasks next run date in history.log
  #updateHistory(historyObject: any) {
    fs.writeFileSync(this.historyPath, JSON.stringify(historyObject), 'utf8');
  }

  // get the dirname + add the file path
  #dir(d: string) {
    return path.resolve(__dirname, d);
  }
}

export default FileStore;
