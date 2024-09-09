import fs from 'fs';
import path from 'path';

export default class FileStore {
  historyPath: string;

  /**
   * node-cron-trigger store provider
   * @param {string} historyPath 
   * @param {string} historyFileName 
   */
  constructor(historyPath: string, historyFileName: string = 'history.log') {
    if (!historyPath) throw new Error('historyPath must be provided')
    this.historyPath = path.join(historyPath, historyFileName);
    this.#createHistoryLog();
  }

  /**
   * save the tasks history
   * @param {string} key 
   * @param {any} value 
   * @returns {Promise<boolean>}
   */
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

  /**
   * get the tasks history by key like 'history' key
   * @param {string} key 
   * @returns {Promise<any>}
   */
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

  /**
   * remove the tasks history by key like 'history' key
   * @param {string} key 
   * @returns {Promise<boolean>}
   */
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
    return JSON.parse(fs.readFileSync(this.historyPath, 'utf-8') || '{}');
  }

  #createHistoryLog(): void {
    // check if the tasks history file exists in the current directory or not to create it
    if (!fs.existsSync(this.historyPath)) {
      fs.writeFileSync(this.historyPath, '{}');
    }
  }

  // saving the tasks next run date in history.log
  #updateHistory(historyObject: any) {
    fs.writeFileSync(this.historyPath, JSON.stringify(historyObject), 'utf8');
  }
}
